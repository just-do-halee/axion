/**
 * Tests for memoization functionality
 */

import {
  createMemoized,
  createResettableMemoized,
  createNoArgMemoized
} from "../../internals/memo";

describe("Memoization", () => {
  describe("createMemoized", () => {
    test("should cache results for identical inputs", () => {
      // Create a spy function to track calls
      const fn = jest.fn((x: number) => x * 2);
      const memoizedFn = createMemoized(fn);
      
      // First call should execute the function
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second call with same input should use cached result
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Different input should execute the function again
      expect(memoizedFn(7)).toBe(14);
      expect(fn).toHaveBeenCalledTimes(2);
    });
    
    test("should use custom equality function if provided", () => {
      // Function that deep compares arrays
      const isEqual = (a: number[], b: number[]) => {
        return a.length === b.length && a.every((v, i) => v === b[i]);
      };
      
      const fn = jest.fn((arr: number[]) => arr.reduce((sum, val) => sum + val, 0));
      const memoizedFn = createMemoized(fn, { isEqual });
      
      // First call should execute the function
      expect(memoizedFn([1, 2, 3])).toBe(6);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Different array reference but same values should use cache
      expect(memoizedFn([1, 2, 3])).toBe(6);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Different values should execute the function again
      expect(memoizedFn([1, 2, 4])).toBe(7);
      expect(fn).toHaveBeenCalledTimes(2);
    });
    
    test("should handle complex objects as inputs", () => {
      const fn = jest.fn((obj: { a: number; b: string }) => obj.a + obj.b);
      const memoizedFn = createMemoized(fn);
      
      const obj1 = { a: 5, b: "test" };
      
      // First call should execute the function
      expect(memoizedFn(obj1)).toBe("5test");
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Same object reference should use cached result
      expect(memoizedFn(obj1)).toBe("5test");
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Different object with same values should execute the function again (Object.is comparison)
      expect(memoizedFn({ a: 5, b: "test" })).toBe("5test");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
  
  describe("createResettableMemoized", () => {
    test("should cache results like regular memoized function", () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoizedFn = createResettableMemoized(fn);
      
      // First call should execute the function
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second call with same input should use cached result
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    test("should reset cache when requested", () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoizedFn = createResettableMemoized(fn);
      
      // First call should execute the function
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Reset the cache
      memoizedFn.reset();
      
      // Same input should execute the function again after reset
      expect(memoizedFn(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(2);
    });
    
    test("should use custom equality function if provided", () => {
      // Function that deep compares arrays
      const isEqual = (a: number[], b: number[]) => {
        return a.length === b.length && a.every((v, i) => v === b[i]);
      };
      
      const fn = jest.fn((arr: number[]) => arr.reduce((sum, val) => sum + val, 0));
      const memoizedFn = createResettableMemoized(fn, { isEqual });
      
      // First call should execute the function
      expect(memoizedFn([1, 2, 3])).toBe(6);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Different array reference but same values should use cache
      expect(memoizedFn([1, 2, 3])).toBe(6);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Reset the cache
      memoizedFn.reset();
      
      // Should execute function again after reset
      expect(memoizedFn([1, 2, 3])).toBe(6);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
  
  describe("createNoArgMemoized", () => {
    test("should memoize functions with no arguments", () => {
      let counter = 0;
      const fn = jest.fn(() => counter++);
      const memoizedFn = createNoArgMemoized(fn);
      
      // First call should execute the function
      expect(memoizedFn()).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Subsequent calls should use cached result
      expect(memoizedFn()).toBe(0);
      expect(memoizedFn()).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // There's no mechanism to invalidate in this version
    });
    
    test("should handle expensive computations efficiently", () => {
      // Create a computationally expensive function
      const expensiveFn = jest.fn(() => {
        let result = 0;
        for (let i = 0; i < 1000; i++) {
          result += Math.sqrt(i);
        }
        return result;
      });
      
      const memoizedFn = createNoArgMemoized(expensiveFn);
      
      // First call should compute the result
      const result = memoizedFn();
      expect(expensiveFn).toHaveBeenCalledTimes(1);
      
      // Subsequent calls should be instant
      expect(memoizedFn()).toBe(result);
      expect(memoizedFn()).toBe(result);
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });
  });
});