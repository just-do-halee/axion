/**
 * Task Manager Example Application
 * 
 * This mini-project demonstrates all the core features of Axion working together
 * in a real-world task management application.
 */

// Import the core modules from the Axion library
import { createAtom } from '../../src/core/atom';
import { createDerived } from '../../src/core/derive';
import { createEffect } from '../../src/core/effect';
import { executeBatch } from '../../src/internals/batch';
import { getTimeAPI } from '../../src/time/history';

// For convenience, alias batch as tx like in docs
const tx = executeBatch;

// Define our Task and AppState types
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate: string | null;
  createdAt: string;
}

interface AppState {
  tasks: Record<string, Task>;
  ui: {
    filter: 'all' | 'active' | 'completed';
    sort: 'priority' | 'dueDate' | 'createdAt';
    search: string;
    theme: 'light' | 'dark';
  };
  stats: {
    lastUpdated: string | null;
  };
}

// Create initial state
const initialState: AppState = {
  tasks: {},
  ui: {
    filter: 'all',
    sort: 'priority',
    search: '',
    theme: 'light',
  },
  stats: {
    lastUpdated: null,
  },
};

// 1. Create our main application atom
console.log('Creating application state atom...');
const appState = createAtom(initialState);

// Set up time travel for undo/redo
console.log('Setting up time travel...');
const timeAPI = getTimeAPI(appState);

// 2. Create derived states with clean dependency tracking

// Filtered and sorted tasks
console.log('Creating derived states...');
const filteredTasks = createDerived(() => {
  const { tasks, ui } = appState.get();
  
  // Convert tasks object to array
  let tasksArray = Object.values(tasks);
  
  // Filter tasks
  switch (ui.filter) {
    case 'active':
      tasksArray = tasksArray.filter(task => !task.completed);
      break;
    case 'completed':
      tasksArray = tasksArray.filter(task => task.completed);
      break;
  }
  
  // Apply search filter if specified
  if (ui.search) {
    const searchLower = ui.search.toLowerCase();
    tasksArray = tasksArray.filter(task => 
      task.title.toLowerCase().includes(searchLower) || 
      task.description.toLowerCase().includes(searchLower) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  // Sort tasks
  tasksArray.sort((a, b) => {
    switch (ui.sort) {
      case 'priority': {
        const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      }
      case 'dueDate': {
        // Sort null dates to the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case 'createdAt':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  
  return tasksArray;
});

// Task statistics
const taskStats = createDerived(() => {
  const { tasks } = appState.get();
  const tasksArray = Object.values(tasks);
  
  return {
    total: tasksArray.length,
    completed: tasksArray.filter(task => task.completed).length,
    active: tasksArray.filter(task => !task.completed).length,
    highPriority: tasksArray.filter(task => task.priority === 'high').length,
    byTag: tasksArray.reduce((acc, task) => {
      task.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>),
    lastUpdated: appState.get().stats.lastUpdated,
  };
});

// 3. Create effects for side effects

// Effect to log changes to task statistics
console.log('Setting up effects...');
const statsEffect = createEffect(() => {
  const stats = taskStats.get();
  console.log('Task Statistics Updated:', {
    total: stats.total,
    completed: stats.completed,
    active: stats.active,
    highPriority: stats.highPriority,
  });
  
  // Return cleanup function
  return () => {
    console.log('Stats effect cleanup');
  };
});

// Effect to save state to localStorage (in a real app)
const persistEffect = createEffect(() => {
  const state = appState.get();
  // In a real app, this would save to localStorage or a backend
  console.log('State would be persisted here');
  
  // We'll just log the current task count
  console.log(`Would save ${Object.keys(state.tasks).length} tasks to storage`);
  
  return () => {
    console.log('Persist effect cleanup');
  };
});

// Effect to react to theme changes
const themeEffect = createEffect(() => {
  const theme = appState.at('ui').at('theme').get();
  console.log(`Theme changed to: ${theme}`);
  // In a real app, this would update CSS variables or apply a theme class
  
  return () => {
    console.log('Theme effect cleanup');
  };
});

// 4. Create task management actions

const taskActions = {
  // Add a new task
  addTask(taskData: Omit<Task, 'id' | 'createdAt'>) {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    // Create new task using transaction to batch updates
    tx(() => {
      // Update the task with type casting to handle DeepReadonly
      appState.update(state => {
        // Create a new task with the correct type
        const newTask: Task = {
          ...taskData,
          id,
          createdAt,
        };
        
        // Create a new fresh state object to avoid readonly issues
        const newState: AppState = {
          ui: {
            filter: state.ui.filter,
            sort: state.ui.sort,
            search: state.ui.search,
            theme: state.ui.theme
          },
          stats: {
            lastUpdated: new Date().toISOString()
          },
          tasks: {} // Start with empty tasks
        };
        
        // Copy all existing tasks
        Object.keys(state.tasks).forEach(taskId => {
          const task = state.tasks[taskId];
          newState.tasks[taskId] = {
            id: task.id,
            title: task.title,
            description: task.description,
            completed: task.completed,
            priority: task.priority,
            tags: [...task.tags],
            dueDate: task.dueDate,
            createdAt: task.createdAt
          };
        });
        
        // Add the new task
        newState.tasks[id] = newTask;
        
        return newState;
      });
    });
    
    return id;
  },
  
  // Update an existing task
  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    // Use path-based updates for optimal performance
    tx(() => {
      // First check if task exists
      const task = appState.at('tasks').at(id).get();
      if (!task) {
        console.error(`Task ${id} not found`);
        return;
      }
      
      // Apply each update individually using path access
      Object.keys(updates).forEach(key => {
        const typedKey = key as keyof typeof updates;
        if (updates[typedKey] !== undefined) {
          // Use path access for clean updates
          appState.at('tasks').at(id).at(typedKey as any).set(updates[typedKey] as any);
        }
      });
      
      // Update last modified timestamp
      appState.at('stats').at('lastUpdated').set(new Date().toISOString());
    });
  },
  
  // Toggle task completion status
  toggleTaskCompletion(id: string) {
    // Use path-based read and then update
    const currentStatus = appState.at('tasks').at(id).at('completed').get();
    
    tx(() => {
      appState.at('tasks').at(id).at('completed').set(!currentStatus);
      appState.at('stats').at('lastUpdated').set(new Date().toISOString());
    });
  },
  
  // Delete a task
  deleteTask(id: string) {
    tx(() => {
      appState.update(state => {
        // Create a copy of tasks without the specified id
        const { [id]: removed, ...restTasksReadonly } = state.tasks;
        
        // Convert restTasks to the proper type to satisfy TypeScript
        const tasks: Record<string, Task> = {};
        Object.keys(restTasksReadonly).forEach(key => {
          // We need to create a new Task object to remove the readonly property
          const task = restTasksReadonly[key];
          tasks[key] = {
            id: task.id,
            title: task.title,
            description: task.description,
            completed: task.completed,
            priority: task.priority,
            tags: [...task.tags], // Create a new array to remove readonly
            dueDate: task.dueDate,
            createdAt: task.createdAt
          };
        });
        
        return {
          ...state,
          tasks,
          stats: {
            ...state.stats,
            lastUpdated: new Date().toISOString(),
          }
        };
      });
    });
  },
  
  // Update UI settings
  updateUI(updates: Partial<AppState['ui']>) {
    tx(() => {
      Object.keys(updates).forEach(key => {
        const typedKey = key as keyof AppState['ui'];
        if (updates[typedKey] !== undefined) {
          // Use path access for clean updates
          appState.at('ui').at(typedKey).set(updates[typedKey] as any);
        }
      });
    });
  },
  
  // Undo last change
  undo() {
    const result = timeAPI.undo();
    console.log('Undo operation:', result ? 'successful' : 'nothing to undo');
    return result;
  },
  
  // Redo last undone change
  redo() {
    const result = timeAPI.redo();
    console.log('Redo operation:', result ? 'successful' : 'nothing to redo');
    return result;
  }
};

// 5. Demo application functionality

console.log('\n=== TASK MANAGER DEMO ===\n');

console.log('Adding initial tasks...');

// Add some initial tasks
const task1Id = taskActions.addTask({
  title: 'Complete Axion documentation',
  description: 'Finish writing the API reference and examples',
  completed: false,
  priority: 'high',
  tags: ['work', 'documentation'],
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
});

const task2Id = taskActions.addTask({
  title: 'Fix batch processing bug',
  description: 'Debug and fix the issue with batch processing in the core module',
  completed: false,
  priority: 'medium',
  tags: ['work', 'bug'],
  dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
});

const task3Id = taskActions.addTask({
  title: 'Prepare presentation',
  description: 'Create slides for the upcoming team meeting',
  completed: true,
  priority: 'low',
  tags: ['work', 'meeting'],
  dueDate: null,
});

console.log('\nCurrent filtered tasks:');
console.log(filteredTasks.get());

console.log('\nChanging filter to "active"...');
taskActions.updateUI({ filter: 'active' });
console.log('Active tasks:');
console.log(filteredTasks.get());

console.log('\nChanging sort to "dueDate"...');
taskActions.updateUI({ sort: 'dueDate' });
console.log('Tasks sorted by due date:');
console.log(filteredTasks.get().map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate })));

console.log('\nToggling completion for task 1...');
taskActions.toggleTaskCompletion(task1Id);
console.log('Active tasks after toggle:');
console.log(filteredTasks.get().map(t => ({ id: t.id, title: t.title, completed: t.completed })));

console.log('\nChanging filter back to "all"...');
taskActions.updateUI({ filter: 'all' });
console.log('All tasks:');
console.log(filteredTasks.get().map(t => ({ id: t.id, title: t.title, completed: t.completed })));

console.log('\nAdding a new tag to task 2...');
taskActions.updateTask(task2Id, {
  tags: [...appState.at('tasks').at(task2Id).at('tags').get(), 'urgent']
});
console.log('Updated task 2:');
console.log(appState.at('tasks').at(task2Id).get());

console.log('\nDemonstrating search functionality...');
taskActions.updateUI({ search: 'bug' });
console.log('Search results for "bug":');
console.log(filteredTasks.get().map(t => ({ id: t.id, title: t.title })));

console.log('\nDemonstrating undo functionality...');
taskActions.undo(); // Undo the search
console.log('After undo (should remove search filter):');
console.log('UI state:', appState.at('ui').get());
console.log('Tasks:', filteredTasks.get().length);

console.log('\nDemonstrating redo functionality...');
taskActions.redo(); // Redo the search
console.log('After redo (should reapply search filter):');
console.log('UI state:', appState.at('ui').get());
console.log('Tasks:', filteredTasks.get().length);

console.log('\nChanging theme (triggering theme effect)...');
taskActions.updateUI({ theme: 'dark' });

console.log('\nDeleting a task...');
taskActions.deleteTask(task3Id);
console.log('Tasks after deletion:');
console.log(Object.keys(appState.get().tasks));

console.log('\nFinal task statistics:');
console.log(taskStats.get());

// Clean up effects
console.log('\nCleaning up effects...');
statsEffect();
persistEffect();
themeEffect();

console.log('\n=== DEMO COMPLETE ===');