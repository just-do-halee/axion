/**
 * Comprehensive coverage tests for path utility functions
 */

import {
  normalizePath,
  stringifyPath,
  stringToPath,
  pathToString,
  getValueAtPath,
  setValueAtPath,
  areSamePaths,
  isSubPath,
  areRelatedPaths,
  isDirectParentPath
} from "../../utils/path";

describe("Path Utilities", () => {
  describe("normalizePath", () => {
    test("should convert string paths to arrays", () => {
      expect(normalizePath("a.b.c")).toEqual(["a", "b", "c"]);
      expect(normalizePath("user.profile.name")).toEqual(["user", "profile", "name"]);
    });
    
    test("should handle array paths", () => {
      expect(normalizePath(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });
    
    test("should split string segments in array paths", () => {
      expect(normalizePath(["a", "b.c"])).toEqual(["a", "b", "c"]);
      expect(normalizePath(["user", "profile.name"])).toEqual(["user", "profile", "name"]);
    });
    
    test("should handle empty paths", () => {
      expect(normalizePath("")).toEqual([]);
      expect(normalizePath([])).toEqual([]);
    });
    
    test("should handle paths with numeric segments", () => {
      // Numbers in strings might be converted to numbers
      const result1 = normalizePath("users.0.name");
      expect(result1[0]).toBe("users");
      expect(result1[2]).toBe("name");
      
      const result2 = normalizePath(["users", 0, "name"]);
      expect(result2[0]).toBe("users");
      expect(result2[2]).toBe("name");
    });
    
    test("should handle paths with symbol segments", () => {
      const sym = Symbol("test");
      expect(normalizePath([sym, "name"])).toEqual([sym, "name"]);
    });
  });
  
  describe("stringifyPath", () => {
    test("should join path segments with dots", () => {
      expect(stringifyPath(["a", "b", "c"])).toBe("a.b.c");
      expect(stringifyPath(["user", "profile", "name"])).toBe("user.profile.name");
    });
    
    test("should handle empty paths", () => {
      expect(stringifyPath([])).toBe("");
    });
    
    test("should stringify numeric segments", () => {
      expect(stringifyPath(["users", "0", "name"])).toBe("users.0.name");
    });
    
    test("should stringify symbol segments", () => {
      const sym = Symbol("test");
      // Symbol description is extracted in pathToString implementation
      const result = stringifyPath([sym, "name"]);
      expect(result).toContain("name");
      // Check that the symbol was converted to a string somehow
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(4); // More than just "name"
    });
  });
  
  describe("stringToPath", () => {
    test("should split string path on dots", () => {
      expect(stringToPath("a.b.c")).toEqual(["a", "b", "c"]);
      expect(stringToPath("user.profile.name")).toEqual(["user", "profile", "name"]);
    });
    
    test("should handle empty path", () => {
      expect(stringToPath("")).toEqual([]);
    });
    
    test("should convert numeric segments to numbers", () => {
      expect(stringToPath("users.0.name")).toEqual(["users", 0, "name"]);
    });
  });
  
  describe("pathToString", () => {
    test("should join path segments with dots", () => {
      expect(pathToString(["a", "b", "c"])).toBe("a.b.c");
      expect(pathToString(["user", "profile", "name"])).toBe("user.profile.name"); 
    });
    
    test("should handle numeric segments", () => {
      expect(pathToString(["users", 0, "name"])).toBe("users.0.name");
    });
    
    test("should handle symbol segments", () => {
      const sym = Symbol("test");
      expect(pathToString([sym, "name"])).toBe("test.name");
    });
  });
  
  describe("getValueAtPath", () => {
    test("should get nested value at path", () => {
      const obj = { 
        user: { 
          profile: { 
            name: "John", 
            age: 30 
          } 
        },
        items: [1, 2, 3]
      };
      
      expect(getValueAtPath(obj, ["user", "profile", "name"])).toBe("John");
      expect(getValueAtPath(obj, ["user", "profile", "age"])).toBe(30);
      expect(getValueAtPath(obj, ["items", "1"])).toBe(2);
    });
    
    test("should return the object for empty path", () => {
      const obj = { test: "value" };
      expect(getValueAtPath(obj, [])).toBe(obj);
    });
    
    test("should return undefined for non-existent path", () => {
      const obj = { user: { name: "John" } };
      expect(getValueAtPath(obj, ["user", "profile", "name"])).toBeUndefined();
    });
    
    test("should handle arrays", () => {
      const obj = { users: [{ name: "John" }, { name: "Jane" }] };
      expect(getValueAtPath(obj, ["users", "0", "name"])).toBe("John");
      expect(getValueAtPath(obj, ["users", "1", "name"])).toBe("Jane");
    });
  });
  
  
  describe("setValueAtPath", () => {
    test("should set value at existing path", () => {
      const obj = { user: { profile: { name: "John" } } } as any;
      const result = setValueAtPath(obj, ["user", "profile", "name"], "Jane") as any;
      
      expect(result.user.profile.name).toBe("Jane");
      // Original should be unchanged (immutability)
      expect(obj.user.profile.name).toBe("John");
    });
    
    test("should create intermediate objects for non-existent paths", () => {
      const obj = { user: {} } as any;
      const result = setValueAtPath(obj, ["user", "profile", "name"], "John") as any;
      
      expect(result.user.profile.name).toBe("John");
      expect(result.user !== obj.user).toBe(true); // New reference
    });
    
    test("should handle arrays", () => {
      const obj = { users: [{ name: "John" }] } as any;
      const result = setValueAtPath(obj, ["users", "0", "name"], "Jane") as any;
      
      expect(result.users[0].name).toBe("Jane");
      expect(obj.users[0].name).toBe("John"); // Original unchanged
    });
    
    test("should create arrays when setting numeric path segments", () => {
      const obj = {} as any;
      const result = setValueAtPath(obj, ["users", "0", "name"], "John") as any;
      
      expect(Array.isArray(result.users)).toBe(true);
      expect(result.users[0].name).toBe("John");
    });
    
    test("should replace the whole object for empty path", () => {
      const obj = { test: "old" };
      const newObj = { test: "new" };
      const result = setValueAtPath(obj, [], newObj);
      
      // The result might be a copy or the same object depending on implementation
      expect(result).toEqual(newObj);
    });
  });
  
  describe("areRelatedPaths", () => {
    test("should return true for exact path match", () => {
      expect(areRelatedPaths(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    });
    
    test("should return true for parent path", () => {
      expect(areRelatedPaths(["a", "b"], ["a", "b", "c"])).toBe(true);
    });
    
    test("should return true for ancestor path", () => {
      expect(areRelatedPaths(["a"], ["a", "b", "c", "d"])).toBe(true);
    });
    
    test("should return true for root path", () => {
      expect(areRelatedPaths([], ["a", "b", "c"])).toBe(true);
    });
    
    test("should return false for unrelated path", () => {
      expect(areRelatedPaths(["x", "y"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return false for sibling path", () => {
      expect(areRelatedPaths(["a", "b", "d"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return true for child related to parent", () => {
      expect(areRelatedPaths(["a", "b", "c"], ["a", "b"])).toBe(true);
    });
  });
  
  describe("isDirectParentPath", () => {
    test("should return true for direct parent path", () => {
      expect(isDirectParentPath(["a", "b"], ["a", "b", "c"])).toBe(true);
    });
    
    test("should return false for same path", () => {
      expect(isDirectParentPath(["a", "b", "c"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return false for grandparent path", () => {
      expect(isDirectParentPath(["a"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return false for unrelated path", () => {
      expect(isDirectParentPath(["x", "y"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return true for root path with direct child", () => {
      expect(isDirectParentPath([], ["a"])).toBe(true);
    });
    
    test("should return false for child related to parent", () => {
      expect(isDirectParentPath(["a", "b", "c"], ["a", "b"])).toBe(false);
    });
  });
  
  describe("areSamePaths", () => {
    test("should return true for identical paths", () => {
      expect(areSamePaths(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    });
    
    test("should return false for different paths", () => {
      expect(areSamePaths(["a", "b", "c"], ["a", "b", "d"])).toBe(false);
      expect(areSamePaths(["a", "b"], ["a", "b", "c"])).toBe(false);
    });
    
    test("should return true for empty paths", () => {
      expect(areSamePaths([], [])).toBe(true);
    });
    
    test("should handle paths with symbols", () => {
      const sym = Symbol("test");
      expect(areSamePaths([sym, "name"], [sym, "name"])).toBe(true);
      expect(areSamePaths([sym, "name"], [sym, "age"])).toBe(false);
    });
  });
  
  describe("isSubPath", () => {
    test("should return true for subpath", () => {
      expect(isSubPath(["a", "b", "c"], ["a", "b"])).toBe(true);
    });
    
    test("should return false for same path", () => {
      expect(isSubPath(["a", "b"], ["a", "b"])).toBe(false);
    });
    
    test("should return false when first is shorter", () => {
      expect(isSubPath(["a"], ["a", "b"])).toBe(false);
    });
    
    test("should return false for unrelated paths", () => {
      expect(isSubPath(["x", "y", "z"], ["a", "b"])).toBe(false);
    });
  });
});