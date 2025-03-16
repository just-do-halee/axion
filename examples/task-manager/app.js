"use strict";
/**
 * Task Manager Example Application
 *
 * This mini-project demonstrates all the core features of Axion working together
 * in a real-world task management application.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import the core modules from the Axion library
var atom_1 = require("../../src/core/atom");
var derive_1 = require("../../src/core/derive");
var effect_1 = require("../../src/core/effect");
var batch_1 = require("../../src/internals/batch");
var history_1 = require("../../src/time/history");
// For convenience, alias batch as tx like in docs
var tx = batch_1.executeBatch;
// Create initial state
var initialState = {
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
var appState = (0, atom_1.createAtom)(initialState);
// Set up time travel for undo/redo
console.log('Setting up time travel...');
var timeAPI = (0, history_1.getTimeAPI)(appState);
// 2. Create derived states with clean dependency tracking
// Filtered and sorted tasks
console.log('Creating derived states...');
var filteredTasks = (0, derive_1.createDerived)(function () {
    var _a = appState.get(), tasks = _a.tasks, ui = _a.ui;
    // Convert tasks object to array
    var tasksArray = Object.values(tasks);
    // Filter tasks
    switch (ui.filter) {
        case 'active':
            tasksArray = tasksArray.filter(function (task) { return !task.completed; });
            break;
        case 'completed':
            tasksArray = tasksArray.filter(function (task) { return task.completed; });
            break;
    }
    // Apply search filter if specified
    if (ui.search) {
        var searchLower_1 = ui.search.toLowerCase();
        tasksArray = tasksArray.filter(function (task) {
            return task.title.toLowerCase().includes(searchLower_1) ||
                task.description.toLowerCase().includes(searchLower_1) ||
                task.tags.some(function (tag) { return tag.toLowerCase().includes(searchLower_1); });
        });
    }
    // Sort tasks
    tasksArray.sort(function (a, b) {
        switch (ui.sort) {
            case 'priority': {
                var priorityMap = { high: 3, medium: 2, low: 1 };
                return priorityMap[b.priority] - priorityMap[a.priority];
            }
            case 'dueDate': {
                // Sort null dates to the end
                if (!a.dueDate && !b.dueDate)
                    return 0;
                if (!a.dueDate)
                    return 1;
                if (!b.dueDate)
                    return -1;
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
var taskStats = (0, derive_1.createDerived)(function () {
    var tasks = appState.get().tasks;
    var tasksArray = Object.values(tasks);
    return {
        total: tasksArray.length,
        completed: tasksArray.filter(function (task) { return task.completed; }).length,
        active: tasksArray.filter(function (task) { return !task.completed; }).length,
        highPriority: tasksArray.filter(function (task) { return task.priority === 'high'; }).length,
        byTag: tasksArray.reduce(function (acc, task) {
            task.tags.forEach(function (tag) {
                acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
        }, {}),
        lastUpdated: appState.get().stats.lastUpdated,
    };
});
// 3. Create effects for side effects
// Effect to log changes to task statistics
console.log('Setting up effects...');
var statsEffect = (0, effect_1.createEffect)(function () {
    var stats = taskStats.get();
    console.log('Task Statistics Updated:', {
        total: stats.total,
        completed: stats.completed,
        active: stats.active,
        highPriority: stats.highPriority,
    });
    // Return cleanup function
    return function () {
        console.log('Stats effect cleanup');
    };
});
// Effect to save state to localStorage (in a real app)
var persistEffect = (0, effect_1.createEffect)(function () {
    var state = appState.get();
    // In a real app, this would save to localStorage or a backend
    console.log('State would be persisted here');
    // We'll just log the current task count
    console.log("Would save ".concat(Object.keys(state.tasks).length, " tasks to storage"));
    return function () {
        console.log('Persist effect cleanup');
    };
});
// Effect to react to theme changes
var themeEffect = (0, effect_1.createEffect)(function () {
    var theme = appState.at('ui').at('theme').get();
    console.log("Theme changed to: ".concat(theme));
    // In a real app, this would update CSS variables or apply a theme class
    return function () {
        console.log('Theme effect cleanup');
    };
});
// 4. Create task management actions
var taskActions = {
    // Add a new task
    addTask: function (taskData) {
        var id = Date.now().toString();
        var createdAt = new Date().toISOString();
        // Create new task using transaction to batch updates
        tx(function () {
            // Update the task with type casting to handle DeepReadonly
            appState.update(function (state) {
                // Create a new task with the correct type
                var newTask = __assign(__assign({}, taskData), { id: id, createdAt: createdAt });
                // Create a new fresh state object to avoid readonly issues
                var newState = {
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
                Object.keys(state.tasks).forEach(function (taskId) {
                    var task = state.tasks[taskId];
                    newState.tasks[taskId] = {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        completed: task.completed,
                        priority: task.priority,
                        tags: __spreadArray([], task.tags, true),
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
    updateTask: function (id, updates) {
        // Use path-based updates for optimal performance
        tx(function () {
            // First check if task exists
            var task = appState.at('tasks').at(id).get();
            if (!task) {
                console.error("Task ".concat(id, " not found"));
                return;
            }
            // Apply each update individually using path access
            Object.keys(updates).forEach(function (key) {
                var typedKey = key;
                if (updates[typedKey] !== undefined) {
                    // Use path access for clean updates
                    appState.at('tasks').at(id).at(typedKey).set(updates[typedKey]);
                }
            });
            // Update last modified timestamp
            appState.at('stats').at('lastUpdated').set(new Date().toISOString());
        });
    },
    // Toggle task completion status
    toggleTaskCompletion: function (id) {
        // Use path-based read and then update
        var currentStatus = appState.at('tasks').at(id).at('completed').get();
        tx(function () {
            appState.at('tasks').at(id).at('completed').set(!currentStatus);
            appState.at('stats').at('lastUpdated').set(new Date().toISOString());
        });
    },
    // Delete a task
    deleteTask: function (id) {
        tx(function () {
            appState.update(function (state) {
                // Create a copy of tasks without the specified id
                var _a = state.tasks, _b = id, removed = _a[_b], restTasksReadonly = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
                // Convert restTasks to the proper type to satisfy TypeScript
                var tasks = {};
                Object.keys(restTasksReadonly).forEach(function (key) {
                    // We need to create a new Task object to remove the readonly property
                    var task = restTasksReadonly[key];
                    tasks[key] = {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        completed: task.completed,
                        priority: task.priority,
                        tags: __spreadArray([], task.tags, true), // Create a new array to remove readonly
                        dueDate: task.dueDate,
                        createdAt: task.createdAt
                    };
                });
                return __assign(__assign({}, state), { tasks: tasks, stats: __assign(__assign({}, state.stats), { lastUpdated: new Date().toISOString() }) });
            });
        });
    },
    // Update UI settings
    updateUI: function (updates) {
        tx(function () {
            Object.keys(updates).forEach(function (key) {
                var typedKey = key;
                if (updates[typedKey] !== undefined) {
                    // Use path access for clean updates
                    appState.at('ui').at(typedKey).set(updates[typedKey]);
                }
            });
        });
    },
    // Undo last change
    undo: function () {
        var result = timeAPI.undo();
        console.log('Undo operation:', result ? 'successful' : 'nothing to undo');
        return result;
    },
    // Redo last undone change
    redo: function () {
        var result = timeAPI.redo();
        console.log('Redo operation:', result ? 'successful' : 'nothing to redo');
        return result;
    }
};
// 5. Demo application functionality
console.log('\n=== TASK MANAGER DEMO ===\n');
console.log('Adding initial tasks...');
// Add some initial tasks
var task1Id = taskActions.addTask({
    title: 'Complete Axion documentation',
    description: 'Finish writing the API reference and examples',
    completed: false,
    priority: 'high',
    tags: ['work', 'documentation'],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
});
var task2Id = taskActions.addTask({
    title: 'Fix batch processing bug',
    description: 'Debug and fix the issue with batch processing in the core module',
    completed: false,
    priority: 'medium',
    tags: ['work', 'bug'],
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
});
var task3Id = taskActions.addTask({
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
console.log(filteredTasks.get().map(function (t) { return ({ id: t.id, title: t.title, dueDate: t.dueDate }); }));
console.log('\nToggling completion for task 1...');
taskActions.toggleTaskCompletion(task1Id);
console.log('Active tasks after toggle:');
console.log(filteredTasks.get().map(function (t) { return ({ id: t.id, title: t.title, completed: t.completed }); }));
console.log('\nChanging filter back to "all"...');
taskActions.updateUI({ filter: 'all' });
console.log('All tasks:');
console.log(filteredTasks.get().map(function (t) { return ({ id: t.id, title: t.title, completed: t.completed }); }));
console.log('\nAdding a new tag to task 2...');
taskActions.updateTask(task2Id, {
    tags: __spreadArray(__spreadArray([], appState.at('tasks').at(task2Id).at('tags').get(), true), ['urgent'], false)
});
console.log('Updated task 2:');
console.log(appState.at('tasks').at(task2Id).get());
console.log('\nDemonstrating search functionality...');
taskActions.updateUI({ search: 'bug' });
console.log('Search results for "bug":');
console.log(filteredTasks.get().map(function (t) { return ({ id: t.id, title: t.title }); }));
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
