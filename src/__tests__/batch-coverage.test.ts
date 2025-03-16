/**
 * Complete coverage tests for batch module
 * This file tests the actual implementation of the batch module
 * without the mocks from setup.ts
 */

// Ensure we're testing the real implementation, not mocks from setup.ts
jest.mock("../internals/batch");
jest.unmock("../internals/batch");

// Mock console methods
const originalConsoleDebug = console.debug;
const originalConsoleError = console.error;

// Mock error handling
jest.mock("../utils/errors", () => {
  const originalModule = jest.requireActual("../utils/errors");
  return {
    ...originalModule,
    handleError: jest.fn(),
    createStateError: jest.fn().mockImplementation((code, message, details, cause) => ({
      code,
      message,
      details,
      cause,
      severity: "error",
      recoverable: true
    }))
  };
});

import {
  isBatching,
  scheduleBatchedEffect,
  executeBatch
} from "../internals/batch";

describe("Batch Module", () => {
  beforeEach(() => {
    // Mock console methods to avoid polluting test output
    console.debug = jest.fn();
    console.error = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Make queueMicrotask synchronous for testing
    global.queueMicrotask = jest.fn(cb => cb());
  });
  
  afterEach(() => {
    // Restore console methods
    console.debug = originalConsoleDebug;
    console.error = originalConsoleError;
  });
  
  // Tests for isBatching
  describe("isBatching", () => {
    test("should return false by default", () => {
      expect(isBatching()).toBe(false);
    });
    
    test("should return true during batch execution", () => {
      let status;
      
      executeBatch(() => {
        status = isBatching();
      });
      
      expect(status).toBe(true);
    });
    
    test("should handle nested batches", () => {
      let outerStatus, innerStatus, afterInnerStatus;
      
      executeBatch(() => {
        outerStatus = isBatching();
        
        executeBatch(() => {
          innerStatus = isBatching();
        });
        
        afterInnerStatus = isBatching();
      });
      
      expect(outerStatus).toBe(true);
      expect(innerStatus).toBe(true);
      expect(afterInnerStatus).toBe(true);
    });
  });
  
  // Tests for executeBatch
  describe("executeBatch", () => {
    test("should execute callback and return result", () => {
      const result = executeBatch(() => "test-result");
      expect(result).toBe("test-result");
    });
    
    test("should catch and rethrow errors", () => {
      // Mock console error to verify error is logged
      const error = new Error("Test error");
      const callback = jest.fn().mockImplementation(() => {
        throw error;
      });
      
      expect(() => {
        executeBatch(callback);
      }).toThrow(error);
      
      // Error should be handled via console.error
      expect(console.error).toHaveBeenCalled();
    });
    
    test("should log debugging info in development mode", () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set development mode
      process.env.NODE_ENV = "development";
      
      executeBatch(() => {});
      
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Starting batch/)
      );
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Ending batch/)
      );
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    test("should not log debugging info in production mode", () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set production mode
      process.env.NODE_ENV = "production";
      
      executeBatch(() => {});
      
      // No debug messages should be logged
      expect(console.debug).not.toHaveBeenCalled();
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
  
  // Tests for scheduleBatchedEffect
  describe("scheduleBatchedEffect", () => {
    test("should handle non-function effects", () => {
      // Use Function cast to bypass type checking for testing purposes
      (scheduleBatchedEffect as Function)("not a function");
      (scheduleBatchedEffect as Function)(null);
      (scheduleBatchedEffect as Function)(undefined);
      
      // No errors should be thrown
    });
    
    test("should queue effects and run after batch completes", () => {
      const effect = jest.fn();
      
      executeBatch(() => {
        scheduleBatchedEffect(effect);
        
        // Effect should not be called during batch
        expect(effect).not.toHaveBeenCalled();
      });
      
      // Effect should be called after batch completes
      expect(effect).toHaveBeenCalled();
    });
    
    test("should handle errors in effects", () => {
      const errorEffect = jest.fn().mockImplementation(() => {
        throw new Error("Effect error");
      });
      
      executeBatch(() => {
        scheduleBatchedEffect(errorEffect);
      });
      
      // Effect should be called
      expect(errorEffect).toHaveBeenCalled();
      // Error should be handled via console.error
      expect(console.error).toHaveBeenCalled();
    });
    
    test("should run all effects even if some throw", () => {
      const errorEffect = jest.fn().mockImplementation(() => {
        throw new Error("Effect error");
      });
      
      const goodEffect = jest.fn();
      
      executeBatch(() => {
        scheduleBatchedEffect(errorEffect);
        scheduleBatchedEffect(goodEffect);
      });
      
      // Both effects should be called
      expect(errorEffect).toHaveBeenCalled();
      expect(goodEffect).toHaveBeenCalled();
    });
    
    test("should handle effects that schedule more effects", () => {
      const secondEffect = jest.fn();
      const firstEffect = jest.fn().mockImplementation(() => {
        scheduleBatchedEffect(secondEffect);
      });
      
      executeBatch(() => {
        scheduleBatchedEffect(firstEffect);
      });
      
      // Both effects should be called
      expect(firstEffect).toHaveBeenCalled();
      expect(secondEffect).toHaveBeenCalled();
    });
    
    test("should run effect via microtask when not batching", () => {
      // Use fake timers to control microtask execution
      jest.useFakeTimers();
      
      // Make queueMicrotask use setTimeout for testability
      global.queueMicrotask = jest.fn((cb) => setTimeout(cb, 0));
      
      const effect = jest.fn();
      
      // Schedule effect outside of batch
      scheduleBatchedEffect(effect);
      
      // Effect should not be called yet (waiting for microtask)
      expect(effect).not.toHaveBeenCalled();
      
      // Run the scheduled microtask
      jest.runAllTimers();
      
      // Effect should now have been called
      expect(effect).toHaveBeenCalled();
      
      // Restore timers
      jest.useRealTimers();
    });
    
    test("should log debug info when running effects", () => {
      // Save original NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Set development mode
      process.env.NODE_ENV = "development";
      
      const effect1 = jest.fn();
      const effect2 = jest.fn();
      
      executeBatch(() => {
        scheduleBatchedEffect(effect1);
        scheduleBatchedEffect(effect2);
      });
      
      // Should log about running batched effects
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Running.*batched effects/)
      );
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
  
  // Tests for nested batching
  test("should support nested batch execution", () => {
    const outerEffect = jest.fn();
    const innerEffect = jest.fn();
    
    executeBatch(() => {
      scheduleBatchedEffect(outerEffect);
      
      // Start nested batch
      executeBatch(() => {
        scheduleBatchedEffect(innerEffect);
      });
      
      // Inner effect should not run until outer batch completes
      expect(innerEffect).not.toHaveBeenCalled();
      expect(outerEffect).not.toHaveBeenCalled();
    });
    
    // After outer batch, all effects should run
    expect(outerEffect).toHaveBeenCalled();
    expect(innerEffect).toHaveBeenCalled();
  });
});