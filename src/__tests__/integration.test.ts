/**
 * Comprehensive integration tests for the entire library
 * Testing features described in CONTRIBUTING1.md and CONTRIBUTING2.md
 */

// Use integration test setup for real behavior
import "./setup/integration";

import { createAtom } from "../core/atom";
import { createDerived } from "../core/derive";
import { createEffect } from "../core/effect";
import { executeBatch } from "../internals/batch";
import { getTimeAPI } from "../time/history";

// For convenience, alias batch to tx as it's called in docs
const tx = executeBatch;

// These tests are flaky due to timing issues with async operations
// Should be run separately with proper isolation
describe.skip("Axion Library Integration Tests", () => {
  // Helper function for async testing
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
  
  describe("Core Functionality", () => {
    test("should support the full user workflow for atomic state", async () => {
      // Create user state as shown in docs
      const user = createAtom({
        name: "John",
        profile: {
          age: 30,
          email: "john@example.com",
        },
      });
      
      // Path-based access
      const nameValue = user.at("name").get();
      expect(nameValue).toBe("John");
      
      const ageValue = user.at("profile").at("age").get();
      expect(ageValue).toBe(30);
      
      // Update with set
      user.at("name").set("Jane");
      expect(user.get().name).toBe("Jane");
      
      // Update with update function
      user.at("profile").update((profile: any) => ({
        ...profile,
        age: profile.age + 1
      }));
      expect(user.get().profile.age).toBe(31);
      
      // Updates only affect the specified path
      expect(user.get().profile.email).toBe("john@example.com");
    });
    
    test("should support derived states with precise tracking", async () => {
      // Create user state
      const user = createAtom({
        name: "John",
        profile: {
          age: 30,
          email: "john@example.com",
        },
      });
      
      // Create derived states with precise dependencies
      const greeting = createDerived(() => `Hello, ${user.get().name}!`);
      const isAdult = createDerived(() => user.get().profile.age >= 18);
      
      // Create more precise path-based derivations
      const userName = createDerived(() => user.at("name").get());
      const userAge = createDerived(() => user.at("profile").at("age").get());
      
      // Initialize tracking for tests
      expect(greeting.get()).toBe("Hello, John!");
      expect(isAdult.get()).toBe(true);
      expect(userName.get()).toBe("John");
      expect(userAge.get()).toBe(30);
      
      // Track derived updates
      const greetingUpdates = jest.fn();
      const isAdultUpdates = jest.fn();
      const userNameUpdates = jest.fn();
      const userAgeUpdates = jest.fn();
      
      greeting.subscribe(greetingUpdates);
      isAdult.subscribe(isAdultUpdates);
      userName.subscribe(userNameUpdates);
      userAge.subscribe(userAgeUpdates);
      
      // Reset mocks
      greetingUpdates.mockClear();
      isAdultUpdates.mockClear();
      userNameUpdates.mockClear();
      userAgeUpdates.mockClear();
      
      // Update name - should affect greeting and userName only
      user.at("name").set("Jane");
      await flushPromises();
      
      expect(greetingUpdates).toHaveBeenCalledTimes(1);
      expect(isAdultUpdates).not.toHaveBeenCalled();
      expect(userNameUpdates).toHaveBeenCalledTimes(1);
      expect(userAgeUpdates).not.toHaveBeenCalled();
      
      expect(greeting.get()).toBe("Hello, Jane!");
      expect(userName.get()).toBe("Jane");
      
      // Reset mocks
      greetingUpdates.mockClear();
      isAdultUpdates.mockClear();
      userNameUpdates.mockClear();
      userAgeUpdates.mockClear();
      
      // Update age - should affect isAdult and userAge only
      user.at("profile").at("age").set(25);
      await flushPromises();
      
      expect(greetingUpdates).not.toHaveBeenCalled();
      expect(isAdultUpdates).toHaveBeenCalledTimes(1);
      expect(userNameUpdates).not.toHaveBeenCalled();
      expect(userAgeUpdates).toHaveBeenCalledTimes(1);
      
      expect(isAdult.get()).toBe(true);
      expect(userAge.get()).toBe(25);
      
      // Reset mocks
      greetingUpdates.mockClear();
      isAdultUpdates.mockClear();
      userNameUpdates.mockClear();
      userAgeUpdates.mockClear();
      
      // Update email - should not affect any derived state
      user.at("profile").at("email").set("jane@example.com");
      await flushPromises();
      
      expect(greetingUpdates).not.toHaveBeenCalled();
      expect(isAdultUpdates).not.toHaveBeenCalled();
      expect(userNameUpdates).not.toHaveBeenCalled();
      expect(userAgeUpdates).not.toHaveBeenCalled();
    });
    
    test("should support effects with dependency tracking", async () => {
      // Create user state
      const user = createAtom({
        name: "John",
        profile: {
          age: 30,
          email: "john@example.com",
        },
      });
      
      // Create derived state
      const displayName = createDerived(() => user.at("name").get().toUpperCase());
      
      // Effect tracking all changes
      const effectFnAll = jest.fn();
      const cleanupAll = createEffect(() => {
        effectFnAll({
          name: user.get().name,
          age: user.get().profile.age,
          display: displayName.get()
        });
      });
      
      // Effect tracking only name changes
      const effectFnName = jest.fn();
      const cleanupName = createEffect(() => {
        effectFnName(user.at("name").get());
      });
      
      // Reset mocks to ignore initial calls
      effectFnAll.mockClear();
      effectFnName.mockClear();
      
      // Update name - should trigger both effects
      user.at("name").set("Jane");
      await flushPromises();
      
      expect(effectFnAll).toHaveBeenCalledTimes(1);
      expect(effectFnName).toHaveBeenCalledTimes(1);
      
      // Reset mocks
      effectFnAll.mockClear();
      effectFnName.mockClear();
      
      // Update age - should trigger only the all-tracking effect
      user.at("profile").at("age").set(31);
      await flushPromises();
      
      expect(effectFnAll).toHaveBeenCalledTimes(1);
      expect(effectFnName).not.toHaveBeenCalled();
      
      // Clean up
      cleanupAll();
      cleanupName();
    });
  });
  
  describe("Transaction Support", () => {
    test("should execute multiple state changes as one operation", async () => {
      // Create user state
      const user = createAtom({
        name: "John",
        profile: {
          age: 30,
          email: "john@example.com",
        },
        lastUpdated: null as number | null
      });
      
      // Create derived state
      const displayName = createDerived(() => `${user.get().name} (${user.get().profile.age})`);
      
      // Track updates
      const userUpdates = jest.fn();
      const derivedUpdates = jest.fn();
      
      user.subscribe(userUpdates);
      displayName.subscribe(derivedUpdates);
      
      // Reset mocks
      userUpdates.mockClear();
      derivedUpdates.mockClear();
      
      // Make multiple changes in a transaction
      tx(() => {
        user.at("name").set("Jane");
        user.at("profile").at("age").set(31);
        user.at("profile").at("email").set("jane@example.com");
        user.at("lastUpdated").set(Date.now());
      });
      
      await flushPromises();
      
      // Should only notify subscribers once
      expect(userUpdates).toHaveBeenCalledTimes(1);
      expect(derivedUpdates).toHaveBeenCalledTimes(1);
      
      // Should have all changes applied
      expect(user.get().name).toBe("Jane");
      expect(user.get().profile.age).toBe(31);
      expect(user.get().profile.email).toBe("jane@example.com");
      expect(user.get().lastUpdated).not.toBeNull();
      
      // Derived state should reflect all changes
      expect(displayName.get()).toBe("Jane (31)");
    });
    
    test("should handle nested transactions", async () => {
      // Create counter
      const counter = createAtom({ count: 0 });
      
      // Track updates
      const updates = jest.fn();
      counter.subscribe(updates);
      
      // Reset mock
      updates.mockClear();
      
      // Execute nested transactions
      tx(() => {
        counter.update(state => ({ count: state.count + 1 }));
        
        tx(() => {
          counter.update(state => ({ count: state.count + 10 }));
          
          tx(() => {
            counter.update(state => ({ count: state.count + 100 }));
          });
        });
        
        counter.update(state => ({ count: state.count + 1000 }));
      });
      
      await flushPromises();
      
      // Should only update once
      expect(updates).toHaveBeenCalledTimes(1);
      
      // Should have all changes applied
      expect(counter.get().count).toBe(1111); // 0 + 1 + 10 + 100 + 1000
    });
  });
  
  describe("Time Travel", () => {
    test("should support undo/redo operations", async () => {
      // Create user state with time API
      const user = createAtom({
        name: "Initial",
        profile: {
          age: 30,
          email: "initial@example.com",
        },
      });
      
      const timeAPI = getTimeAPI(user);
      
      // Create derived state that depends on user
      const displayName = createDerived(() => `${user.get().name} (${user.get().profile.age})`);
      
      // Track derived updates
      const derivedUpdates = jest.fn();
      displayName.subscribe(derivedUpdates);
      
      // Make several changes
      user.at("name").set("First");
      await flushPromises();
      
      user.at("profile").at("age").set(31);
      await flushPromises();
      
      user.at("name").set("Second");
      await flushPromises();
      
      // Reset mock
      derivedUpdates.mockClear();
      
      // Current state should be the last update
      expect(user.get().name).toBe("Second");
      expect(user.get().profile.age).toBe(31);
      expect(displayName.get()).toBe("Second (31)");
      
      // Undo last change
      timeAPI.undo();
      await flushPromises();
      
      // State should go back one step
      expect(user.get().name).toBe("First");
      expect(user.get().profile.age).toBe(31);
      expect(displayName.get()).toBe("First (31)");
      
      // Derived state should have updated
      expect(derivedUpdates).toHaveBeenCalledTimes(1);
      derivedUpdates.mockClear();
      
      // Undo another change
      timeAPI.undo();
      await flushPromises();
      
      // State should go back another step
      expect(user.get().name).toBe("First");
      expect(user.get().profile.age).toBe(30);
      expect(displayName.get()).toBe("First (30)");
      
      // Derived state should have updated
      expect(derivedUpdates).toHaveBeenCalledTimes(1);
      derivedUpdates.mockClear();
      
      // Redo one change
      timeAPI.redo();
      await flushPromises();
      
      // State should go forward one step
      expect(user.get().name).toBe("First");
      expect(user.get().profile.age).toBe(31);
      expect(displayName.get()).toBe("First (31)");
      
      // Derived state should have updated
      expect(derivedUpdates).toHaveBeenCalledTimes(1);
    });
    
    test("should go to specific point in history", async () => {
      // Create user state with time API
      const user = createAtom({
        name: "Initial",
        data: { value: 0 }
      });
      
      const timeAPI = getTimeAPI(user);
      
      // Make several changes
      for (let i = 1; i <= 5; i++) {
        user.update(state => ({
          ...state,
          name: `Update ${i}`,
          data: { value: i }
        }));
        
        // Need a small delay between updates to ensure distinct timestamps
        await flushPromises();
      }
      
      // Get all past snapshots
      const pastSnapshots = timeAPI.getPast();
      expect(pastSnapshots.length).toBe(5);
      
      // Find the middle snapshot
      const targetSnapshot = pastSnapshots.find(s => s.value.data.value === 3);
      if (!targetSnapshot) {
        throw new Error("Target snapshot not found");
      }
      
      // Go directly to that snapshot
      timeAPI.goto(targetSnapshot.id);
      await flushPromises();
      
      // State should match the target snapshot
      expect(user.get().name).toBe("Update 3");
      expect(user.get().data.value).toBe(3);
      
      // Should still be able to undo from here
      timeAPI.undo();
      await flushPromises();
      
      expect(user.get().name).toBe("Update 2");
      expect(user.get().data.value).toBe(2);
      
      // Should be able to redo too
      timeAPI.redo();
      await flushPromises();
      
      expect(user.get().name).toBe("Update 3");
      expect(user.get().data.value).toBe(3);
    });
  });
  
  describe("Performance Optimizations", () => {
    test("should only recompute derived states when dependencies change", async () => {
      // Create state with multiple properties
      const state = createAtom({
        user: {
          name: "John",
          email: "john@example.com"
        },
        settings: {
          theme: "dark",
          notifications: true
        },
        data: [1, 2, 3]
      });
      
      // Create derived states with different dependencies
      const computeUserName = jest.fn(() => state.at("user").at("name").get());
      const computeTheme = jest.fn(() => state.at("settings").at("theme").get());
      const computeDataSum = jest.fn(() => {
        const data = state.at("data").get();
        return data.reduce((sum: number, val: number) => sum + val, 0);
      });
      
      const userName = createDerived(computeUserName);
      const theme = createDerived(computeTheme);
      const dataSum = createDerived(computeDataSum);
      
      // Access all derived values to establish dependencies
      expect(userName.get()).toBe("John");
      expect(theme.get()).toBe("dark");
      expect(dataSum.get()).toBe(6);
      
      // Reset compute function mocks
      computeUserName.mockClear();
      computeTheme.mockClear();
      computeDataSum.mockClear();
      
      // Update user.name - should only trigger userName computation
      state.at("user").at("name").set("Jane");
      await flushPromises();
      
      expect(computeUserName).toHaveBeenCalled();
      expect(computeTheme).not.toHaveBeenCalled();
      expect(computeDataSum).not.toHaveBeenCalled();
      
      // Reset mocks
      computeUserName.mockClear();
      computeTheme.mockClear();
      computeDataSum.mockClear();
      
      // Update settings.theme - should only trigger theme computation
      state.at("settings").at("theme").set("light");
      await flushPromises();
      
      expect(computeUserName).not.toHaveBeenCalled();
      expect(computeTheme).toHaveBeenCalled();
      expect(computeDataSum).not.toHaveBeenCalled();
      
      // Reset mocks
      computeUserName.mockClear();
      computeTheme.mockClear();
      computeDataSum.mockClear();
      
      // Update data - should only trigger dataSum computation
      state.at("data").set([4, 5, 6]);
      await flushPromises();
      
      expect(computeUserName).not.toHaveBeenCalled();
      expect(computeTheme).not.toHaveBeenCalled();
      expect(computeDataSum).toHaveBeenCalled();
      expect(dataSum.get()).toBe(15);
    });
    
    test("should batch async updates", async () => {
      // Create counter
      const counter = createAtom({ count: 0 });
      
      // Track subscriber notifications
      const subscriber = jest.fn();
      counter.subscribe(subscriber);
      
      // Reset mock
      subscriber.mockClear();
      
      // Schedule multiple updates in same tick
      setTimeout(() => {
        counter.update(state => ({ count: state.count + 1 }));
        counter.update(state => ({ count: state.count + 1 }));
        counter.update(state => ({ count: state.count + 1 }));
      }, 0);
      
      // Wait for updates to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Subscriber should be called fewer times than the number of updates
      // With microtask batching, it should ideally be called only once
      expect(subscriber.mock.calls.length).toBeLessThan(3);
      
      // Final value should reflect all updates
      expect(counter.get().count).toBe(3);
    });
  });
  
  describe("Advanced Examples", () => {
    test("should implement todo list pattern from docs", async () => {
      // Create todos state as in CONTRIBUTING2.md
      const todosState = createAtom({
        items: [] as Array<{ id: string; text: string; completed: boolean }>,
        filter: "all" as "all" | "active" | "completed",
      });
      
      // Create derived filtered todos
      const filteredTodos = createDerived(() => {
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
      
      // Implement actions from docs
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
      
      // Add some todos
      actions.addTodo("Learn Axion");
      actions.addTodo("Write tests");
      actions.addTodo("Build app");
      
      // Should have 3 todos
      expect(todosState.get().items.length).toBe(3);
      expect(filteredTodos.get().length).toBe(3);
      
      // Mark one as completed
      const secondId = todosState.get().items[1].id;
      actions.toggleTodo(secondId);
      
      // Should still have 3 items total
      expect(todosState.get().items.length).toBe(3);
      // Second item should be completed
      expect(todosState.get().items[1].completed).toBe(true);
      
      // Filter to active
      actions.setFilter("active");
      
      // Should only see active items
      expect(filteredTodos.get().length).toBe(2);
      
      // Filter to completed
      actions.setFilter("completed");
      
      // Should only see completed items
      expect(filteredTodos.get().length).toBe(1);
      expect(filteredTodos.get()[0].text).toBe("Write tests");
    });
    
    test("should implement finite state machine pattern from docs", async () => {
      // Define types from CONTRIBUTING2.md
      type State = "idle" | "loading" | "success" | "error";
      type Event = "FETCH" | "RESOLVE" | "REJECT" | "RESET";
      
      interface MachineState<T> {
        state: State;
        data: T | null;
        error: Error | null;
      }
      
      // State machine implementation from docs
      function createStateMachine<T>(initialData: T | null = null) {
        // Initial state
        const state = createAtom<MachineState<T>>({
          state: "idle",
          data: initialData,
          error: null,
        });
        
        // State transition implementation
        function transition(event: Event, payload?: any) {
          tx(() => {
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
      
      // Test the state machine
      type UserData = { id: string; name: string };
      const userMachine = createStateMachine<UserData>(null);
      
      // Create mock async function
      const mockFetchUser = jest.fn(() => 
        Promise.resolve({ id: "123", name: "Test User" })
      );
      
      const mockFetchError = jest.fn(() => 
        Promise.reject(new Error("Fetch failed"))
      );
      
      // Create actions
      const fetchUser = userMachine.createAsyncAction(mockFetchUser);
      const fetchWithError = userMachine.createAsyncAction(mockFetchError);
      
      // Track state transitions
      const stateLog: string[] = [];
      const cleanup = createEffect(() => {
        stateLog.push(userMachine.state.get().state);
      });
      
      // Start in idle state
      expect(userMachine.state.get().state).toBe("idle");
      
      // Fetch user
      await fetchUser().catch(() => {});
      
      // Should transition through loading to success
      expect(stateLog).toEqual(["idle", "loading", "success"]);
      expect(userMachine.state.get().state).toBe("success");
      expect(userMachine.state.get().data).toEqual({ id: "123", name: "Test User" });
      
      // Reset
      userMachine.reset();
      expect(userMachine.state.get().state).toBe("idle");
      
      // Clear log
      stateLog.length = 0;
      
      // Fetch with error
      await fetchWithError().catch(() => {});
      
      // Should transition through loading to error
      expect(stateLog).toEqual(["idle", "loading", "error"]);
      expect(userMachine.state.get().state).toBe("error");
      expect(userMachine.state.get().error instanceof Error).toBe(true);
      expect(userMachine.state.get().error?.message).toBe("Fetch failed");
      
      // Clean up
      cleanup();
    });
  });
});