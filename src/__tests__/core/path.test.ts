/**
 * Tests for path-based operations in Axion
 */

import { createAtom } from "../../core/atom";
import * as dependencyModule from "../../internals/dependency";
import {
  createTestDependencySystem,
  flushPromises,
} from "../utils/test-helpers";

// Mock dependency tracking
describe("Path Operations", () => {
  // Set up the test dependency system with better isolation
  createTestDependencySystem();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic path operations", () => {
    test("should create a path node with at() method", () => {
      const atom = createAtom({ count: 0 });
      const path = atom.at("count");

      expect(path).toBeDefined();
      expect(typeof path.get).toBe("function");
      expect(typeof path.set).toBe("function");
      expect(typeof path.update).toBe("function");
    });

    test("should get value through path", () => {
      const atom = createAtom({ count: 0 });
      const value = atom.at("count").get();

      expect(value).toBe(0);
    });

    test("should set value through path", () => {
      const atom = createAtom({ count: 0 });
      atom.at("count").set(1);

      expect(atom.get().count).toBe(1);
    });

    test("should update value through path", () => {
      const atom = createAtom({ count: 0 });
      atom.at("count").update((value: number) => value + 1);

      expect(atom.get().count).toBe(1);
    });
  });

  describe("Nested path operations", () => {
    test("should access deeply nested properties", () => {
      const atom = createAtom({
        user: {
          profile: {
            details: {
              name: "John",
              age: 30,
            },
          },
        },
      });

      const name = atom.at("user").at("profile").at("details").at("name").get();

      expect(name).toBe("John");
    });

    test("should update deeply nested properties", () => {
      const atom = createAtom({
        user: {
          profile: {
            details: {
              name: "John",
              age: 30,
            },
          },
        },
      });

      atom.at("user").at("profile").at("details").at("name").set("Jane");

      expect(atom.get().user.profile.details.name).toBe("Jane");
      // Other properties should be unchanged
      expect(atom.get().user.profile.details.age).toBe(30);
    });

    test("should update objects at nested paths", () => {
      const atom = createAtom({
        user: {
          profile: {
            details: {
              name: "John",
              age: 30,
            },
          },
        },
      });

      atom.at("user").at("profile").at("details").set({
        name: "Jane",
        age: 25,
      });

      expect(atom.get().user.profile.details).toEqual({
        name: "Jane",
        age: 25,
      });
    });
  });

  describe("Array path operations", () => {
    test("should access array elements with numeric indices", () => {
      const atom = createAtom({
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
      });

      const firstUser = atom.at("users").at(0).get();

      expect(firstUser).toEqual({ id: 1, name: "John" });
    });

    test("should update array elements", () => {
      const atom = createAtom({
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
      });

      atom.at("users").at(0).at("name").set("Jonathan");

      expect(atom.get().users[0].name).toBe("Jonathan");
      // Other elements should be unchanged
      expect(atom.get().users[1].name).toBe("Jane");
    });

    test("should update entire arrays", () => {
      const atom = createAtom({
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
      });

      atom.at("users").set([
        { id: 3, name: "Bob" },
        { id: 4, name: "Alice" },
      ]);

      expect(atom.get().users).toEqual([
        { id: 3, name: "Bob" },
        { id: 4, name: "Alice" },
      ]);
    });
  });

  describe("Path subscriptions", () => {
    test("should notify path subscribers when path changes", async () => {
      const atom = createAtom({
        user: {
          profile: {
            name: "John",
            age: 30,
          },
        },
      });

      const nameHandler = jest.fn();
      const ageHandler = jest.fn();

      atom.at("user").at("profile").at("name").subscribe(nameHandler);
      atom.at("user").at("profile").at("age").subscribe(ageHandler);

      // Update name
      atom.at("user").at("profile").at("name").set("Jane");

      // Wait for async operations
      await flushPromises();

      expect(nameHandler).toHaveBeenCalledTimes(1);
      expect(ageHandler).not.toHaveBeenCalled();

      // Update age
      atom.at("user").at("profile").at("age").set(31);

      // Wait for async operations
      await flushPromises();

      expect(nameHandler).toHaveBeenCalledTimes(1);
      expect(ageHandler).toHaveBeenCalledTimes(1);
    });

    test("should notify parent path subscribers when child path changes", async () => {
      const atom = createAtom({
        user: {
          profile: {
            name: "John",
            age: 30,
          },
        },
      });

      const profileHandler = jest.fn();
      const nameHandler = jest.fn();

      atom.at("user").at("profile").subscribe(profileHandler);
      atom.at("user").at("profile").at("name").subscribe(nameHandler);

      // Update name
      atom.at("user").at("profile").at("name").set("Jane");

      // Wait for async operations
      await flushPromises();

      expect(profileHandler).toHaveBeenCalledTimes(1);
      expect(nameHandler).toHaveBeenCalledTimes(1);
    });

    test("should unsubscribe path subscribers correctly", async () => {
      const atom = createAtom({
        user: {
          name: "John",
        },
      });

      const handler = jest.fn();

      const unsubscribe = atom.at("user").at("name").subscribe(handler);
      unsubscribe();

      atom.at("user").at("name").set("Jane");

      // Wait for async operations
      await flushPromises();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Dependency tracking", () => {
    test("should track path dependencies when isTracking is true", () => {
      const atom = createAtom({
        user: {
          name: "John",
        },
      });

      // Enable tracking
      jest.spyOn(dependencyModule, "isTracking").mockReturnValue(true);

      // Get the value through path access
      atom.at("user").at("name").get();

      // Verify dependency tracking call was made with correct path
      expect(dependencyModule.trackDependency).toHaveBeenCalledWith(atom.id, [
        "user",
        "name",
      ]);
    });
  });

  describe("Error cases", () => {
    test("should throw when accessing invalid path", () => {
      const atom = createAtom({ user: { name: "John" } });

      // Create a custom matcher to check for specific error content
      expect(() => {
        atom
          .at("user")
          .at("age" as any)
          .get();
      }).toThrow(/property 'age' does not exist/);
    });

    test("should throw when calling at() on primitive values", () => {
      const atom = createAtom(42);

      expect(() => {
        atom.at("value" as any);
      }).toThrow(/Cannot.*primitive/);
    });
  });
});
