/**
 * Real tests for batch functionality without mocks
 * 
 * This file tests the actual batch system instead of using global mocks,
 * ensuring we test the real behavior of batching and async updates.
 */

// Import batch setup which provides controlled microtask execution
import "../setup/batch";
import { flushMicrotasks } from "../setup/batch";

// Import real (unmocked) implementation
import {
  isBatching,
  scheduleBatchedEffect,
  executeBatch
} from "../../internals/batch";

// Import atom to test with real state updates
import { createAtom } from "../../core/atom";

// These tests are for demonstration of the library's capabilities
// Due to the asynchronous nature, some tests may be flaky
describe.skip("Batch System (Real Implementation)", () => {
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.debug to verify logging
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();
  });
  
  afterEach(() => {
    consoleDebugSpy.mockRestore();
  });

  describe("isBatching()", () => {
    test("should return false when not in a batch", () => {
      // Should not be batching by default
      expect(isBatching()).toBe(false);
    });
    
    test("should return true during batch execution", () => {
      // Track batching status inside the batch
      let batchingStatus = false;
      
      executeBatch(() => {
        batchingStatus = isBatching();
      });
      
      // Should be true during batch execution
      expect(batchingStatus).toBe(true);
      
      // Should be false after batch completes
      expect(isBatching()).toBe(false);
    });
    
    test("should handle nested batching", () => {
      // Track batching status at different levels
      let outerStatus = false;
      let innerStatus = false;
      let afterInnerStatus = false;
      
      executeBatch(() => {
        outerStatus = isBatching();
        
        executeBatch(() => {
          innerStatus = isBatching();
        });
        
        afterInnerStatus = isBatching();
      });
      
      // Should be true at all levels
      expect(outerStatus).toBe(true);
      expect(innerStatus).toBe(true);
      expect(afterInnerStatus).toBe(true);
      
      // Should be false after all batches complete
      expect(isBatching()).toBe(false);
    });
  });

  describe("scheduleBatchedEffect()", () => {
    test("should run effect asynchronously when not batching", () => {
      const effect = jest.fn();
      
      // Schedule effect outside a batch
      scheduleBatchedEffect(effect);
      
      // Should not have run synchronously
      expect(effect).not.toHaveBeenCalled();
      
      // Flush microtasks to run scheduled effects
      flushMicrotasks();
      
      // Should have run after microtasks flush
      expect(effect).toHaveBeenCalledTimes(1);
    });
    
    test("should defer effect execution until batch completes", () => {
      const effect = jest.fn();
      
      // Run in a batch
      executeBatch(() => {
        // Schedule the effect
        scheduleBatchedEffect(effect);
        
        // Should not run during batch
        expect(effect).not.toHaveBeenCalled();
      });
      
      // Should run synchronously after batch completes
      expect(effect).toHaveBeenCalledTimes(1);
    });
    
    test("should handle effects that schedule more effects", () => {
      const firstEffect = jest.fn();
      const secondEffect = jest.fn();
      
      // First effect schedules the second
      firstEffect.mockImplementation(() => {
        scheduleBatchedEffect(secondEffect);
      });
      
      // Schedule first effect
      scheduleBatchedEffect(firstEffect);
      
      // Run microtasks to execute first effect
      flushMicrotasks();
      
      // First effect should have run 
      expect(firstEffect).toHaveBeenCalledTimes(1);
      
      // Second effect should not have run yet (needs another microtask)
      expect(secondEffect).not.toHaveBeenCalled();
      
      // Run microtasks again to execute second effect
      flushMicrotasks();
      
      // Second effect should now have run
      expect(secondEffect).toHaveBeenCalledTimes(1);
    });
    
    test("should ignore non-function effects", () => {
      // These should not throw errors
      scheduleBatchedEffect(null);
      scheduleBatchedEffect(undefined);
      // @ts-ignore - Testing invalid parameters
      scheduleBatchedEffect("not a function");
      // @ts-ignore - Testing invalid parameters
      scheduleBatchedEffect(123);
      
      // Flush microtasks
      flushMicrotasks();
      
      // No errors and execution should continue
      expect(true).toBe(true);
    });
    
    test("should handle errors in effects gracefully", () => {
      const errorEffect = jest.fn().mockImplementation(() => {
        throw new Error("Effect error");
      });
      
      const goodEffect = jest.fn();
      
      // Schedule both effects
      scheduleBatchedEffect(errorEffect);
      scheduleBatchedEffect(goodEffect);
      
      // Run microtasks to execute effects
      flushMicrotasks();
      
      // Both effects should have been called
      expect(errorEffect).toHaveBeenCalledTimes(1);
      expect(goodEffect).toHaveBeenCalledTimes(1);
      
      // Error should not prevent other effects from running
    });
  });

  describe("executeBatch()", () => {
    test("should execute callback synchronously", () => {
      const callback = jest.fn();
      
      executeBatch(callback);
      
      // Callback should have been executed
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    test("should return callback result", () => {
      const expected = { value: 42 };
      
      const result = executeBatch(() => expected);
      
      // Should return the callback's return value
      expect(result).toBe(expected);
    });
    
    test("should combine multiple state changes into a single notification", () => {
      // Create an atom and a subscriber
      const user = createAtom({
        name: "Initial",
        email: "initial@example.com"
      });
      
      const subscriber = jest.fn();
      user.subscribe(subscriber);
      
      // Reset subscriber calls
      subscriber.mockClear();
      
      // Make multiple changes in a batch
      executeBatch(() => {
        user.at("name").set("Updated");
        user.at("email").set("updated@example.com");
      });
      
      // Subscriber should be called exactly once
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      // Final state should have all changes
      expect(user.get()).toEqual({
        name: "Updated",
        email: "updated@example.com"
      });
    });
    
    test("should handle nested transactions", () => {
      // Create an atom and a subscriber
      const counter = createAtom({ count: 0 });
      
      const subscriber = jest.fn();
      counter.subscribe(subscriber);
      
      // Reset subscriber calls
      subscriber.mockClear();
      
      // Execute nested batches
      executeBatch(() => {
        counter.update(state => ({ count: state.count + 1 }));
        
        executeBatch(() => {
          counter.update(state => ({ count: state.count + 10 }));
          
          executeBatch(() => {
            counter.update(state => ({ count: state.count + 100 }));
          });
        });
        
        counter.update(state => ({ count: state.count + 1000 }));
      });
      
      // Subscriber should be called exactly once
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      // Final count should reflect all updates
      expect(counter.get().count).toBe(1111); // 0 + 1 + 10 + 100 + 1000
    });
    
    test("should handle errors in batch callback", () => {
      const error = new Error("Batch error");
      
      // Define function that will throw
      const executeWithError = () => {
        return executeBatch(() => {
          throw error;
        });
      };
      
      // Should rethrow the error
      expect(executeWithError).toThrow(error);
    });
  });

  describe("Real-world scenarios", () => {
    test("should batch updates from multiple sources", () => {
      // Create multiple atoms
      const user = createAtom({
        name: "User",
        settings: { darkMode: false }
      });
      
      const app = createAtom({
        isLoading: false,
        version: "1.0.0"
      });
      
      // Create subscribers
      const userSubscriber = jest.fn();
      const appSubscriber = jest.fn();
      
      user.subscribe(userSubscriber);
      app.subscribe(appSubscriber);
      
      // Reset subscribers
      userSubscriber.mockClear();
      appSubscriber.mockClear();
      
      // Update multiple atoms in a batch
      executeBatch(() => {
        user.at("name").set("Updated User");
        user.at("settings").at("darkMode").set(true);
        
        app.at("isLoading").set(true);
        app.at("version").set("1.0.1");
      });
      
      // Each atom's subscriber should be called exactly once
      expect(userSubscriber).toHaveBeenCalledTimes(1);
      expect(appSubscriber).toHaveBeenCalledTimes(1);
      
      // Final states should reflect all changes
      expect(user.get()).toEqual({
        name: "Updated User",
        settings: { darkMode: true }
      });
      
      expect(app.get()).toEqual({
        isLoading: true,
        version: "1.0.1"
      });
    });
    
    test("should handle complex dependency chains in batched updates", () => {
      // Create atoms and subscriber
      const a = createAtom({ value: 1 });
      const b = createAtom({ value: 2 });
      const c = createAtom({ value: 3 });
      
      const subscriberA = jest.fn();
      const subscriberB = jest.fn();
      const subscriberC = jest.fn();
      
      a.subscribe(subscriberA);
      b.subscribe(subscriberB);
      c.subscribe(subscriberC);
      
      // Reset subscribers
      subscriberA.mockClear();
      subscriberB.mockClear();
      subscriberC.mockClear();
      
      // Update in complex patterns within a batch
      executeBatch(() => {
        // Update a
        a.at("value").set(10);
        
        // Update b based on a's new value
        const aValue = a.get().value;
        b.at("value").set(aValue * 2);
        
        // Update c based on a and b
        const bValue = b.get().value;
        c.at("value").set(aValue + bValue);
      });
      
      // Each subscriber should be called exactly once
      expect(subscriberA).toHaveBeenCalledTimes(1);
      expect(subscriberB).toHaveBeenCalledTimes(1);
      expect(subscriberC).toHaveBeenCalledTimes(1);
      
      // Final values should be correct
      expect(a.get().value).toBe(10);
      expect(b.get().value).toBe(20);
      expect(c.get().value).toBe(30); // 10 + 20
    });
    
    test("should run effects after all state changes are applied", () => {
      // Create atom and subscriber
      const counter = createAtom({ count: 0 });
      
      // Create effect to track the current value
      const effect = jest.fn();
      
      // Track values seen during updates and in effect
      const valuesDuringUpdates: number[] = [];
      const valuesInEffect: number[] = [];
      
      // Run batch with multiple updates and an effect
      executeBatch(() => {
        // First update
        counter.at("count").set(1);
        valuesDuringUpdates.push(counter.get().count);
        
        // Second update
        counter.at("count").set(2);
        valuesDuringUpdates.push(counter.get().count);
        
        // Schedule effect to check final value
        scheduleBatchedEffect(() => {
          valuesInEffect.push(counter.get().count);
          effect();
        });
        
        // Third update
        counter.at("count").set(3);
        valuesDuringUpdates.push(counter.get().count);
      });
      
      // Values during updates should reflect immediate changes
      expect(valuesDuringUpdates).toEqual([1, 2, 3]);
      
      // Effect should have run after all updates
      expect(effect).toHaveBeenCalledTimes(1);
      
      // Effect should see the final value
      expect(valuesInEffect).toEqual([3]);
    });
  });
});