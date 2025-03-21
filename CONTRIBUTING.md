# Axion Developer Manual

1. [Introduction](#1-introduction)
2. [Theoretical Foundation](#2-theoretical-foundation)
3. [Architecture Overview](#3-architecture-overview)
4. [Core Modules](#4-core-modules)
5. [API Reference](#5-api-reference)
6. [Advanced Concepts](#6-advanced-concepts)
7. [Extension Guide](#7-extension-guide)
8. [Contribution Guidelines](#8-contribution-guidelines)
9. [Performance Optimization](#9-performance-optimization)
10. [Examples and Patterns](#10-examples-and-patterns)

---

## 1. Introduction

### 1.1 What is Axion?

Axion is a modern state management library designed based on mathematically proven principles. It provides a simple, predictable, and high-performance solution for complex state management. The library is designed around these core values:

- **Mathematical Rigor**: All features based on formal proofs
- **Performance Optimization**: Incremental computation and minimal updates
- **Developer Experience**: Intuitive API and strong type safety
- **Extensibility**: Lean core with a plugin architecture

### 1.2 Key Features

- **Single Source of Truth**: Predictable state management
- **Automatic Dependency Tracking**: Declarative derived state
- **Path-Based Access**: Efficient updates to deeply nested objects
- **Transactions**: Atomic state changes
- **Time Travel**: Built-in undo/redo capability
- **Type Safety**: Full TypeScript support
- **Framework Agnostic**: Works with React, Vue, or vanilla JS

### 1.3 Design Principles

1. **Simplicity**: Eliminate unnecessary complexity
2. **Consistency**: Predictable API patterns
3. **Separation of Concerns**: Clear boundaries between concerns
4. **Immutability**: All state changes are immutable
5. **Zero-Overhead Abstraction**: Convenient API without performance penalties

### 1.4 Axion vs Other Libraries

| Feature             | Axion           | Redux       | MobX          | Zustand   | Jotai/Recoil |
| ------------------- | --------------- | ----------- | ------------- | --------- | ------------ |
| **Core Paradigm**   | DILC Math Model | Flux        | Observability | Flux+Hooks | Atomic State |
| **State Access**    | Path-based      | Selectors   | Proxies       | Selectors | Selectors    |
| **Change Detection**| Precise Paths   | Shallow Eq  | Proxies       | Shallow Eq | Atom Deps    |
| **Immutability**    | Required        | Required    | Optional      | Required  | Required     |
| **Derived State**   | Auto Deps       | Manual      | Automatic     | Manual    | Automatic    |
| **TypeScript**      | Advanced Inference | Basic    | Basic         | Moderate  | Moderate     |
| **Bundle Size**     | ~8KB            | ~16KB       | ~22KB         | ~3KB      | ~7KB         |
| **Optimization**    | Path-based Diff | Selector Memo | Granular Obs | Selectors | Atom-level   |

## 2. Theoretical Foundation

### 2.1 DILC Model Introduction

DILC (Directed Incremental Lattice Category) is the core theoretical foundation of Axion. This mathematical model integrates the following mathematical fields to formalize state management:

- **Category Theory**: State transformations and composition
- **Lattice Theory**: Structuring state relationships and dependencies
- **Incremental Computation Theory**: Efficient recalculation
- **Directed Graph Theory**: Modeling dependency flow

### 2.2 Mathematical Theory

#### 2.2.1 Merkle Tree State Model

Axion models state as a hash-based Merkle tree. Each node has a hash value, allowing for change detection and efficient comparison.

```
       hash(root)
       /        \
  hash(A)      hash(B)
  /    \       /    \
h(A1)  h(A2)  h(B1)  h(B2)
```

#### 2.2.2 Categorical Lenses

Axion uses an algebraic structure called 'lenses' to access and update parts of state:

```
Lens<S, A> = (get: S → A, set: S × A → S)
```

Lenses satisfy the following laws:

- GetSet: `get(set(s, a)) = a`
- SetGet: `set(s, get(s)) = s`
- SetSet: `set(set(s, a), b) = set(s, b)`

#### 2.2.3 Dependency Graph

Axion models dependencies between states as a directed acyclic graph (DAG), and the dependency space as a complete lattice.

```
G = (V, E)
- V: Set of state references
- E: Set of dependency relationships (directed)
```

#### 2.2.4 Incremental Delta Computation

State changes are represented as minimal delta sets:

```
Δ(s, s') = { (p, v') | p ∈ paths(s), v' = s'[p] ≠ s[p] }
```

- `Δ(s, s)` = ∅ (no delta with itself)
- `Δ(s1, s3)` ⊆ `Δ(s1, s2)` ∪ `Δ(s2, s3)` (delta triangle inequality)

### 2.3 Practical Implications

What this mathematical foundation means in practice:

1. **Provable Consistency**: Guaranteed integrity of state updates
2. **Optimal Performance**: Only performs exactly the necessary computations
3. **Debuggability**: Clear tracking of state changes
4. **Maintainability**: Easy-to-reason-about code

## 3. Architecture Overview

### 3.1 System Components

Axion consists of the following core components:

```
┌───────────────────────────────────────────────────────────┐
│                     User Interface Layer                   │
└───────────┬───────────────────────────────┬───────────────┘
            │                               │
┌───────────▼───────────┐       ┌───────────▼───────────┐
│       API Layer        │◄─────►│    Integration Layer  │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
┌───────────▼───────────────────────────────▼───────────┐
│                     DILC Core Framework                │
├─────────────┬─────────────┬─────────────┬─────────────┤
│  State Engine│Incremental Engine│Transform Engine│Dependency Engine│
└─────────────┴─────────────┴─────────────┴─────────────┘
```

1. **DILC Core Framework**: Mathematical foundation of state management
2. **API Layer**: Developer interface
3. **Integration Layer**: Framework-specific bindings
4. **User Interface Layer**: Views and rendering

### 3.2 Data Flow

Axion's data flow is unidirectional:

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ State  │───►│Transform│───►│New State│───►│Subscribers│
└────────┘    └────────┘    └────────┘    └────────┘
                                │
                                ▼
                           ┌────────┐
                           │Recompute│
                           │(if needed)│
                           └────────┘
```

1. State transformation is applied
2. Changed paths are tracked
3. Affected derived states are recomputed
4. Subscribers are notified

### 3.3 Core Abstractions

```
┌─────────────┐
│  Atom<T>    │ - Basic unit of state
└──────┬──────┘
       │
┌──────▼──────┐
│PathOperator<T>│ - Path access operator
└──────┬──────┘
       │
┌──────▼──────┐
│ Transform<T> │ - State transformation algebra
└──────┬──────┘
       │
┌──────▼──────┐
│ Derived<T>  │ - Derived state
└─────────────┘
```

## 4. Core Modules

### 4.1 State Module (`core/`)

The state module is the center of Axion, containing:

#### 4.1.1 `atom.ts`

Implements state atoms and the basic state API.

**Responsibilities**:

- State creation and management
- Subscription management
- Ensuring immutability

**Key Classes/Functions**:

- `createAtom<T>`: Creates a state atom
- `Atom<T>` interface: State manipulation API

#### 4.1.2 `stateNode.ts`

Implements the internal structure of state.

**Responsibilities**:

- Hash-based immutable state storage
- Change detection and delta computation
- Path-based access and updates

**Key Classes/Functions**:

- `StateNode<T>`: Internal state structure
- `update`, `getPath`, `setPath`: Core state operations

#### 4.1.3 `path.ts`

Implements path-based state access.

**Responsibilities**:

- Type-safe access to specific parts of state
- Path operators

**Key Classes/Functions**:

- `PathNode<T, P>`: Type-safe path accessor
- `at`, `get`, `set`, `update`: Path manipulation

### 4.2 Dependency Tracking Module (`internals/`)

#### 4.2.1 `dependency.ts`

Implements the dependency tracking system.

**Responsibilities**:

- Automatic dependency tracking
- Cycle detection and prevention
- Dependency graph maintenance

**Key Classes/Functions**:

- `DependencyTracker`: Dependency collector
- `startTracking`, `stopTracking`: Tracking control
- `detectCycle`: Cycle detection

#### 4.2.2 `memo.ts`

Implements the memoization system.

**Responsibilities**:

- Caching computation results
- Managing cache invalidation
- Performance optimization

**Key Classes/Functions**:

- `createMemoized`: Creates memoized functions
- `createKeyedMemoized`: Key-based memoization
- `createScopedMemoized`: Scope-based memoization

#### 4.2.3 `batch.ts`

Implements batch processing of state updates.

**Responsibilities**:

- Grouping multiple updates as a single change
- Preventing unnecessary re-renders

**Key Classes/Functions**:

- `executeBatch`: Executes function within a batch
- `isBatching`: Checks current batch state
- `scheduleBatchedEffect`: Schedules effects

### 4.3 Derived State Module (`core/`)

#### 4.3.1 `derive.ts`

Implements the derived state system.

**Responsibilities**:

- Automatic dependency tracking-based derived state
- Incremental recomputation
- Optimized subscriptions

**Key Classes/Functions**:

- `createDerived`: Creates derived state
- Internal dependency tracking and recomputation logic

### 4.4 Effect Module (`core/`)

#### 4.4.1 `effect.ts`

Implements the reactive effects system.

**Responsibilities**:

- Side effects reacting to state changes
- Cleanup function management
- Effect activation/deactivation

**Key Classes/Functions**:

- `createEffect`: Creates an effect
- Internal effect tracking and execution logic

### 4.5 Time Module (`time/`)

#### 4.5.1 `history.ts`

Implements time travel functionality.

**Responsibilities**:

- State history management
- Undo/redo support

**Key Classes/Functions**:

- `TimeManager`: History manager
- `getTimeAPI`: Provides time API

#### 4.5.2 `snapshot.ts`

Manages state snapshots.

**Responsibilities**:

- State snapshot creation and comparison
- Snapshot serialization/deserialization
- Snapshot compression

**Key Classes/Functions**:

- `createSnapshot`: Creates snapshot
- `compressSnapshots`: Optimizes snapshots

### 4.6 Utility Module (`utils/`)

#### 4.6.1 `types.ts`

Provides type definitions.

**Responsibilities**:

- Type definitions for type safety
- Type utilities

**Key Types**:

- `DeepReadonly<T>`: Deep readonly type
- `Path`, `PathValue`: Path-related types
- Other utility types

#### 4.6.2 `hash.ts`

Implements hashing functionality.

**Responsibilities**:

- Value hashing
- Hash computation for Merkle tree

**Key Functions**:

- `computeHash`: Compute object hash
- `hashPath`: Path hashing

#### 4.6.3 `clone.ts`

Implements object cloning and structural sharing.

**Responsibilities**:

- Supporting immutable data structures
- Optimized object copying

**Key Functions**:

- `structuralClone`: Clone with structural sharing
- `deepFreeze`: Enforce object immutability
- `setValueAtPath`: Set value at path

#### 4.6.4 `path.ts`

Implements path processing functionality.

**Responsibilities**:

- Path string conversion
- Path relationship operations

**Key Functions**:

- `stringToPath`: Convert string to path
- `pathToString`: Convert path to string
- `areRelatedPaths`: Check path relationship

## 5. API Reference

### 5.1 Core API

#### 5.1.1 `axion<T>(initialState: T, options?: Options<T>): Atom<T>`

Creates a state atom.

**Parameters**:

- `initialState: T` - Initial state value
- `options?: Options<T>` - Optional options
  - `name?: string` - Name for debugging
  - `equals?: (a: T, b: T) => boolean` - Value comparison function
  - `devtools?: boolean` - Enable debugging tools

**Returns**:

- `Atom<T>` - State atom

**Example**:

```typescript
// Basic usage
const counter = axion({ count: 0 });

// With options
const user = axion(
  { name: "John", age: 30 },
  { name: "userState", devtools: true }
);
```

#### 5.1.2 `Atom<T>` Interface

Interface for state atoms.

**Properties and Methods**:

- `get(): DeepReadonly<T>` - Get current state value
- `set(newState: T): void` - Set new state
- `update(updater: (state: DeepReadonly<T>) => T): void` - Update state with function
- `at<K extends keyof T>(key: K): PathNode<T, [K]>` - Get path accessor
- `subscribe(handler: () => void): () => void` - Subscribe to changes
- `getPath(path: Path): unknown` - Internal, get value at path
- `setPath(path: Path, value: unknown): void` - Internal, set value at path

**Example**:

```typescript
// Get state
const value = counter.get();

// Set state
counter.set({ count: 5 });

// Update with function
counter.update((state) => ({ count: state.count + 1 }));

// Use path accessor
const countPath = counter.at("count");

// Subscribe to changes
const unsubscribe = counter.subscribe(() => {
  console.log("State changed:", counter.get());
});

// Unsubscribe
unsubscribe();
```

#### 5.1.3 `PathNode<T, P>` Interface

Interface for path accessors.

**Methods**:

- `get(): PathValue<T, P>` - Get value at path
- `set(value: PathValue<T, P>): void` - Set value at path
- `update(updater: (current: PathValue<T, P>) => PathValue<T, P>): void` - Update path value with function
- `at<K extends keyof PathValue<T, P>>(key: K): PathNode<T, [...P, K]>` - Get child path accessor
- `subscribe(handler: () => void): () => void` - Subscribe to specific path changes

**Example**:

```typescript
const user = axion({
  name: "John",
  profile: {
    age: 30,
    email: "john@example.com",
  },
});

// Get value with path
const name = user.at("name").get();

// Set value at path
user.at("name").set("Jane");

// Access nested path
const age = user.at("profile").at("age").get();

// Update path value with function
user
  .at("profile")
  .at("age")
  .update((age) => age + 1);

// Subscribe to path changes
const unsubscribe = user.at("name").subscribe(() => {
  console.log("Name changed:", user.at("name").get());
});
```

### 5.2 Derived State API

#### 5.2.1 `axion.derive<T>(compute: () => T, options?: { equals?: (a: T, b: T) => boolean, name?: string }): Atom<T>`

Creates derived state.

**Parameters**:

- `compute: () => T` - Computation function
- `options?: Object` - Optional options
  - `equals?: (a: T, b: T) => boolean` - Value comparison function
  - `name?: string` - Name for debugging

**Returns**:

- `Atom<T>` - Derived state atom

**Example**:

```typescript
// Basic derived state
const counter = axion({ count: 0 });
const doubled = axion.derive(() => counter.get().count * 2);

// Complex derived state
const formState = axion({
  firstName: "John",
  lastName: "Doe",
});

const fullName = axion.derive(() => {
  const state = formState.get();
  return `${state.firstName} ${state.lastName}`;
});

// Custom equals function
const list = axion({ items: [1, 2, 3] });
const itemArray = axion.derive(() => [...list.get().items], {
  equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
```

### 5.3 Effect API

#### 5.3.1 `axion.effect<T = void>(effectFn: (state: DeepReadonly<T>) => void | (() => void)): () => void`

Creates a reactive effect.

**Parameters**:

- `effectFn: (state: DeepReadonly<T>) => void | (() => void)` - Effect function (optionally returning cleanup function)

**Returns**:

- `() => void` - Effect cleanup function

**Example**:

```typescript
// Basic effect
const counter = axion({ count: 0 });
const cleanup = axion.effect(() => {
  console.log("Count:", counter.get().count);
});

// Effect with cleanup function
const isOnline = axion({ value: true });
const cleanup = axion.effect(() => {
  const online = isOnline.get().value;
  console.log(`Status: ${online ? "Online" : "Offline"}`);

  // Return cleanup function
  return () => {
    console.log("Cleaning up...");
  };
});

// Clean up effect
cleanup();
```

### 5.4 Transaction API

#### 5.4.1 `axion.tx<T>(callback: () => T): T`

Executes an atomic transaction.

**Parameters**:

- `callback: () => T` - Callback to execute within transaction

**Returns**:

- `T` - Return value of callback

**Example**:

```typescript
// Basic transaction
const user = axion({
  name: "John",
  email: "john@example.com",
  lastUpdated: null,
});

axion.tx(() => {
  user.at("name").set("Jane");
  user.at("email").set("jane@example.com");
  user.at("lastUpdated").set(new Date().toISOString());
});

// Nested transactions
axion.tx(() => {
  user.at("name").set("Alice");

  axion.tx(() => {
    user.at("email").set("alice@example.com");
  });

  user.at("lastUpdated").set(new Date().toISOString());
});
```

### 5.5 Time Travel API

#### 5.5.1 `axion.getTimeAPI<T>(atom: Atom<T>): TimeAPI<T>`

Provides time travel API.

**Parameters**:

- `atom: Atom<T>` - Target atom

**Returns**:

- `TimeAPI<T>` - Time travel API

#### 5.5.2 `TimeAPI<T>` Interface

Interface providing time travel functionality.

**Methods**:

- `undo(): boolean` - Undo change
- `redo(): boolean` - Redo change
- `goto(id: string): boolean` - Go to specific point
- `getPast(): ReadonlyArray<StateSnapshot<T>>` - Get past snapshots
- `getFuture(): ReadonlyArray<StateSnapshot<T>>` - Get future snapshots
- `clear(): void` - Clear history
- `setLimit(limit: number): void` - Set history limit

**Example**:

```typescript
// Get time travel API
const counter = axion({ count: 0 });
const timeAPI = axion.getTimeAPI(counter);

// Make state changes
counter.at("count").set(1);
counter.at("count").set(2);
counter.at("count").set(3);

// Undo
timeAPI.undo(); // count = 2
timeAPI.undo(); // count = 1

// Redo
timeAPI.redo(); // count = 2

// Get past snapshots
const snapshots = timeAPI.getPast();

// Go to specific point
timeAPI.goto(snapshots[0].id);

// Set history limit
timeAPI.setLimit(10);

// Clear history
timeAPI.clear();
```

### 5.6 Debugging API

#### 5.6.1 `axion.devtools`

Provides debugging tools.

**Methods**:

- `createDevtools(options?: DevtoolsOptions): Devtools` - Create debugging tools instance
- `getDevtools(): Devtools | null` - Get current debugging tools instance
- `registerWithDevtools<T>(atom: Atom<T>, name: string): Atom<T>` - Register atom with debugging tools

**Example**:

```typescript
// Initialize debugging tools
const devtools = axion.devtools({
  name: "MyApp",
  maxEvents: 100,
  logToConsole: true,
});

// Register atom
const counter = axion({ count: 0 });
axion.registerWithDevtools(counter, "counter");

// Subscribe to events
devtools.subscribe((event) => {
  console.log("Devtools event:", event);
});

// Get current state snapshot
const snapshot = devtools.getStateSnapshot();
```

### 5.7 Error Handling API

#### 5.7.1 `axion.setErrorHandler`

Sets global error handler.

**Parameters**:

- `handler: (error: AxionError) => void` - Error handler

**Example**:

```typescript
// Set global error handler
axion.setErrorHandler((error) => {
  console.error(`[${error.code}] ${error.message}`);

  // Report error to analytics service
  analyticsService.reportError(error);
});
```

### 5.8 Framework Integration API

#### 5.8.1 React

```typescript
import { useAxion } from "axion-state/react";

// Use atom
function Counter() {
  const counter = axion({ count: 0 });
  const [state, setState] = useAxion(counter);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => setState((s) => ({ count: s.count + 1 }))}>
        Increment
      </button>
    </div>
  );
}

// Use path accessor
function UserProfile() {
  const user = axion({
    name: "John",
    profile: { age: 30 },
  });

  const name = useAxion(user.at("name"));
  const age = useAxion(user.at("profile").at("age"));

  return (
    <div>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
    </div>
  );
}
```

#### 5.8.2 Vue

```typescript
import { useAxion, useAxionComputed } from "axion-state/vue";

// Use in Vue Composition API
export default {
  setup() {
    const counter = axion({ count: 0 });

    // Reactive state
    const state = useAxion(counter);

    // Computed property
    const doubled = useAxionComputed(() => state.value.count * 2);

    // Methods
    const increment = () => {
      counter.update((s) => ({ count: s.count + 1 }));
    };

    return {
      state,
      doubled,
      increment,
    };
  },
};
```

## 6. Advanced Concepts

### 6.1 Cyclic Dependency Detection

Axion automatically detects and prevents cyclic dependencies between derived states and effects.

#### How It Works

1. **Computation Stack Tracking**: Add current atom ID to stack when derived computation starts
2. **Dependency Check**: Check if already in stack when adding dependency
3. **Cycle Detection**: Cyclic dependency error if same atom ID found

```typescript
// Cyclic dependency example
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);

// Cyclic dependency - will throw error!
const c = axion.derive(() => {
  const valueB = b.get();
  a.set({ value: valueB + 1 }); // a depends on b, which depends on a
  return valueB + 3;
});
```

### 6.2 Memoization Strategies

Axion uses multiple levels of memoization to optimize performance.

#### 6.2.1 Single Cache Memoization

Optimized memoization strategy for the most common case.

```typescript
// Internal implementation
function memoize<T>(fn: () => T): () => T {
  let cache: T | undefined;
  let isInitialized = false;

  return () => {
    if (!isInitialized) {
      cache = fn();
      isInitialized = true;
    }
    return cache;
  };
}
```

#### 6.2.2 LRU Cache Memoization

Caches results for multiple input values.

```typescript
// Internal implementation
function memoizeWithLRU<K, V>(fn: (key: K) => V, maxSize = 10): (key: K) => V {
  const cache = new Map<string, { key: K; value: V }>();
  const keyOrder: K[] = [];

  return (key: K) => {
    // Cache check and management logic
    // ...
  };
}
```

### 6.3 Transaction Nesting

Axion naturally supports nested transactions.

#### How It Works

1. Depth counter increments when transaction starts
2. Nested transactions only increment counter
3. Changes applied and notifications sent only when last transaction completes

```typescript
// Internal implementation
let batchDepth = 0;

function executeBatch<T>(callback: () => T): T {
  batchDepth++;
  try {
    return callback();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPendingEffects();
    }
  }
}
```

### 6.4 Delta Compression

Delta compression strategy to optimize changes.

#### How It Works

1. Collect all changed paths
2. Remove child paths if parent path exists
3. Calculate minimal delta set

```typescript
// Internal implementation
function optimizePaths(paths: Path[]): Path[] {
  const result = new Set<Path>();

  paths.sort((a, b) => a.length - b.length);

  for (const path of paths) {
    let hasParent = false;

    for (const existing of result) {
      if (isSubPath(existing, path)) {
        hasParent = true;
        break;
      }
    }

    if (!hasParent) {
      result.add(path);
    }
  }

  return Array.from(result);
}
```

### 6.5 Time Complexity Analysis

Time complexity for key operations:

| Operation            | Complexity | Description           |
| -------------------- | ---------- | --------------------- |
| `atom.get()`         | O(1)       | Constant time access  |
| `atom.set(value)`    | O(n)       | n is state size       |
| `pathNode.get()`     | O(log d)   | d is path depth       |
| `pathNode.set(value)`| O(log d)   | Proportional to path depth |
| Derived computation  | O(c)       | c is computation complexity |
| Delta computation    | O(Δ)       | Δ is change size      |
| Change detection     | O(log n)   | Hash-based detection  |
| Dependency tracking  | O(k)       | k is dependency count |

### 6.6 Custom Equals Functions

For special equality comparisons:

```typescript
// Deep comparison for arrays
const list = axion(
  { items: [1, 2, 3] },
  {
    equals: (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;

      if (Array.isArray(a.items) && Array.isArray(b.items)) {
        if (a.items.length !== b.items.length) return false;
        return a.items.every((v, i) => v === b.items[i]);
      }

      return false;
    },
  }
);

// Also applicable to derived state
const filteredItems = axion.derive(
  () => list.get().items.filter((x) => x % 2 === 0),
  {
    equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  }
);
```

## 7. Extension Guide

### 7.1 Custom Atom Implementation

You can extend Axion core to implement atoms for special requirements.

```typescript
import { createAtom, Atom } from "axion-state";

// localStorage-backed atom
function createPersistentAtom<T>(key: string, initialState: T): Atom<T> {
  // Load initial state from localStorage
  const savedState = localStorage.getItem(key);
  const state = savedState ? JSON.parse(savedState) : initialState;

  // Create base atom
  const atom = createAtom(state);

  // Store original set function
  const originalSet = atom.set;

  // Override set function
  atom.set = function (newState: T): void {
    // Call original implementation
    originalSet.call(atom, newState);

    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(newState));
  };

  return atom;
}

// Usage
const persistentCounter = createPersistentAtom("counter", { count: 0 });
```

### 7.2 Middleware Implementation

You can implement middleware to customize Axion behavior.

```typescript
import { createAtom, Atom } from "axion-state";

// Logging middleware
function withLogging<T>(name: string): (atom: Atom<T>) => Atom<T> {
  return (atom) => {
    // Store original methods
    const originalGet = atom.get;
    const originalSet = atom.set;
    const originalUpdate = atom.update;

    // Override methods
    atom.get = function () {
      const result = originalGet.call(atom);
      console.log(`[${name}] Get:`, result);
      return result;
    };

    atom.set = function (newState: T) {
      console.log(`[${name}] Set:`, newState);
      originalSet.call(atom, newState);
    };

    atom.update = function (updater) {
      console.log(`[${name}] Update`);
      originalUpdate.call(atom, updater);
    };

    return atom;
  };
}

// Usage
const counter = withLogging("counter")(createAtom({ count: 0 }));
```

### 7.3 Custom Transformers

You can implement transformers for special state transformations.

```typescript
import { createTransformer, Transformer } from "axion-state/core";

// Immutable update function type
type Updater<T> = (state: T) => T;

// Immer-style transformer
function createImmerTransformer<T>(
  producer: (draft: T) => void
): Transformer<T> {
  return createTransformer(
    ["*"], // Affects all paths
    (state) => {
      // Use immer library
      const [nextState, patches] = produce(state, producer, true);

      // Extract changed paths
      const paths = patches.map((patch) =>
        patch.path.split("/").filter(Boolean)
      );

      return [nextState, new Set(paths)];
    }
  );
}

// Usage
const updateUser = createImmerTransformer((draft) => {
  draft.name = "Jane";
  draft.profile.age += 1;
});

// Apply
store.apply(updateUser);
```

### 7.4 Plugin Development

You can develop plugins to extend the Axion ecosystem.

```typescript
// State persistence plugin
export function persistPlugin<T>(
  key: string,
  options: {
    storage?: Storage;
    serialize?: (state: T) => string;
    deserialize?: (data: string) => T;
  } = {}
) {
  const {
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  return {
    // Extend atom
    extendAtom(atom: Atom<T>): Atom<T> {
      // Load initial data from localStorage
      const savedData = storage.getItem(key);
      if (savedData) {
        try {
          const state = deserialize(savedData);
          atom.set(state);
        } catch (e) {
          console.error("Failed to deserialize state:", e);
        }
      }

      // Subscribe to changes and save
      atom.subscribe(() => {
        try {
          const serialized = serialize(atom.get());
          storage.setItem(key, serialized);
        } catch (e) {
          console.error("Failed to serialize state:", e);
        }
      });

      return atom;
    },

    // Add methods
    methods: {
      clearPersistedState() {
        storage.removeItem(key);
      },

      getPersistedState(): T | null {
        const data = storage.getItem(key);
        return data ? deserialize(data) : null;
      },
    },
  };
}

// Usage
const persist = persistPlugin("counter");
const counter = persist.extendAtom(axion({ count: 0 }));

// Use methods added by plugin
persist.methods.clearPersistedState();
```

## 8. Contribution Guidelines

### 8.1 Development Environment Setup

```bash
# Clone repository
git clone https://github.com/axion-state/axion.git
cd axion

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build
npm run build
```

### 8.2 Code Style

Axion adheres to the following coding standards:

- TypeScript type safety
- Functional programming principles
- Immutability first
- Clear naming
- Thorough documentation

```typescript
/**
 * Gets value at specific path.
 *
 * @param obj - Source object
 * @param path - Path to access
 * @returns Value at path, or undefined if path doesn't exist
 *
 * @example
 * getValueAtPath({ a: { b: 1 } }, ['a', 'b']) // 1
 */
export function getValueAtPath<T>(
  obj: T,
  path: Array<string | number | symbol>
): unknown {
  if (path.length === 0) {
    return obj;
  }

  let current: any = obj;

  for (const segment of path) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}
```

### 8.3 Testing Guidelines

All features should include the following tests:

1. **Unit Tests**: Verify individual functions and modules
2. **Integration Tests**: Verify interaction between multiple modules
3. **Performance Tests**: Verify time and memory usage

```typescript
// Unit test example
describe("getValueAtPath", () => {
  test("empty path returns the object itself", () => {
    const obj = { a: 1 };
    expect(getValueAtPath(obj, [])).toBe(obj);
  });

  test("gets value at simple path", () => {
    const obj = { a: 1, b: 2 };
    expect(getValueAtPath(obj, ["a"])).toBe(1);
    expect(getValueAtPath(obj, ["b"])).toBe(2);
  });

  test("gets value at nested path", () => {
    const obj = { a: { b: { c: 3 } } };
    expect(getValueAtPath(obj, ["a", "b", "c"])).toBe(3);
  });

  test("returns undefined for non-existent path", () => {
    const obj = { a: 1 };
    expect(getValueAtPath(obj, ["b"])).toBeUndefined();
    expect(getValueAtPath(obj, ["a", "b"])).toBeUndefined();
  });

  test("handles arrays", () => {
    const obj = { a: [1, 2, 3] };
    expect(getValueAtPath(obj, ["a", 1])).toBe(2);
  });

  test("handles null and undefined", () => {
    const obj = { a: null, b: undefined };
    expect(getValueAtPath(obj, ["a", "prop"])).toBeUndefined();
    expect(getValueAtPath(obj, ["b", "prop"])).toBeUndefined();
  });
});
```

### 8.4 Documentation Standards

Code documentation should include:

1. Purpose of function or class
2. Parameter and return value descriptions
3. Exceptions and edge cases
4. Usage examples
5. References to related functions or modules

```typescript
/**
 * Executes multiple state changes as a single transaction.
 *
 * All changes within the transaction are notified to subscribers
 * as a single update only after the transaction completes. Transactions can be nested,
 * and notifications are sent only when the top-level transaction completes.
 *
 * @typeParam T - Type of callback return value
 * @param callback - Function to execute within transaction
 * @returns Return value of callback
 *
 * @example
 * axion.tx(() => {
 *   user.at('name').set('Jane');
 *   user.at('email').set('jane@example.com');
 * });
 *
 * @see {@link isBatching} Check current transaction state
 * @see {@link executeBatch} Internal batch processing implementation
 */
export function transaction<T>(callback: () => T): T {
  return executeBatch(callback);
}
```

### 8.5 Pull Request Process

1. **Create Issue**: Create an issue before starting work
2. **Create Branch**: Create branch for feature or bugfix
3. **Write Code**: Write code following coding standards
4. **Write Tests**: Write tests for new code
5. **Pull Request**: Submit PR with description and review request
6. **Code Review**: Incorporate feedback and revise as needed
7. **Merge**: Code merged after approval

## 9. Performance Optimization

### 9.1 Memory Usage Optimization

#### 9.1.1 Structural Sharing

Axion uses structural sharing to optimize memory usage while maintaining immutability.

```
// State before change
{
  a: {
    b: { value: 1 },
    c: { value: 2 }
  }
}

// After changing a.b.value to 3
// (gray nodes are shared with original object)
{
  a: {
    b: { value: 3 },  // New object
    c: { value: 2 }   // Shared with original
  }
}
```

**Implementation**:

```typescript
function setValueAtPath<T extends object>(
  obj: T,
  path: Path,
  value: unknown
): T {
  if (path.length === 0) {
    return structuralClone(value as T);
  }

  const result = structuralClone(obj);
  let current: any = result;

  // Navigate to path up to last segment
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];

    if (current[segment] === undefined) {
      current[segment] = typeof path[i + 1] === "number" ? [] : {};
    } else {
      // Clone for structural sharing
      current[segment] = structuralClone(current[segment]);
    }

    current = current[segment];
  }

  // Set value at last segment
  const lastSegment = path[path.length - 1];
  current[lastSegment] = structuralClone(value);

  return result;
}
```

#### 9.1.2 Preventing Memory Leaks

Strategies to prevent memory leaks in subscription and dependency management.

**Using Weak References**:

```typescript
// Use WeakMap to allow garbage collection
const derivedStates = new WeakMap<object, Set<Atom<any>>>();

// Derived states can be garbage collected if atom is unused
```

**Explicit Unsubscription**:

```typescript
// All subscriptions return unsubscribe function
const unsubscribe = counter.subscribe(() => {
  console.log("State changed");
});

// Unsubscribe
unsubscribe();
```

### 9.2 Computation Optimization

#### 9.2.1 Minimal Recomputation

Axion performs only necessary computation through precise dependency tracking.

**Example**:

```typescript
// User state
const user = axion({
  name: "John",
  profile: {
    age: 30,
    email: "john@example.com",
  },
});

// Derived state 1 - depends only on name
const greeting = axion.derive(() => `Hello, ${user.get().name}!`);

// Derived state 2 - depends only on age
const isAdult = axion.derive(() => user.get().profile.age >= 18);

// Change only name - only greeting is recomputed
user.at("name").set("Jane");

// Change only age - only isAdult is recomputed
user.at("profile").at("age").set(25);
```

#### 9.2.2 Path-Based Granularity

Path-based access allows for more precise dependency tracking.

```typescript
// Path-based access - more precise dependency tracking
const userName = axion.derive(() => user.at("name").get());
const userAge = axion.derive(() => user.at("profile").at("age").get());

// Change profile email only - no derived states are recomputed
user.at("profile").at("email").set("jane@example.com");
```

### 9.3 Rendering Optimization

#### 9.3.1 Granular Subscriptions

Granular subscription strategy for rendering optimization.

**React Example**:

```tsx
// State granularity
const userState = axion({
  name: "John",
  profile: { age: 30 },
});

// UserNameDisplay - only reacts to name changes
function UserNameDisplay() {
  const name = useAxion(userState.at("name"));
  return <h2>{name}</h2>;
}

// UserAgeDisplay - only reacts to age changes
function UserAgeDisplay() {
  const age = useAxion(userState.at("profile").at("age"));
  return <p>Age: {age}</p>;
}

// Name change only rerenders UserNameDisplay
// Age change only rerenders UserAgeDisplay
```

#### 9.3.2 Batching Async Updates

Process renders in batches to improve performance.

**Microtask-Based Batching**:

```typescript
// Batch processing system (internal implementation)
function scheduleBatchedEffect(effect: () => void): void {
  pendingEffects.add(effect);

  if (!isBatching()) {
    // Schedule as microtask (runs in next event loop)
    queueMicrotask(runPendingEffects);
  }
}
```

### 9.4 Network Request Optimization

#### 9.4.1 Debouncing and Throttling

```typescript
import { axion } from "axion-state";

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Usage
const searchState = axion({ query: "" });

// Debounced search effect
axion.effect(() => {
  const query = searchState.get().query;

  // Debounced API call
  const performSearch = debounce((q: string) => {
    if (q.length > 2) {
      api.search(q).then((results) => {
        // Process results
      });
    }
  }, 300);

  performSearch(query);
});
```

#### 9.4.2 Request Caching and Deduplication

```typescript
// Request caching helper
const requestCache = new Map<string, Promise<any>>();

async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheDuration = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;

  // Check for ongoing request
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as Promise<T>;
  }

  // Start new request
  const promise = fetch(url, options)
    .then((res) => res.json())
    .finally(() => {
      // Set cache expiration
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, cacheDuration);
    });

  // Store in cache
  requestCache.set(cacheKey, promise);

  return promise as Promise<T>;
}
```

## 10. Examples and Patterns

### 10.1 Basic Patterns

#### 10.1.1 Todo List

```typescript
// State definition
const todosState = axion({
  items: [] as Array<{ id: string; text: string; completed: boolean }>,
  filter: "all" as "all" | "active" | "completed",
});

// Derived state
const filteredTodos = axion.derive(() => {
  const { items, filter } = todosState.get();

  switch (filter) {
    case "active":
      return items.filter((item) => !item.completed);
    case "completed":
      return items.filter((item) => item.completed);
    default:
      return items;
  }
});

// Actions
const actions = {
  addTodo(text: string) {
    todosState.update((state) => ({
      ...state,
      items: [
        ...state.items,
        { id: Date.now().toString(), text, completed: false },
      ],
    }));
  },

  toggleTodo(id: string) {
    todosState.update((state) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  },

  setFilter(filter: "all" | "active" | "completed") {
    todosState.at("filter").set(filter);
  },
};

// React component
function TodoList() {
  const todos = useAxion(filteredTodos);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => actions.toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}
```

#### 10.1.2 User Profile

```typescript
// State definition
const userProfile = axion({
  loading: false,
  error: null as string | null,
  data: null as {
    id: string;
    name: string;
    email: string;
    avatar: string;
  } | null,
});

// Derived state
const isLoggedIn = axion.derive(() => !!userProfile.get().data);

// Actions
const userActions = {
  async fetchProfile(userId: string) {
    // Start loading
    userProfile.update((state) => ({ ...state, loading: true, error: null }));

    try {
      // API call
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();

      // Update data on success
      userProfile.update((state) => ({
        ...state,
        loading: false,
        data,
      }));
    } catch (err) {
      // Handle error
      userProfile.update((state) => ({
        ...state,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  },

  logout() {
    userProfile.update((state) => ({
      ...state,
      data: null,
    }));
  },
};

// Effect - react to login state changes
const cleanup = axion.effect(() => {
  const loggedIn = isLoggedIn.get();

  if (loggedIn) {
    console.log("User logged in");
  } else {
    console.log("User logged out");
  }
});
```

### 10.2 Advanced Patterns

#### 10.2.1 Finite State Machine

```typescript
// State machine definition
type State = "idle" | "loading" | "success" | "error";
type Event = "FETCH" | "RESOLVE" | "REJECT" | "RESET";

interface MachineState<T> {
  state: State;
  data: T | null;
  error: Error | null;
}

// State machine creation function
function createStateMachine<T>(initialData: T | null = null) {
  // Initial state
  const state = axion<MachineState<T>>({
    state: "idle",
    data: initialData,
    error: null,
  });

  // State transition implementation
  function transition(event: Event, payload?: any) {
    axion.tx(() => {
      switch (event) {
        case "FETCH":
          if (state.get().state !== "loading") {
            state.at("state").set("loading");
          }
          break;

        case "RESOLVE":
          if (state.get().state === "loading") {
            state.at("state").set("success");
            state.at("data").set(payload);
            state.at("error").set(null);
          }
          break;

        case "REJECT":
          if (state.get().state === "loading") {
            state.at("state").set("error");
            state.at("error").set(payload);
          }
          break;

        case "RESET":
          state.at("state").set("idle");
          state.at("data").set(initialData);
          state.at("error").set(null);
          break;
      }
    });
  }

  // Async action creator
  function createAsyncAction<R>(promiseFn: () => Promise<R>): () => Promise<R> {
    return async () => {
      transition("FETCH");

      try {
        const result = await promiseFn();
        transition("RESOLVE", result);
        return result;
      } catch (error) {
        transition("REJECT", error);
        throw error;
      }
    };
  }

  return {
    state,
    transition,
    createAsyncAction,
    reset: () => transition("RESET"),
  };
}

// Usage
const userMachine = createStateMachine(null);

const fetchUser = userMachine.createAsyncAction(async () => {
  const response = await fetch("/api/user");
  return response.json();
});

// React to state
axion.effect(() => {
  const { state: currentState, data, error } = userMachine.state.get();

  switch (currentState) {
    case "loading":
      showLoadingSpinner();
      break;
    case "success":
      hideLoadingSpinner();
      displayUser(data);
      break;
    case "error":
      hideLoadingSpinner();
      showError(error);
      break;
  }
});

// Fetch user
fetchUser().catch(console.error);
```

#### 10.2.2 Form State Management

```typescript
// Form state and validation
function createForm<T extends Record<string, any>>(initialValues: T) {
  // Form state
  const formState = axion({
    values: initialValues,
    touched: {} as Record<keyof T, boolean>,
    errors: {} as Record<keyof T, string | null>,
    isSubmitting: false,
    isValid: true
  });

  // Per-field validation rules
  const validators = new Map<
    keyof T,
    (value: any, allValues: T) => string | null
  >();

  // Register validation function
  function setValidator<K extends keyof T>(
    field: K,
    validator: (value: T[K], allValues: T) => string | null
  ) {
    validators.set(field, validator);

    // Run validation on current value
    const currentValue = formState.get().values[field];
    const error = validator(currentValue, formState.get().values);

    formState.update(state => ({
      ...state,
      errors: {
        ...state.errors,
        [field]: error
      },
      isValid: !error && Object.values(state.errors).every(e => !e)
    }));
  }

  // Value change handler
  function handleChange<K extends keyof T>(field: K, value: T[K]) {
    formState.update(state => {
      // New values
      const newValues = {
        ...state.values,
        [field]: value
      };

      // Validation
      const validator = validators.get(field);
      const error = validator ? validator(value, newValues) : null;

      // Mark field as touched
      const touched = {
        ...state.touched,
        [field]: true
      };

      // Update errors
      const errors = {
        ...state.errors,
        [field]: error
      };

      // Check overall validity
      const isValid = Object.values(errors).every(e => !e);

      return {
        ...state,
        values: newValues,
        touched,
        errors,
        isValid
      };
    });
  }

  // Submit handler
  async function handleSubmit(
    onSubmit: (values: T) => Promise<void> | void
  ) {
    // Mark all fields as touched
    const allTouched = Object.keys(formState.get().values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>
    );

    formState.update(state => ({
      ...state,
      touched: allTouched,
      isSubmitting: true
    }));

    // Validation
    if (!formState.get().isValid) {
      formState.at('isSubmitting').set(false);
      return;
    }

    try {
      await onSubmit(formState.get().values);

      formState.at('isSubmitting').set(false);
    } catch (error) {
      formState.update(state => ({
        ...state,
        isSubmitting: false
      }));

      throw error;
    }
  }

  // Form reset
  function resetForm() {
    formState.set({
      values: initialValues,
      touched: {} as Record<keyof T, boolean>,
      errors: {} as Record<keyof T, string | null>,
      isSubmitting: false,
      isValid: true
    });
  }

  return {
    formState,
    setValidator,
    handleChange,
    handleSubmit,
    resetForm
  };
}

// Usage
const loginForm = createForm({
  email: '',
  password: ''
});

// Set validation rules
loginForm.setValidator('email', email => {
  if (!email) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Invalid email format';
  return null;
});

loginForm.setValidator('password', password => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
});

// React component
function LoginForm() {
  const { values, errors, touched, isSubmitting } = useAxion(loginForm.formState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    loginForm.handleSubmit(async values => {
      await api.login(values.email, values.password);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          value={values.email}
          onChange={e => loginForm.handleChange('email', e.target.value)}
        />
        {touched.email && errors.email && (
          <div className="error">{errors.email}</div>
        )}
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          value={values.password}
          onChange={e => loginForm.handleChange('password', e.target.value)}
        />
        {touched.password && errors.password && (
          <div className="error">{errors.password}</div>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

### 10.3 Anti-Patterns

#### 10.3.1 Cyclic Dependencies

**Wrong Pattern**:

```typescript
// Interdependent derived states
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);

// Creates cyclic dependency at creation time
// a → b → a
const c = axion.derive(() => {
  const valueB = b.get();
  a.set({ value: valueB + 1 }); // Creates cyclic reference to a
  return valueB;
});
```

**Correct Pattern**:

```typescript
// Maintain one-way dependencies
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);
const c = axion.derive(() => b.get() + 1);

// Separate into action
function updateAFromB() {
  const valueB = b.get();
  a.set({ value: valueB + 1 });
}
```

#### 10.3.2 Over-Granularity

**Wrong Pattern**:

```typescript
// Overly granular state
const firstName = axion({ value: "John" });
const lastName = axion({ value: "Doe" });
const age = axion({ value: 30 });
const email = axion({ value: "john@example.com" });

// These states often change together
```

**Correct Pattern**:

```typescript
// Cohesive state grouping
const user = axion({
  firstName: "John",
  lastName: "Doe",
  age: 30,
  email: "john@example.com",
});

// Lens access if needed
const firstName = user.at("firstName");
```

#### 10.3.3 Async Work Inside State Updates

**Wrong Pattern**:

```typescript
// Async work directly in state update
function fetchAndUpdateUser() {
  users.update(async (state) => {
    // Async work inside state update - wrong approach!
    const response = await fetch("/api/user");
    const data = await response.json();
    return { ...state, user: data };
  });
}
```

**Correct Pattern**:

```typescript
// Separate async work
async function fetchAndUpdateUser() {
  try {
    users.at("loading").set(true);

    const response = await fetch("/api/user");
    const data = await response.json();

    users.update((state) => ({
      ...state,
      loading: false,
      user: data,
      error: null,
    }));
  } catch (error) {
    users.update((state) => ({
      ...state,
      loading: false,
      error: String(error),
    }));
  }
}
```

#### 10.3.4 Side Effects in Derived State

**Wrong Pattern**:

```typescript
// Side effects inside derived state
const notifications = axion.derive(() => {
  const count = unreadMessages.get().length;

  if (count > 0) {
    // Side effect in derived computation - wrong approach!
    document.title = `(${count}) New Messages`;
    playNotificationSound();
  }

  return count;
});
```

**Correct Pattern**:

```typescript
// Keep derived state pure
const unreadCount = axion.derive(() => unreadMessages.get().length);

// Separate side effects into effects
axion.effect(() => {
  const count = unreadCount.get();

  if (count > 0) {
    document.title = `(${count}) New Messages`;
    playNotificationSound();
  } else {
    document.title = "Messages";
  }
});
```