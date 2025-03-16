// src/core/effect.ts - Fixed Implementation
import { withTracking } from "../internals/dependency";
import { getAtomById } from "../internals/registry";
import { EffectFn, DeepReadonly } from "../utils/types";
import { ErrorCode, createStateError, handleError } from "../utils/errors";

/**
 * Creates a reactive effect that automatically re-runs when its dependencies change
 *
 * Effects are similar to derived states but instead of computing a value, they
 * perform side effects like DOM updates, network requests, etc.
 *
 * @param effectFn The effect function to run
 * @returns A function to clean up the effect
 */
export function createEffect<T = void>(effectFn: EffectFn<T>): () => void {
  if (typeof effectFn !== "function") {
    throw handleError(
      createStateError(ErrorCode.INVALID_OPERATION, "Effect must be a function")
    );
  }

  // Effect state
  let isActive = true;
  let cleanup: (() => void) | void;

  // Subscription list
  const subscriptions: Array<() => void> = [];

  /**
   * Runs the effect and sets up dependencies
   */
  function runEffect() {
    // Skip if the effect has been deactivated
    if (!isActive) {
      return;
    }

    // Clean up previous execution
    if (typeof cleanup === "function") {
      try {
        cleanup();
      } catch (error) {
        handleError(
          createStateError(
            ErrorCode.UNKNOWN,
            "Error in effect cleanup function",
            undefined,
            error
          )
        );
      }
      cleanup = undefined;
    }

    try {
      // Debug logging in development
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Running effect");
      }

      // Run the effect with dependency tracking
      const [effectResult, dependencies] = withTracking(null, () => {
        return effectFn(undefined as unknown as DeepReadonly<T>);
      });

      // Store any cleanup function returned by the effect
      cleanup = effectResult;

      // Debug the dependencies
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Effect dependencies:", {
          count: dependencies.size,
          dependencies: Array.from(dependencies.keys()).map(String),
        });
      }

      // Clear previous subscriptions
      for (const unsubscribe of subscriptions) {
        try {
          unsubscribe();
        } catch (error) {
          handleError(
            createStateError(
              ErrorCode.UNKNOWN,
              "Error unsubscribing from dependency",
              undefined,
              error
            )
          );
        }
      }
      subscriptions.length = 0;

      // Set up new subscriptions
      for (const [atomId, paths] of dependencies.entries()) {
        // Get the atom reference
        const atom = getAtomById(atomId);

        if (!atom) {
          handleError(
            createStateError(
              ErrorCode.ATOM_NOT_FOUND,
              `Atom with id ${String(atomId)} not found`
            )
          );
          continue;
        }

        try {
          // ADDED CODE: Check if atom contains a primitive value
          const isPrimitive =
            typeof atom.get() !== "object" || atom.get() === null;

          // Determine the subscription approach based on paths
          if (paths.size === 0 || isPrimitive) {
            // Subscribe to the entire atom
            subscriptions.push(atom.subscribe(runEffect));
          } else {
            // Subscribe to multiple paths
            for (const path of paths) {
              subscriptions.push(atom.subscribePath(path, runEffect));
            }
          }
        } catch (error) {
          // Log the error but continue processing other dependencies
          handleError(
            createStateError(
              ErrorCode.SUBSCRIPTION_ERROR,
              `Error subscribing to ${String(atomId)}`,
              undefined,
              error
            )
          );
        }
      }
    } catch (error) {
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error in effect function",
          undefined,
          error
        )
      );
    }
  }

  // Initial execution
  runEffect();

  // Return cleanup function
  return () => {
    // Mark as inactive first to prevent re-execution
    isActive = false;

    // Debug logging in development
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Axion] Disposing effect");
    }

    // Unsubscribe from all dependencies
    for (const unsubscribe of subscriptions) {
      try {
        unsubscribe();
      } catch (error) {
        handleError(
          createStateError(
            ErrorCode.UNKNOWN,
            "Error unsubscribing during effect disposal",
            undefined,
            error
          )
        );
      }
    }
    subscriptions.length = 0;

    // Run cleanup function
    if (typeof cleanup === "function") {
      try {
        cleanup();
      } catch (error) {
        handleError(
          createStateError(
            ErrorCode.UNKNOWN,
            "Error in effect cleanup during disposal",
            undefined,
            error
          )
        );
      }
      cleanup = undefined;
    }
  };
}
