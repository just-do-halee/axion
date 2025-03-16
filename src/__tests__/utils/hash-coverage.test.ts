/**
 * Comprehensive coverage tests for hash utilities
 */

import {
  hashString,
  hashObject,
  computeHash,
  hashPath
} from "../../utils/hash";

describe("Hash Utilities", () => {
  describe("hashString", () => {
    test("should generate consistent hash for the same string", () => {
      const str = "test string";
      const hash1 = hashString(str);
      const hash2 = hashString(str);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("number");
    });
    
    test("should generate different hashes for different strings", () => {
      const str1 = "test string 1";
      const str2 = "test string 2";
      
      const hash1 = hashString(str1);
      const hash2 = hashString(str2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    test("should handle empty string", () => {
      const hash = hashString("");
      expect(typeof hash).toBe("number");
    });
    
    test("should handle unicode characters", () => {
      const unicodeStr = "测试字符串";
      const hash = hashString(unicodeStr);
      expect(typeof hash).toBe("number");
    });
  });
  
  describe("hashObject", () => {
    test("should hash primitive values", () => {
      expect(hashObject(null)).toBe("null");
      expect(hashObject(undefined)).toBe("undefined");
      expect(hashObject(42)).toBe("42");
      expect(hashObject(true)).toBe("true");
      expect(hashObject("string")).toBe('"string"');
      
      const sym = Symbol("test");
      expect(hashObject(sym)).toContain("Symbol(test)");
    });
    
    test("should hash arrays", () => {
      const array = [1, 2, 3];
      const hash = hashObject(array);
      
      expect(hash).toBe("[1,2,3]");
      
      // Different array should have different hash
      const array2 = [1, 2, 4];
      const hash2 = hashObject(array2);
      
      expect(hash).not.toBe(hash2);
    });
    
    test("should hash nested arrays", () => {
      const nestedArray = [1, [2, 3], 4];
      const hash = hashObject(nestedArray);
      
      expect(hash).toBe("[1,[2,3],4]");
    });
    
    test("should hash objects", () => {
      const obj = { a: 1, b: 2 };
      const hash = hashObject(obj);
      
      expect(hash).toBe("{a:1,b:2}");
      
      // Objects with same values but different order should have same hash
      const obj2 = { b: 2, a: 1 };
      const hash2 = hashObject(obj2);
      
      expect(hash).toBe(hash2);
    });
    
    test("should hash nested objects", () => {
      const nestedObj = { a: 1, b: { c: 2 } };
      const hash = hashObject(nestedObj);
      
      expect(hash).toBe("{a:1,b:{c:2}}");
    });
    
    test("should hash Date objects", () => {
      const date = new Date(2023, 0, 1);
      const hash = hashObject(date);
      
      // The date formatting is ISO format, regardless of timezone
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
    
    test("should hash RegExp objects", () => {
      const regex = /test/g;
      const hash = hashObject(regex);
      
      expect(hash).toBe("/test/g");
    });
    
    test("should hash Map objects", () => {
      const map = new Map([
        ["key1", "value1"],
        ["key2", "value2"]
      ]);
      
      const hash = hashObject(map);
      
      expect(hash).toContain("Map");
      expect(hash).toContain("key1");
      expect(hash).toContain("value1");
    });
    
    test("should hash Set objects", () => {
      const set = new Set([1, 2, 3]);
      const hash = hashObject(set);
      
      expect(hash).toContain("Set");
      expect(hash).toContain("1");
      expect(hash).toContain("2");
      expect(hash).toContain("3");
    });
    
    test("should handle circular references", () => {
      const circular = {} as any;
      circular.self = circular;
      
      const hash = hashObject(circular);
      
      expect(hash).toContain("[Circular]");
    });
  });
  
  describe("computeHash", () => {
    test("should hash primitive values", () => {
      expect(computeHash(null)).toBe("null");
      expect(computeHash(undefined)).toBe("undefined");
      expect(computeHash(42)).toBe("number:42");
      expect(computeHash(true)).toBe("boolean:true");
      expect(computeHash("string")).toContain("string:");
      
      const sym = Symbol("test");
      expect(computeHash(sym)).toContain("symbol:Symbol(test)");
    });
    
    test("should hash functions", () => {
      const func = () => 42;
      expect(computeHash(func)).toBe("function");
    });
    
    test("should hash arrays", () => {
      const array = [1, 2, 3];
      const hash = computeHash(array);
      
      expect(hash).toContain("array:");
      
      // Same array should produce same hash
      expect(computeHash(array)).toBe(hash);
      
      // Different array should have different hash
      const array2 = [1, 2, 4];
      const hash2 = computeHash(array2);
      
      expect(hash).not.toBe(hash2);
    });
    
    test("should hash Date objects", () => {
      const date = new Date(2023, 0, 1);
      const hash = computeHash(date);
      
      expect(hash).toContain("date:");
    });
    
    test("should hash RegExp objects", () => {
      const regex = /test/g;
      const hash = computeHash(regex);
      
      expect(hash).toContain("regexp:");
      expect(hash).toContain("/test/g");
    });
    
    test("should handle Map and Set objects", () => {
      const map = new Map([["key", "value"]]);
      const set = new Set([1, 2, 3]);
      
      expect(computeHash(map)).toBe("map");
      expect(computeHash(set)).toBe("set");
    });
    
    test("should hash large objects", () => {
      // Create an object with more than 100 keys
      const largeObj = {} as Record<string, number>;
      for (let i = 0; i < 150; i++) {
        largeObj[`key${i}`] = i;
      }
      
      const hash = computeHash(largeObj);
      
      // Should be a string
      expect(typeof hash).toBe("string");
    });
    
    test("should handle circular references", () => {
      const circular = {} as any;
      circular.self = circular;
      
      const hash = computeHash(circular);
      
      // Should not throw
      expect(typeof hash).toBe("string");
    });
  });
  
  describe("hashPath", () => {
    test("should hash simple paths", () => {
      const path = ["a", "b", "c"];
      const hash = hashPath(path);
      
      expect(hash).toContain("path:");
      
      // Same path should produce same hash
      expect(hashPath(path)).toBe(hash);
    });
    
    test("should hash paths with numbers", () => {
      const path = ["users", 0, "name"];
      const hash = hashPath(path);
      
      expect(hash).toContain("path:");
    });
    
    test("should hash paths with symbols", () => {
      const sym = Symbol("test");
      const path = [sym, "property"];
      const hash = hashPath(path);
      
      expect(hash).toContain("path:");
    });
    
    test("should produce different hashes for different paths", () => {
      const path1 = ["a", "b", "c"];
      const path2 = ["a", "b", "d"];
      
      const hash1 = hashPath(path1);
      const hash2 = hashPath(path2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});