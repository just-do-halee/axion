// React example with workaround for derived state
import React, { useState, useEffect } from "react";
import axion from "axion-state";
import { useAxion } from "axion-state/react";

// Create a todo state
const todosState = axion({
  todos: [],
  filter: "all",
});

// Add a todo
function addTodo(text) {
  todosState
    .at("todos")
    .update((todos) => [...todos, { id: Date.now(), text, completed: false }]);
}

// Toggle a todo
function toggleTodo(id) {
  todosState.at("todos").update((todos) =>
    todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
}

// Change filter
function setFilter(filter) {
  todosState.at("filter").set(filter);
}

// Create a derived state for filtered todos
// NOTE: Due to a potential issue with derived state updates,
// we're using a manual subscription pattern for this example
function createFilteredTodosState() {
  // This is the derived computation
  const computeFilteredTodos = () => {
    const { todos, filter } = todosState.get();
    
    if (filter === "all") return todos;
    if (filter === "active") return todos.filter(todo => !todo.completed);
    if (filter === "completed") return todos.filter(todo => todo.completed);
    return todos;
  };
  
  // Create an atom to hold the filtered todos
  const filteredTodosAtom = axion(computeFilteredTodos());
  
  // Set up subscription to update when source changes
  const unsubscribe = todosState.subscribe(() => {
    filteredTodosAtom.set(computeFilteredTodos());
  });
  
  return { 
    atom: filteredTodosAtom,
    dispose: unsubscribe
  };
}

// Create the filtered todos state
const filteredTodosState = createFilteredTodosState();

// React component
function TodoApp() {
  // Get the core state
  const { todos, filter } = useAxion(todosState);
  
  // Get the filtered todos
  const filteredTodos = useAxion(filteredTodosState.atom);
  
  // Cleanup subscription on unmount
  useEffect(() => {
    return filteredTodosState.dispose;
  }, []);
  
  // Form state
  const [newTodoText, setNewTodoText] = useState("");
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    
    addTodo(newTodoText);
    setNewTodoText("");
  };
  
  return (
    <div>
      <h1>Todo App ({todos.length})</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>
      
      <div>
        <button onClick={() => setFilter("all")} disabled={filter === "all"}>
          All
        </button>
        <button onClick={() => setFilter("active")} disabled={filter === "active"}>
          Active
        </button>
        <button onClick={() => setFilter("completed")} disabled={filter === "completed"}>
          Completed
        </button>
      </div>
      
      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
      
      <div>
        <small>
          {todos.filter(t => !t.completed).length} items left
        </small>
      </div>
    </div>
  );
}

export default TodoApp;