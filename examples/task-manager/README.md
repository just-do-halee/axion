# Axion Task Manager Example

This mini-project demonstrates a real-world application built with Axion, showcasing all the core features of the library working together to create a task management application.

## Features Demonstrated

1. **Core State Management**
   - Creating and managing atoms
   - Reading state with `get()`
   - Updating state with `set()`, `update()`, and path-based operations
   - Immutable state updates

2. **Path-based State Access**
   - Accessing deeply nested state with `at()`
   - Optimized updates that only affect specific parts of the state tree
   - Clean dependency tracking for deep paths

3. **Derived States**
   - Computed values that automatically update when dependencies change
   - Optimized recalculation that only happens when needed
   - Creating complex derivations with clean dependency tracking

4. **Effects**
   - Side effects that respond to state changes
   - Automatic dependency tracking
   - Cleanup functions for proper resource management

5. **Transactions**
   - Atomic updates with the transaction API (`tx`)
   - Batching multiple updates to minimize re-renders
   - Consistent state after multiple changes

6. **Time Travel**
   - Undo/redo functionality
   - State history tracking
   - Restoring to previous states

## The Task Manager App

This example implements a task management application with the following features:

- Adding, updating, and deleting tasks
- Marking tasks as complete/incomplete
- Filtering tasks (all, active, completed)
- Sorting tasks by priority, due date, or creation date
- Searching tasks by title, description, or tags
- Tracking statistics like completed/active counts

It also demonstrates how to structure a real-world application using Axion, with:

- Well-organized state structure
- Action creators for state changes
- Derived state for UI-specific data
- Effects for side operations like persistence

## Running the Example

To run this example, use the following command:

```bash
# From the root of the axion repository
bun examples/task-manager/app.ts
```

## Implementation Details

- **State Structure**: The application uses a single atom for the entire application state, with nested objects for tasks, UI state, and statistics.
- **Derived States**: Computed values for filtered task lists and statistics that update automatically.
- **Path-based Access**: Efficient updates that only modify the specific parts of state that are changing.
- **Transactions**: All complex updates are wrapped in transactions for consistency and performance.
- **Time Travel**: The application demonstrates undo/redo functionality.

## Code Architecture

The code is organized into the following sections:

1. **State Definitions**: Types and initial state setup
2. **Core State**: Main atom creation and time travel setup
3. **Derived States**: Filtered tasks and statistics
4. **Effects**: Side effects for logging, persistence, and UI updates
5. **Actions**: Functions for modifying state in a structured way
6. **Demo**: Code that demonstrates all the features working together

This architecture shows how a real-world application might be structured using Axion, with clean separation of concerns and a predictable data flow.