/**
 * Extended coverage tests for utility modules
 */

import { structuralClone, deepClone } from "../../utils/clone";
import { computeHash, hashObject } from "../../utils/hash";
import * as errors from "../../utils/errors";
import * as pathUtils from "../../utils/path";

describe("Extended Utils Coverage", () => {
  describe("Clone Utilities", () => {
    test("should handle all data types in deep clone", () => {
      // Create a complex object with various types
      const original = {
        string: "test",
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        date: new Date(2023, 0, 1),
        regex: /test/g,
        array: [1, 2, 3],
        map: new Map([["key", "value"]]),
        set: new Set([1, 2, 3]),
        nested: {
          deep: {
            value: "nested"
          }
        },
        circular: {} as any
      };
      
      // Add circular reference
      original.circular = original;
      
      // Clone the object
      const cloned = deepClone(original);
      
      // Check primitive types
      expect(cloned.string).toBe("test");
      expect(cloned.number).toBe(42);
      expect(cloned.boolean).toBe(true);
      expect(cloned.null).toBeNull();
      expect(cloned.undefined).toBeUndefined();
      
      // Check complex types
      expect(cloned.date instanceof Date).toBe(true);
      expect(cloned.date.getTime()).toBe(original.date.getTime());
      
      expect(cloned.regex instanceof RegExp).toBe(true);
      expect(cloned.regex.source).toBe("test");
      expect(cloned.regex.flags).toBe("g");
      
      expect(Array.isArray(cloned.array)).toBe(true);
      expect(cloned.array).toEqual([1, 2, 3]);
      
      // Maps and Sets should also be cloned
      expect(cloned.map instanceof Map).toBe(true);
      expect(cloned.set instanceof Set).toBe(true);
      expect(cloned.map.get("key")).toBe("value");
      expect(cloned.set.has(2)).toBe(true);
      
      // Nested objects should be deep cloned
      expect(cloned.nested.deep.value).toBe("nested");
      
      // Original and clone should be different objects
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.deep).not.toBe(original.nested.deep);
      
      // Circular references should be preserved
      expect(cloned.circular).toBe(cloned);
    });
    
    test("should handle arrays in structural clone", () => {
      const original = [1, 2, [3, 4]];
      const cloned = structuralClone(original);
      
      expect(Array.isArray(cloned)).toBe(true);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });
    
    test("should handle edge cases in clone", () => {
      // Handle primitive values
      expect(structuralClone(42)).toBe(42);
      expect(structuralClone("string")).toBe("string");
      expect(structuralClone(true)).toBe(true);
      expect(structuralClone(null)).toBeNull();
      expect(structuralClone(undefined)).toBeUndefined();
      
      // Handle empty objects and arrays
      expect(structuralClone({})).toEqual({});
      expect(structuralClone([])).toEqual([]);
    });
  });
  
  describe("Hash Utilities", () => {
    test("should compute consistent hashes for the same value", () => {
      const value = { foo: "bar", nested: { array: [1, 2, 3] } };
      
      const hash1 = computeHash(value);
      const hash2 = computeHash(value);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBeGreaterThan(0);
    });
    
    test("should generate different hashes for different values", () => {
      const value1 = { foo: "bar" };
      const value2 = { foo: "baz" };
      
      const hash1 = computeHash(value1);
      const hash2 = computeHash(value2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    test("should handle non-object values in hashObject", () => {
      // String
      expect(hashObject("string")).toBeDefined();
      
      // Number
      expect(hashObject(42)).toBeDefined();
      
      // Boolean
      expect(hashObject(true)).toBeDefined();
      
      // Null and undefined
      expect(hashObject(null)).toBeDefined();
      expect(hashObject(undefined)).toBeDefined();
      
      // Array
      expect(hashObject([1, 2, 3])).toBeDefined();
    });
    
    test("should hash circular references without infinite loops", () => {
      const circular = {} as any;
      circular.self = circular;
      
      // Should not stack overflow
      const hash = computeHash(circular);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
  });
  
  describe("Error Utilities", () => {
    test("should create various types of errors", () => {
      // Test all error factory functions
      const stateError = errors.createStateError(
        errors.ErrorCode.UNKNOWN,
        "State error"
      );
      
      const derivationError = errors.createDerivationError(
        "Derived error"
      );
      
      // Create a time error correctly
      const timeError = new errors.TimeError(
        errors.ErrorCode.INVALID_SNAPSHOT,
        "Time error"
      );
      
      const pathError = errors.createPathError(
        errors.ErrorCode.INVALID_PATH,
        ["some", "invalid", "path"],
        "Path error"
      );
      
      const depError = errors.createDependencyError(
        errors.ErrorCode.DEPENDENCY_ERROR,
        "Dependency error"
      );
      
      // Check error properties
      expect(stateError.code).toBe(errors.ErrorCode.UNKNOWN);
      expect(stateError.message).toContain("State error");
      expect(stateError.name).toBe("StateError");
      
      expect(derivationError.code).toBe(errors.ErrorCode.DERIVATION_ERROR);
      expect(derivationError.message).toContain("Derived error");
      expect(derivationError.name).toBe("DerivationError");
      
      expect(timeError.code).toBe(errors.ErrorCode.INVALID_SNAPSHOT);
      expect(timeError.message).toContain("Time error");
      expect(timeError.name).toBe("TimeError");
      
      expect(pathError.code).toBe(errors.ErrorCode.INVALID_PATH);
      expect(pathError.message).toContain("Invalid path");
      expect(pathError.name).toBe("PathError");
      
      expect(depError.code).toBe(errors.ErrorCode.DEPENDENCY_ERROR);
      expect(depError.message).toContain("Dependency error");
      expect(depError.name).toBe("DependencyError");
    });
    
    test("should add original error as cause", () => {
      const originalError = new Error("Original error");
      
      const error = errors.createStateError(
        errors.ErrorCode.UNKNOWN,
        "Wrapper error",
        undefined,
        originalError
      );
      
      // Message format is "[CODE] message"
      expect(error.message).toContain("Wrapper error");
      expect(error.cause).toBe(originalError);
    });
    
    test("should handle error with context", () => {
      // Create a custom error with additional metadata
      const error = errors.createStateError(
        errors.ErrorCode.UNKNOWN,
        "Error with context"
      );
      
      // We can't add context directly with the current API,
      // but we can check that the message is correctly set
      expect(error.message).toContain("Error with context");
    });
    
    test("should use custom error handler", () => {
      const customHandler = jest.fn();
      
      // Store the original handler so we can restore it
      const originalHandler = jest.spyOn(errors, 'setErrorHandler').getMockImplementation();
      
      try {
        // Set custom handler
        errors.setErrorHandler(customHandler);
        
        // Create and handle an error
        const error = errors.createStateError(
          errors.ErrorCode.UNKNOWN,
          "Test error"
        );
        
        errors.handleError(error);
        
        // Handler should be called with the error
        expect(customHandler).toHaveBeenCalledWith(error);
      } finally {
        // Restore the original handler implementation
        jest.spyOn(errors, 'setErrorHandler').mockRestore();
        
        // Set the default handler back (using an inline function that matches the type)
        if (originalHandler) {
          errors.setErrorHandler((error) => {
            console.error(`[Axion] ${error.message}`, error.cause || "");
            if (error.severity === "fatal" && !error.recoverable) {
              throw error;
            }
          });
        }
      }
    });
    
    test("should use default error handler if none specified", () => {
      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Store the original handler so we can restore it
      const restoreSpy = jest.spyOn(errors, 'handleError');
      
      try {
        // Create and handle an error
        const error = errors.createStateError(
          errors.ErrorCode.UNKNOWN,
          "Test error"
        );
        
        errors.handleError(error);
        
        // Default handler should log to console
        expect(console.error).toHaveBeenCalled();
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
        restoreSpy.mockRestore();
      }
    });
    
    test("should handle fatal errors", () => {
      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        // Create a circular dependency error which is fatal and non-recoverable
        const circularError = new errors.CircularDependencyError(
          "Fatal circular dependency detected",
          [Symbol("atom1"), Symbol("atom2")]
        );
        
        // This should throw
        expect(() => {
          errors.handleError(circularError);
        }).toThrow();
        
        // Console error should be called before throwing
        expect(console.error).toHaveBeenCalled();
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });
    
    test("should register type-specific error handlers", () => {
      const stateErrorHandler = jest.fn();
      const pathErrorHandler = jest.fn();
      
      // Register handlers for specific error types
      const unregisterState = errors.registerErrorHandler("StateError", stateErrorHandler);
      const unregisterPath = errors.registerErrorHandler("PathError", pathErrorHandler);
      
      try {
        // Create and handle a state error
        const stateError = errors.createStateError(
          errors.ErrorCode.STATE_ERROR,
          "State error"
        );
        
        errors.handleError(stateError);
        
        // Create and handle a path error
        const pathError = errors.createPathError(
          errors.ErrorCode.PATH_ERROR,
          ["foo"],
          "Path error"
        );
        
        errors.handleError(pathError);
        
        // Each handler should only be called for its specific error type
        expect(stateErrorHandler).toHaveBeenCalledWith(stateError);
        expect(stateErrorHandler).not.toHaveBeenCalledWith(pathError);
        
        expect(pathErrorHandler).toHaveBeenCalledWith(pathError);
        expect(pathErrorHandler).not.toHaveBeenCalledWith(stateError);
        
        // Test unregistering
        unregisterState();
        
        // Mock console.error for testing default handler
        const originalConsoleError = console.error;
        console.error = jest.fn();
        
        try {
          // Create a new state error - should use default handler now
          const newStateError = errors.createStateError(
            errors.ErrorCode.STATE_ERROR,
            "Another state error"
          );
          
          errors.handleError(newStateError);
          
          // State handler shouldn't be called again
          expect(stateErrorHandler).not.toHaveBeenCalledWith(newStateError);
          
          // Default handler should be used instead
          expect(console.error).toHaveBeenCalled();
        } finally {
          console.error = originalConsoleError;
        }
      } finally {
        // Clean up by unregistering handlers
        unregisterState();
        unregisterPath();
      }
    });
    
    test("should handle all error types through createError", () => {
      // Test the legacy createError function for all error codes
      const stateError = errors.createError(errors.ErrorCode.STATE_ERROR, "State error");
      expect(stateError).toBeInstanceOf(errors.StateError);
      
      const atomNotFoundError = errors.createError(errors.ErrorCode.ATOM_NOT_FOUND, "Atom not found");
      expect(atomNotFoundError).toBeInstanceOf(errors.StateError);
      
      const pathError = errors.createError(errors.ErrorCode.PATH_ERROR, "Path error");
      expect(pathError).toBeInstanceOf(errors.PathError);
      
      const invalidPathError = errors.createError(errors.ErrorCode.INVALID_PATH, "Invalid path");
      expect(invalidPathError).toBeInstanceOf(errors.PathError);
      
      const dependencyError = errors.createError(errors.ErrorCode.DEPENDENCY_ERROR, "Dependency error");
      expect(dependencyError).toBeInstanceOf(errors.DependencyError);
      
      const derivationError = errors.createError(errors.ErrorCode.DERIVATION_ERROR, "Derivation error");
      expect(derivationError).toBeInstanceOf(errors.DerivationError);
      
      const timeError = errors.createError(errors.ErrorCode.TIME_ERROR, "Time error");
      expect(timeError).toBeInstanceOf(errors.TimeError);
      
      const snapshotError = errors.createError(errors.ErrorCode.INVALID_SNAPSHOT, "Invalid snapshot");
      expect(snapshotError).toBeInstanceOf(errors.TimeError);
      
      // Default case should create a StateError
      const unknownError = errors.createError(errors.ErrorCode.UNKNOWN, "Unknown error");
      expect(unknownError).toBeInstanceOf(errors.StateError);
      
      const transactionError = errors.createError(errors.ErrorCode.TRANSACTION_ERROR, "Transaction error");
      expect(transactionError).toBeInstanceOf(errors.StateError);
    });
    
    test("should get dependency cycle visualization", () => {
      const atom1 = Symbol("atom1");
      const atom2 = Symbol("atom2");
      const atom3 = Symbol("atom3");
      
      const cycle = [atom1, atom2, atom3];
      
      const circularError = new errors.CircularDependencyError(
        "Circular dependency detected",
        cycle
      );
      
      const depGraph = circularError.getDepGraph();
      
      // Should contain a string representation of the cycle
      expect(depGraph).toContain("Symbol(atom1)");
      expect(depGraph).toContain("Symbol(atom2)");
      expect(depGraph).toContain("Symbol(atom3)");
      expect(depGraph).toContain("->");
    });
    
    test("should test all error severities and recoverability", () => {
      const stateError = errors.createStateError(errors.ErrorCode.STATE_ERROR, "State error");
      expect(stateError.severity).toBe("error");
      expect(stateError.recoverable).toBe(false);
      
      const pathError = errors.createPathError(errors.ErrorCode.PATH_ERROR, ["path"], "Path error");
      expect(pathError.severity).toBe("warning");
      expect(pathError.recoverable).toBe(true);
      
      const depError = errors.createDependencyError(errors.ErrorCode.DEPENDENCY_ERROR, "Dep error");
      expect(depError.severity).toBe("error");
      expect(depError.recoverable).toBe(false);
      
      const circularError = new errors.CircularDependencyError("Circular", [Symbol("atom")]);
      expect(circularError.severity).toBe("fatal");
      expect(circularError.recoverable).toBe(false);
      
      const derivationError = errors.createDerivationError("Derivation error");
      expect(derivationError.severity).toBe("error");
      expect(derivationError.recoverable).toBe(true);
      
      const timeError = errors.createTimeError(errors.ErrorCode.TIME_ERROR, "Time error");
      expect(timeError.severity).toBe("warning");
      expect(timeError.recoverable).toBe(true);
    });
    
    test("should test pathError getValidPath", () => {
      const pathError = errors.createPathError(
        errors.ErrorCode.INVALID_PATH,
        ["invalid", "path"],
        "Invalid path"
      );
      
      // Should return empty path as fallback
      const validPath = pathError.getValidPath();
      expect(validPath).toEqual([]);
    });
    
    test("should handle logError (deprecated)", () => {
      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      try {
        const error = errors.createStateError(errors.ErrorCode.UNKNOWN, "Test error");
        
        // Use deprecated logError
        const result = errors.logError(error);
        
        // Should log the error
        expect(console.error).toHaveBeenCalled();
        
        // Should return the same error (for chaining)
        expect(result).toBe(error);
      } finally {
        console.error = originalConsoleError;
      }
    });
  });
  
  describe("Path Utilities", () => {
    test("should normalize paths", () => {
      // Test various path formats
      expect(pathUtils.normalizePath("foo")).toEqual(["foo"]);
      expect(pathUtils.normalizePath("foo.bar")).toEqual(["foo", "bar"]);
      expect(pathUtils.normalizePath(["foo", "bar"])).toEqual(["foo", "bar"]);
      expect(pathUtils.normalizePath(["foo.bar"])).toEqual(["foo", "bar"]);
      
      // Empty path
      expect(pathUtils.normalizePath("")).toEqual([]);
      expect(pathUtils.normalizePath([])).toEqual([]);
    });
    
    test("should stringify paths", () => {
      expect(pathUtils.stringifyPath(["foo", "bar"])).toBe("foo.bar");
      expect(pathUtils.stringifyPath([])).toBe("");
    });
    
    test("should get nested values by path", () => {
      const obj = {
        foo: {
          bar: {
            baz: 42
          }
        },
        array: [1, 2, 3]
      };
      
      // Test various paths
      expect(pathUtils.getValueAtPath(obj, ["foo", "bar", "baz"])).toBe(42);
      expect(pathUtils.getValueAtPath(obj, ["foo", "bar"])).toEqual({ baz: 42 });
      expect(pathUtils.getValueAtPath(obj, ["array", "1"])).toBe(2);
      
      // Empty path should return the object itself
      expect(pathUtils.getValueAtPath(obj, [])).toBe(obj);
      
      // Non-existent path should return undefined
      expect(pathUtils.getValueAtPath(obj, ["nonexistent"])).toBeUndefined();
      expect(pathUtils.getValueAtPath(obj, ["foo", "nonexistent"])).toBeUndefined();
    });
    
    test("should set nested values by path", () => {
      const obj = {
        foo: {
          bar: {}
        },
        array: [1, 2, 3]
      };
      
      // Set value at existing path and get updated object
      const updatedObj = pathUtils.setValueAtPath(obj, ["foo", "bar", "baz"], 42);
      expect(updatedObj.foo.bar).toHaveProperty("baz", 42);
      
      // Update array element
      const updatedArray = pathUtils.setValueAtPath(obj, ["array", "1"], 999);
      expect(updatedArray.array[1]).toBe(999);
      
      // Create intermediate objects
      const objWithIntermediate = pathUtils.setValueAtPath(obj, ["a", "b", "c"], "value");
      expect(objWithIntermediate).toHaveProperty("a.b.c", "value");
      
      // Setting at empty path should replace the object
      const newObj = { replaced: true };
      const result = pathUtils.setValueAtPath(obj, [], newObj);
      expect(result).toStrictEqual(newObj);
    });
    
    test("should handle array paths correctly", () => {
      const obj = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" }
        ]
      };
      
      // Access array element then property
      expect(pathUtils.getValueAtPath(obj, ["users", "0", "name"])).toBe("Alice");
      
      // Update array element property
      const updatedUsers = pathUtils.setValueAtPath(obj, ["users", "1", "name"], "Robert");
      expect(updatedUsers.users[1].name).toBe("Robert");
      
      // Push to array
      const arrayLengthBefore = updatedUsers.users.length;
      const updatedWithNewUser = pathUtils.setValueAtPath(updatedUsers, ["users", arrayLengthBefore.toString()], { id: 3, name: "Charlie" });
      expect(updatedWithNewUser.users.length).toBe(arrayLengthBefore + 1);
      expect(updatedWithNewUser.users[2].name).toBe("Charlie");
    });
  });
});