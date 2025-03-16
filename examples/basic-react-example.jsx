// Example React component using Axion - following the README pattern exactly
import React from "react";
import axion from "axion-state";
import { useAxion } from "axion-state/react";

// Create a global state
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

// React component
function TodoApp() {
  // Use the entire state
  const { todos, filter } = useAxion(todosState);

  // Or just a part of it
  const todoCount = useAxion(todosState.at("todos")).length;

  return (
    <div>
      <h1>Todo App ({todoCount})</h1>
      <button onClick={() => addTodo("New Task")}>Add Todo</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;
