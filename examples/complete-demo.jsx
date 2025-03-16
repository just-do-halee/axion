// Complete demonstration of Axion features
import React, { useState } from "react";
import axion from "axion-state";
import { useAxion, useAtom, useAxionEffect } from "axion-state/react";

// =====================================================
// Basic State Management
// =====================================================
const counterState = axion({ count: 0 });

// =====================================================
// Derived State
// =====================================================
const statsState = axion.derive(() => {
  const count = counterState.get().count;
  return {
    count,
    doubled: count * 2,
    isEven: count % 2 === 0,
    isPositive: count > 0
  };
});

// =====================================================
// Time Travel
// =====================================================
const timeAPI = axion.getTimeAPI(counterState);

// =====================================================
// Nested State for Path Operations
// =====================================================
const userState = axion({
  profile: {
    name: "John Doe",
    email: "john@example.com",
    preferences: {
      theme: "light",
      notifications: true
    }
  },
  settings: {
    language: "en",
    timezone: "UTC"
  }
});

// =====================================================
// Todo App State
// =====================================================
const todoState = axion({
  todos: [],
  filter: "all"
});

function addTodo(text) {
  todoState.at("todos").update(todos => [
    ...todos,
    { id: Date.now(), text, completed: false }
  ]);
}

function toggleTodo(id) {
  todoState.at("todos").update(todos =>
    todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
}

function updateFilter(filter) {
  todoState.at("filter").set(filter);
}

// =====================================================
// Example Component
// =====================================================
function AxionDemo() {
  // Local state for form inputs
  const [newTodoText, setNewTodoText] = useState("");
  
  // Use the counter with useAxion hook
  const count = useAxion(counterState.at("count"));
  
  // Use derived state
  const stats = useAxion(statsState);
  
  // Use local atom with useAtom hook
  const [localCounter, setLocalCounter, localCounterAtom] = useAtom(0);
  
  // Use path operators for nested state
  const theme = useAxion(userState.at("profile").at("preferences").at("theme"));
  
  // Use the full todo state
  const { todos, filter } = useAxion(todoState);
  
  // Set up an effect
  useAxionEffect(() => {
    document.title = `Counter: ${count} | Todos: ${todos.length}`;
    // Cleanup function
    return () => {
      document.title = "Axion Demo";
    };
  });
  
  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === "all") return true;
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });
  
  // Get undo/redo history snapshots
  const history = timeAPI.getPast();
  const future = timeAPI.getFuture();
  
  // Handle form submission
  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    addTodo(newTodoText);
    setNewTodoText("");
  };
  
  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    userState.at("profile").at("preferences").at("theme").set(newTheme);
  };
  
  // Demonstrate transaction (atomic updates)
  const handleBatchUpdate = () => {
    axion.tx(() => {
      // Update counter
      counterState.at("count").update(c => c + 1);
      
      // Update user preferences
      userState.at("profile").at("preferences").at("notifications").set(false);
      
      // Add a todo
      addTodo("Created in transaction");
    });
  };
  
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Axion State Management Demo</h1>
      
      {/* Counter Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
        <h2>Basic Counter</h2>
        <div>
          <p>Current count: <strong>{count}</strong></p>
          <p>Stats: doubled = {stats.doubled}, {stats.isEven ? 'even' : 'odd'}, {stats.isPositive ? 'positive' : 'non-positive'}</p>
          
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <button onClick={() => counterState.at("count").update(c => c - 1)}>Decrement</button>
            <button onClick={() => counterState.at("count").set(0)}>Reset</button>
            <button onClick={() => counterState.at("count").update(c => c + 1)}>Increment</button>
          </div>
          
          {/* Time Travel Controls */}
          <div style={{ marginTop: "10px" }}>
            <h3>Time Travel</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => timeAPI.undo()} disabled={history.length <= 1}>Undo</button>
              <button onClick={() => timeAPI.redo()} disabled={future.length === 0}>Redo</button>
            </div>
            <div style={{ marginTop: "10px", fontSize: "14px" }}>
              <p>History states: {history.length}, Future states: {future.length}</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Local Atom Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
        <h2>Component Local State with useAtom</h2>
        <p>Local counter: <strong>{localCounter}</strong></p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setLocalCounter(c => c - 1)}>Decrement</button>
          <button onClick={() => setLocalCounter(0)}>Reset</button>
          <button onClick={() => setLocalCounter(c => c + 1)}>Increment</button>
        </div>
      </section>
      
      {/* Path Operations Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
        <h2>Nested State with Path Operations</h2>
        <p>Current theme: <strong>{theme}</strong></p>
        <button onClick={toggleTheme}>Toggle Theme</button>
        
        <div style={{ marginTop: "20px" }}>
          <h3>User Profile</h3>
          <pre style={{ background: "#f6f8fa", padding: "10px", borderRadius: "4px", overflow: "auto" }}>
            {JSON.stringify(userState.get(), null, 2)}
          </pre>
        </div>
      </section>
      
      {/* Todo App Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
        <h2>Todo Application</h2>
        
        <form onSubmit={handleAddTodo} style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
          <input 
            type="text" 
            value={newTodoText} 
            onChange={e => setNewTodoText(e.target.value)}
            placeholder="What needs to be done?"
            style={{ flexGrow: 1, padding: "8px" }}
          />
          <button type="submit">Add Todo</button>
        </form>
        
        <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
          <button 
            onClick={() => updateFilter("all")} 
            style={{ fontWeight: filter === "all" ? "bold" : "normal" }}
          >
            All
          </button>
          <button 
            onClick={() => updateFilter("active")} 
            style={{ fontWeight: filter === "active" ? "bold" : "normal" }}
          >
            Active
          </button>
          <button 
            onClick={() => updateFilter("completed")} 
            style={{ fontWeight: filter === "completed" ? "bold" : "normal" }}
          >
            Completed
          </button>
        </div>
        
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {filteredTodos.map(todo => (
            <li 
              key={todo.id}
              style={{ 
                padding: "8px", 
                margin: "4px 0", 
                display: "flex", 
                alignItems: "center",
                textDecoration: todo.completed ? "line-through" : "none",
                opacity: todo.completed ? 0.7 : 1
              }}
            >
              <input 
                type="checkbox" 
                checked={todo.completed} 
                onChange={() => toggleTodo(todo.id)}
                style={{ marginRight: "10px" }}
              />
              {todo.text}
            </li>
          ))}
        </ul>
        
        {todos.length === 0 && (
          <p style={{ color: "#888", fontStyle: "italic" }}>No todos yet. Add some tasks!</p>
        )}
        
        <div style={{ marginTop: "10px" }}>
          <p>{todos.filter(t => !t.completed).length} items left</p>
        </div>
      </section>
      
      {/* Transactions Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "8px" }}>
        <h2>Atomic Updates with Transactions</h2>
        <p>Use transactions to batch multiple updates together atomically</p>
        <button onClick={handleBatchUpdate}>Run Transaction Example</button>
        <p style={{ fontSize: "14px", marginTop: "10px", color: "#666" }}>
          This will increment the counter, turn off notifications, and add a new todo - all as a single operation
        </p>
      </section>
    </div>
  );
}

export default AxionDemo;