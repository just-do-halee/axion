# Axion

> A modern, mathematically grounded state management library for simple, predictable, and performant complex state handling.

[![npm version](https://badge.fury.io/js/axion-state.svg)](https://badge.fury.io/js/axion-state)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/axion-state)](https://bundlephobia.com/package/axion-state)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg)](LICENSE-MIT)

Axion is a state management library based on mathematically proven optimizations, providing an intuitive API with maximum performance. It supports both traditional JavaScript and TypeScript projects, and integrates seamlessly with React and Vue.

## Features

- **Blazingly fast**: Optimized for performance through incremental updates and structural sharing
- **Intuitive API**: Simple, fluent API that makes state management a joy
- **Type-safe**: Full TypeScript support with precise type inference
- **Path-based access**: Easy access to deeply nested state
- **Automatic dependency tracking**: Derived values with zero configuration
- **Transactional updates**: Atomic state changes that maintain consistency
- **Time travel**: Built-in undo/redo capability
- **Framework agnostic**: Works with React, Vue, or any other UI library

## Installation

```bash
# Using npm
npm install axion-state

# Using yarn
yarn add axion-state

# Using pnpm
pnpm add axion-state

# Using bun
bun add axion-state
```

### Framework-specific Imports

When working with React or Vue, import from the appropriate submodule:

```javascript
// For React applications
import { useAxion, useAxionEffect, useAtom } from "axion-state/react";

// For Vue applications
import { useAxion, useAxionComputed, useAxionModel } from "axion-state/vue";
```

## Basic Usage

```typescript
import axion from "axion-state";

// Create a state atom
const counter = axion({ count: 0 });

// Read state
console.log(counter.get().count); // 0

// Update state through paths
counter.at("count").set(1);
counter.at("count").update((n) => n + 1);

// Subscribe to changes
counter.subscribe(() => {
  console.log("New count:", counter.get().count);
});
```

## Derived State

```typescript
import axion from "axion-state";

const numbers = axion({ values: [1, 2, 3, 4, 5] });

// Create derived state with automatic dependency tracking
const stats = axion.derive(() => {
  const values = numbers.get().values;
  return {
    sum: values.reduce((a, b) => a + b, 0),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
  };
});

console.log(stats.get()); // { sum: 15, average: 3, max: 5 }

// Update source state - derived state recalculates automatically
numbers.at("values").update((values) => [...values, 6]);
console.log(stats.get()); // { sum: 21, average: 3.5, max: 6 }
```

## React Integration

```typescript
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
      {/* Rest of the component */}
    </div>
  );
}
```

## Transactions

```typescript
import axion from "axion-state";

const bankAccount = axion({
  balance: 1000,
  transactions: [],
  lastUpdated: null,
});

// Execute multiple updates as a single atomic operation
axion.tx(() => {
  // Withdraw money
  bankAccount.at("balance").update((balance) => balance - 100);

  // Add transaction record
  bankAccount
    .at("transactions")
    .update((transactions) => [
      ...transactions,
      { type: "withdrawal", amount: 100, date: new Date() },
    ]);

  // Update timestamp
  bankAccount.at("lastUpdated").set(new Date());
});
```

## Time Travel

```typescript
import axion from "axion-state";

const counterState = axion({ count: 0 });
const timeAPI = axion.getTimeAPI(counterState);

// Make some changes
counterState.at("count").set(1);
counterState.at("count").set(2);
counterState.at("count").set(3);

// Undo changes
timeAPI.undo(); // count is now 2
timeAPI.undo(); // count is now 1

// Redo changes
timeAPI.redo(); // count is now 2

// Jump to a specific point
const snapshots = timeAPI.getPast();
timeAPI.goto(snapshots[0].id); // Jump to first snapshot
```

## TypeScript Support

Axion is built from the ground up with TypeScript and provides excellent type safety:

```typescript
import axion from "axion-state";

// Create a typed state
interface UserState {
  name: string;
  age: number;
  preferences: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

// TypeScript will infer all types correctly
const user = axion<UserState>({
  name: "John",
  age: 30,
  preferences: {
    theme: "light",
    notifications: true,
  },
});

// Type-safe path access
const theme = user.at("preferences").at("theme").get(); // type: 'light' | 'dark'
```

## Contributing

1. Create an issue to discuss your contribution.
2. Fork the repo and create a feature branch.
3. Run tests with `bun run test` and ensure they pass.
4. Submit a pull request with detailed changes.

See the full [Contribution Guide](CONTRIBUTING.md) for details.

Korean version here [한국어 가이드](CONTRIBUTING-KO.md).

## License

This project is licensed under either the MIT License or the Apache License 2.0, at your option.

- [MIT License](LICENSE-MIT)
- [Apache License 2.0](LICENSE-APACHE)
