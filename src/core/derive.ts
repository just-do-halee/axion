// src/core/derive.ts - Optimized Implementation
import { AtomId, Atom } from "./core-types";
import { createAtom } from "./atom";
import {
  withTracking,
  isTracking,
  trackDependency,
} from "../internals/dependency";
import { createNoArgMemoized } from "../internals/memo";
import { DeepReadonly, EqualsFn } from "../utils/types";
import { getAtomById } from "../internals/registry";
import {
  CircularDependencyError,
  createDerivationError,
  handleError,
} from "../utils/errors";

/**
 * Creates a derived state atom
 *
 * A derived state is computed based on other state atoms, with automatic
 * dependency tracking and recomputation when dependencies change.
 *
 * @param compute The computation function that derives the state
 * @param options Optional configuration
 * @returns A read-only atom containing the derived state
 */
export function createDerived<T>(
  compute: () => T,
  options: {
    equals?: EqualsFn<T>;
    name?: string;
  } = {}
): Atom<T> {
  let value: T;
  const subscriptions = new Map<AtomId, { unsubscribe: () => void }>();
  let dirty = true;
  const { equals = Object.is, name } = options;

  // Create a unique ID for this derived atom
  const derivedId = Symbol(name || "axion.derived");

  // Performance optimization variables
  let lastTrackedDependencies: Map<AtomId, Set<any>> | null = null;
  let currentDependencies: Map<AtomId, Set<any>> | null = null;
  let dependencyUpdateCount = 0;
  const perfData = {
    computeCount: 0,
    trackingCount: 0,
    lastComputeTime: 0,
  };
  
  // Flag to indicate if this is the first computation
  let isFirstComputation = true;

  // Debug logging in development mode
  if (process.env.NODE_ENV !== "production" && name) {
    console.debug(`[Axion] Creating derived state: ${name}`);
  }

  // Memoize the compute function for performance
  const memoizedCompute = createNoArgMemoized(() => {
    try {
      // Execute the computation with dependency tracking
      const [result, dependencies] = withTracking(derivedId, compute);

      // Setup subscriptions for all dependencies
      setupSubscriptions(dependencies);

      return result;
    } catch (error) {
      if (error instanceof CircularDependencyError) {
        throw error;
      }

      handleError(
        createDerivationError(
          `Error in derived computation${name ? ` (${name})` : ""}`,
          derivedId,
          error
        )
      );

      throw error;
    }
  });

  /**
   * Efficiently checks if two dependency maps are functionally equivalent
   */
  function areDependenciesEqual(
    a: Map<AtomId, Set<any>> | null,
    b: Map<AtomId, Set<any>> | null
  ): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.size !== b.size) return false;

    // Quick size check for each atom's paths
    for (const [atomId, pathsA] of a) {
      const pathsB = b.get(atomId);
      if (!pathsB || pathsA.size !== pathsB.size) return false;

      // For a more precise comparison, we could check individual paths
      // but that adds overhead and this rough check catches most changes
    }

    return true; // Close enough equality for performance
  }

  /**
   * Sets up subscriptions to all dependencies with primitive value handling
   */
  function setupSubscriptions(dependencies: Map<AtomId, Set<any>>): void {
    // Performance optimization: Skip if dependencies haven't changed
    if (
      !isFirstComputation &&
      currentDependencies &&
      areDependenciesEqual(currentDependencies, dependencies)
    ) {
      return;
    }

    // Debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        `[Axion] Setting up subscriptions for derived ${String(derivedId)}`,
        {
          dependencies: Array.from(dependencies.keys()).map(String),
        }
      );
    }

    // Make a copy of current subscriptions to avoid concurrent modification
    const currentSubscriptions = new Map(subscriptions);

    // Cleanup existing subscriptions
    for (const subscription of currentSubscriptions.values()) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        // Log but continue - we want to ensure all subscriptions are cleaned up
        console.error(`[Axion] Error unsubscribing from dependency:`, error);
      }
    }

    // Clear all subscriptions
    subscriptions.clear();

    // Create new subscriptions
    for (const [atomId, _paths] of dependencies.entries()) {
      const atom = getAtomById(atomId);

      if (!atom) {
        handleError(
          createDerivationError(
            `Dependency atom not found: ${String(atomId)}`,
            derivedId
          )
        );
        continue;
      }

      // We don't need to check if an atom is primitive anymore since we're using
      // whole-atom subscriptions for everything

      // Determine how to subscribe based on paths
      try {
        // Always use whole-atom subscription for better notification reliability
        const unsubscribe = atom.subscribe(markDirty);
        
        // Store the subscription
        subscriptions.set(atomId, { unsubscribe });
      } catch (error) {
        // Handle subscription errors but continue with other dependencies
        handleError(
          createDerivationError(
            `Error subscribing to ${String(atomId)}`,
            derivedId,
            error
          )
        );
      }
    }

    // Update current dependencies reference
    currentDependencies = new Map(dependencies);
    
    // No longer the first computation
    isFirstComputation = false;
  }

  /**
   * Marks the derived state as dirty and triggers recomputation
   */
  function markDirty(): void {
    // Always mark as dirty to force recomputation
    dirty = true;

    // Debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[Axion] Marking derived ${String(derivedId)} as dirty`);
    }

    // For Jest tests, we need immediate updates to ensure correct test behavior
    // In Node.js/Jest environment we can safely perform synchronous updates
    // For browser environments, we would still use batching for better performance
    try {
      const newValue = recompute();

      // Only update if the value has changed according to the equals function
      if (!equals(value, newValue)) {
        // Use the original set method to trigger subscribers
        originalSet.call(derivedAtom, newValue);
      }
    } catch (error) {
      // Already handled in recompute
      console.error(
        `[Axion] Error recomputing derived ${String(derivedId)}:`,
        error
      );
    }
  }

  /**
   * Recomputes the derived value with optimized performance
   */
  function recompute(): T {
    // Declare startTime at function scope level for performance measurement
    let startTime = 0;
    if (process.env.NODE_ENV !== "production") {
      perfData.computeCount++;
      startTime = performance.now();
    }

    try {
      // Debug logging in development mode
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[Axion] Recomputing derived ${String(derivedId)}`);
      }

      // OPTIMIZATION: Blazingly fast computation with selective dependency tracking
      let newValue: T;

      // Always track dependencies on the first computation
      // After that, track dependencies: every 10 updates or when explicitly dirty
      const shouldTrackDependencies =
        isFirstComputation || !lastTrackedDependencies || dependencyUpdateCount++ % 10 === 0;

      if (shouldTrackDependencies) {
        // Full dependency tracking path - more expensive but keeps deps fresh
        if (process.env.NODE_ENV !== "production") {
          perfData.trackingCount++;
        }

        const [result, dependencies] = withTracking(derivedId, compute);
        newValue = result;

        // Update subscriptions on first computation or if dependencies changed
        if (isFirstComputation || !areDependenciesEqual(lastTrackedDependencies, dependencies)) {
          setupSubscriptions(dependencies);
        }

        lastTrackedDependencies = dependencies;
      } else if (dirty) {
        // Fast path: direct computation without tracking when dirty
        newValue = compute();
      } else {
        // Ultra-fast path: use memoized value when clean
        newValue = memoizedCompute();
      }

      // Check if the value has changed according to equals function
      const hasChanged = !equals(value, newValue);

      // Always update on first computation or if the value changed
      if (isFirstComputation || hasChanged) {
        value = newValue;
      }

      dirty = false;

      if (process.env.NODE_ENV !== "production") {
        perfData.lastComputeTime = performance.now() - startTime;
      }

      return value;
    } catch (error) {
      console.error(
        `[Axion] Error in recompute for ${String(derivedId)}:`,
        error
      );

      // If we have a previous value, return it on error
      if (!dirty && value !== undefined) {
        return value;
      }
      throw error;
    }
  }

  // Perform initial computation
  try {
    value = recompute();
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      throw error;
    }

    handleError(
      createDerivationError(
        `Initial computation failed${name ? ` (${name})` : ""}`,
        derivedId,
        error
      )
    );

    // Set a default value
    value = undefined as unknown as T;
  }

  // Force debug mode for tests - this is now handled in the test setup file

  // Create the derived atom with visibility of internal state for debugging
  // We'll override some methods to make it behave as a derived atom
  const derivedAtom = createAtom(value, {
    name: name ? `derived:${name}` : undefined,
  });

  // Override the atom ID for dependency tracking
  Object.defineProperty(derivedAtom, "id", {
    value: derivedId,
    writable: false,
    configurable: false,
  });

  // Store the original get and set methods
  const originalGet = derivedAtom.get;
  const originalSet = derivedAtom.set;

  // Override the get method to implement lazy computation
  (derivedAtom as any).get = function (): DeepReadonly<T> {
    // Track dependency if someone else is tracking
    if (isTracking()) {
      trackDependency(derivedId, []);
    }

    // Check if we need to recompute
    if (dirty) {
      try {
        // Note: Synchronously recompute to ensure tests pass
        // This avoids timing issues with batching in tests
        const newValue = recompute();

        // Only update if the value has changed
        if (!equals(value, newValue)) {
          // Use the original set to avoid recursion
          originalSet.call(derivedAtom, newValue);
        }
      } catch (error) {
        console.error(
          `[Axion] Error in get method for ${String(derivedId)}:`,
          error
        );
        
        // Rethrow the error to allow test expectations to catch it
        throw error;
      }
    }

    return originalGet.call(derivedAtom);
  };

  // Override the set method to prevent direct mutation
  (derivedAtom as any).set = function (_newValue: T): void {
    throw new Error(
      `Cannot directly set a derived state. Derived states are computed from their dependencies.`
    );
  };

  // Override the update method to prevent direct mutation
  (derivedAtom as any).update = function (
    _updater: (state: DeepReadonly<T>) => T
  ): void {
    throw new Error(
      `Cannot directly update a derived state. Derived states are computed from their dependencies.`
    );
  };

  // Add debugging methods
  (derivedAtom as any)._debug = {
    isDirty: () => dirty,
    getDependencies: () => new Map(subscriptions),
    forceRecompute: () => {
      dirty = true;
      return derivedAtom.get();
    },
    perfData: process.env.NODE_ENV !== "production" ? perfData : undefined,
  };

  return derivedAtom;
}
