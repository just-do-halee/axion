/**
 * Test utilities for Axion
 *
 * This file contains helper functions and utilities for testing Axion components
 */

import { createAtom, Atom } from "../../core/atom";
import { DeepReadonly, SubscriptionHandler, Path } from "../../utils/types";
import * as dependencyModule from "../../internals/dependency";
import { AtomId } from "../../core/core-types";

/**
 * Enhanced test atom with additional utilities for testing
 */
export interface TestAtom<T> {
  /** The actual atom instance */
  atom: Atom<T>;
  /** Get the number of active subscribers */
  getSubscriberCount: () => number;
  /** Get all active subscriber handlers */
  getSubscribers: () => Set<SubscriptionHandler>;
  /** Manually trigger change notifications */
  triggerChange: () => void;
  /** Get the number of times an atom has been updated */
  getUpdateCount: () => number;
  /** Get the last updated value */
  getLastUpdatedValue: () => T | null;
}

/**
 * Create an atom with additional testing utilities
 *
 * @param initialState - Initial state for the atom
 * @returns TestAtom with the atom instance and testing utilities
 */
export function createTestAtom<T>(initialState: T): TestAtom<T> {
  const subscribers: Set<SubscriptionHandler> = new Set();
  let updateCount = 0;
  let lastUpdatedValue: T | null = null;

  // Create the atom
  const atom = createAtom(initialState);

  // Override the subscribe method to track subscribers
  const originalSubscribe = atom.subscribe;
  atom.subscribe = jest.fn((handler: SubscriptionHandler) => {
    subscribers.add(handler);

    // Get the original unsubscribe function
    const originalUnsubscribe = originalSubscribe.call(atom, handler);

    // Return a wrapped unsubscribe function that also removes from our tracked set
    return () => {
      subscribers.delete(handler);
      return originalUnsubscribe();
    };
  });

  // Override the set method to track updates
  const originalSet = atom.set;
  atom.set = jest.fn((newState: T) => {
    updateCount++;
    lastUpdatedValue = newState;
    return originalSet.call(atom, newState);
  });

  // Override the update method to track updates
  const originalUpdate = atom.update;
  atom.update = jest.fn((updater: (current: DeepReadonly<T>) => T) => {
    updateCount++;
    const newState = updater(atom.get());
    lastUpdatedValue = newState;
    return originalUpdate.call(atom, updater);
  });

  return {
    atom,
    getSubscriberCount: () => subscribers.size,
    getSubscribers: () => subscribers,
    triggerChange: () => {
      subscribers.forEach((fn) => fn());
    },
    getUpdateCount: () => updateCount,
    getLastUpdatedValue: () => lastUpdatedValue,
  };
}

/**
 * Creates a properly wired mock dependency system for testing
 */
export function createTestDependencySystem() {
  // Create dependency map for tests to use
  const mockDependencies = new Map<AtomId, Set<Path>>();

  // Setup mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockDependencies.clear();

    // Allow tests to control tracking state
    jest.spyOn(dependencyModule, "isTracking").mockImplementation(() => true);

    // Fix: Actually register dependencies in a usable format
    jest
      .spyOn(dependencyModule, "trackDependency")
      .mockImplementation((atomId: AtomId, path: Path) => {
        if (!mockDependencies.has(atomId)) {
          mockDependencies.set(atomId, new Set());
        }
        mockDependencies.get(atomId)!.add([...path]); // Create a copy of the path
      });

    // Mock startTracking to work with our system
    jest.spyOn(dependencyModule, "startTracking").mockImplementation(() => {
      return {
        sourceId: null,
        dependencies: new Map(),
      };
    });

    // Mock stopTracking to return our mock dependencies
    jest
      .spyOn(dependencyModule, "stopTracking")
      .mockImplementation(() => mockDependencies);

    // Fix: Return usable mock dependencies from withTracking
    jest
      .spyOn(dependencyModule, "withTracking")
      .mockImplementation((sourceId, fn) => {
        const result = fn();

        if (process.env.NODE_ENV !== "production") {
          console.debug("[Testing] withTracking mock called", {
            sourceId: sourceId ? String(sourceId) : "null",
            dependencyCount: mockDependencies.size,
          });
        }

        return [result, new Map(mockDependencies)];
      });
  });

  // Clean up mocks after each test
  afterEach(() => {
    // Restore original functions manually to ensure complete cleanup
    jest.spyOn(dependencyModule, "isTracking").mockRestore();
    jest.spyOn(dependencyModule, "trackDependency").mockRestore();
    jest.spyOn(dependencyModule, "withTracking").mockRestore();
    jest.spyOn(dependencyModule, "startTracking").mockRestore();
    jest.spyOn(dependencyModule, "stopTracking").mockRestore();

    // Clear all other mocks
    jest.restoreAllMocks();
    mockDependencies.clear();

    // Ensure no tracking contexts are left over
    if (typeof dependencyModule.cleanupAllTracking === "function") {
      dependencyModule.cleanupAllTracking();
    }
  });

  return {
    setMockDependencies: (deps: Map<AtomId, Set<Path>>) => {
      mockDependencies.clear();
      deps.forEach((value, key) => {
        const pathSet = new Set<Path>();
        value.forEach((path) => pathSet.add([...path])); // Create copies of paths
        mockDependencies.set(key, pathSet);
      });
    },
    getMockDependencies: () => mockDependencies,
    addMockDependency: (atomId: AtomId, path: Path = []) => {
      if (!mockDependencies.has(atomId)) {
        mockDependencies.set(atomId, new Set());
      }
      mockDependencies.get(atomId)!.add([...path]);
    },
  };
}

/**
 * Mock for dependency tracking system
 * This allows testing components that rely on dependency tracking without
 * using the actual tracking system
 */
export function mockDependencyTracking() {
  return createTestDependencySystem();
}

/**
 * Wait for all pending promises to resolve
 * Useful for testing async operations
 */
export async function flushPromises(): Promise<void> {
  // Return a promise that resolves in the next microtask
  // Using setTimeout(0) to ensure all microtasks and timers have run
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock error that can be used in tests
 */
export function createMockError(message: string): Error {
  const error = new Error(message);
  error.stack = `Error: ${message}
    at mockFunction (src/__tests__/mock-file.ts:123:45)
    at Object.<anonymous> (src/__tests__/test-file.test.ts:67:89)`;
  return error;
}

/**
 * Create a delayed promise that resolves after the specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy object that tracks method calls
 * TypeScript-friendly version
 */
export function createSpy<T extends Record<string, any>>(
  obj: T
): { [K in keyof T]: T[K] extends Function ? jest.Mock : T[K] } {
  const spy = { ...obj } as any;

  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];

    if (typeof value === "function") {
      spy[key] = jest.fn((...args: any[]) => {
        return (value as Function).apply(obj, args);
      });
    }
  });

  return spy;
}

/**
 * Creates a set of mock atoms with pre-defined dependencies for testing
 */
export function createMockAtomNetwork() {
  const atoms: Record<string, Atom<any>> = {};
  const dependencies: Record<string, string[]> = {};

  /**
   * Create a new atom in the network
   */
  function createNetworkAtom<T>(name: string, initialState: T): Atom<T> {
    const atom = createAtom(initialState, { name });
    atoms[name] = atom;
    dependencies[name] = [];
    return atom;
  }

  /**
   * Define a dependency between atoms
   */
  function addDependency(dependent: string, dependency: string): void {
    if (!atoms[dependent]) throw new Error(`Atom ${dependent} not found`);
    if (!atoms[dependency]) throw new Error(`Atom ${dependency} not found`);

    dependencies[dependent].push(dependency);
  }

  /**
   * Setup the dependency tracking system to use our predefined dependencies
   */
  function setupMockDependencies() {
    const depSystem = createTestDependencySystem();

    // When any atom in our network is tracked, we'll use our predefined dependencies
    jest
      .spyOn(dependencyModule, "withTracking")
      .mockImplementation((sourceId, fn) => {
        const result = fn();

        // Find the atom with this ID
        const sourceName = Object.keys(atoms).find(
          (name) => atoms[name].id === sourceId
        );

        if (sourceName && dependencies[sourceName]) {
          // Add each dependency to the mock system
          dependencies[sourceName].forEach((depName) => {
            depSystem.addMockDependency(atoms[depName].id);
          });
        }

        return [result, depSystem.getMockDependencies()];
      });

    return depSystem;
  }

  return {
    createAtom: createNetworkAtom,
    addDependency,
    setupMockDependencies,
    getAtom: (name: string) => atoms[name],
    getAllAtoms: () => ({ ...atoms }),
  };
}

/**
 * Deep object equality function for tests
 * More flexible than Jest's built-in equality
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => keysB.includes(key) && deepEqual(a[key], b[key]));
}

/**
 * Assertion function to verify object shape matches expected type
 */
export function expectTypeOf<T>(actual: any, expected: T): void {
  // Check all properties of expected exist in actual
  if (typeof expected === "object" && expected !== null) {
    Object.keys(expected).forEach((key) => {
      expect(actual).toHaveProperty(key);

      const actualValue = actual[key];
      const expectedValue = (expected as any)[key];

      if (typeof expectedValue === "object" && expectedValue !== null) {
        expectTypeOf(actualValue, expectedValue);
      }
    });
  }
}
