/**
 * Basic tests for the core atom functionality
 * This version is simplified to focus on testing existing behavior
 */

import { createAtom } from "../../core/atom";
import { createTestAtom } from "../utils/test-helpers";
import * as dependencyModule from "../../internals/dependency";

// Mock dependency tracking
jest.mock("../../internals/dependency", () => {
  const original = jest.requireActual("../../internals/dependency");
  return {
    ...original,
    isTracking: jest.fn(),
    trackDependency: jest.fn(),
  };
});

describe("Atom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dependencyModule.isTracking as jest.Mock).mockReturnValue(false);
  });

  describe("Creation and basic operations", () => {
    test("should create an atom with initial state", () => {
      const initialState = { count: 0 };
      const atom = createAtom(initialState);

      expect(atom.get()).toEqual(initialState);
      expect(atom.get()).not.toBe(initialState); // Should be immutable copy
    });

    test("should update state with set method", () => {
      const atom = createAtom({ count: 0 });

      atom.set({ count: 1 });

      expect(atom.get()).toEqual({ count: 1 });
    });

    test("should update state with update method", () => {
      const atom = createAtom({ count: 0 });

      atom.update((state) => ({ count: state.count + 1 }));

      expect(atom.get().count).toBe(1);
    });
  });

  describe("Path operations", () => {
    test("should access nested properties with path", () => {
      const atom = createAtom({
        user: {
          profile: {
            name: "John",
          },
        },
      });

      const name = atom.at("user").at("profile").at("name").get();

      expect(name).toBe("John");
    });

    test("should update nested properties with path", () => {
      const atom = createAtom({
        user: {
          profile: {
            name: "John",
          },
        },
      });

      atom.at("user").at("profile").at("name").set("Jane");

      expect(atom.get().user.profile.name).toBe("Jane");
    });
  });

  describe("Subscription system", () => {
    test("should notify subscribers when state changes", () => {
      const { atom, getSubscriberCount } = createTestAtom({ count: 0 });
      const handler = jest.fn();

      atom.subscribe(handler);
      expect(getSubscriberCount()).toBe(1);

      atom.set({ count: 1 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("should unsubscribe correctly", () => {
      const { atom, getSubscriberCount } = createTestAtom({ count: 0 });
      const handler = jest.fn();

      const unsubscribe = atom.subscribe(handler);
      expect(getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(getSubscriberCount()).toBe(0);

      atom.set({ count: 1 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Dependency tracking", () => {
    test("should track dependencies when isTracking is true", () => {
      const atom = createAtom({ count: 0 });
      (dependencyModule.isTracking as jest.Mock).mockReturnValue(true);

      atom.get();

      expect(dependencyModule.trackDependency).toHaveBeenCalledWith(
        atom.id,
        []
      );
    });
  });
});
