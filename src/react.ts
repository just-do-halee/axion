// src/react.ts - React integration

import { useEffect, useState, useCallback, useRef } from "react";

// Import directly from core-types to avoid circular dependencies
import type { Atom, PathOperator } from "./core/core-types";

import { startTracking, stopTracking } from "./internals/dependency";
import { getAtomById } from "./internals/registry";
import { createStateError, ErrorCode, handleError } from "./utils/errors";
import { createAtom } from "./core/atom";
import { createEffect } from "./core/effect";

// Re-export core functionality and types for React-specific imports
export { createAtom } from "./core/atom";
export { createEffect } from "./core/effect";

// Re-export the exact same type references
export type { Atom, PathOperator };

/**
 * React hook to consume Axion state in components.
 * Subscribes to state changes and returns the current value.
 *
 * @param source An Atom or PathOperator to subscribe to
 * @returns The current state value
 */
export function useAxion<T>(source: Atom<T> | PathOperator<any, any>): T {
  // Determine the getter function based on source type
  const getterFn = "get" in source ? source.get : () => source;

  // Get initial state
  const [state, setState] = useState<T>(() => {
    try {
      return getterFn();
    } catch (error) {
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error getting initial state in React hook",
          undefined,
          error
        )
      );
      throw error; // Re-throw to propagate to error boundary
    }
  });

  // State change handler
  const handleChange = useCallback(() => {
    try {
      const newState = getterFn();
      setState(newState);
    } catch (error) {
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error getting state in React hook",
          undefined,
          error
        )
      );
      // We don't re-throw here to prevent component unmounting on transient errors
    }
  }, [getterFn]);

  // Set up subscription
  useEffect(() => {
    // Find subscription method if available
    const subscribe = "subscribe" in source ? source.subscribe : undefined;

    // Use direct subscription if available
    if (subscribe) {
      try {
        const unsubscribe = subscribe(handleChange);
        return unsubscribe;
      } catch (error) {
        handleError(
          createStateError(
            ErrorCode.SUBSCRIPTION_ERROR,
            "Error subscribing to source",
            undefined,
            error
          )
        );
      }
    }

    // Fallback to dependency tracking for sources without subscribe method
    startTracking();

    try {
      // Execute getter to track dependencies
      getterFn();
    } catch (error) {
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error tracking dependencies in React hook",
          undefined,
          error
        )
      );
      stopTracking();
      return () => {
        /* Empty cleanup function */
      };
    }

    let dependencies;
    try {
      dependencies = stopTracking();
    } catch (error) {
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error stopping dependency tracking in React hook",
          undefined,
          error
        )
      );
      return () => {
        /* Empty cleanup function */
      };
    }
    const unsubscribers: Array<() => void> = [];

    // Subscribe to all tracked dependencies
    for (const [atomId, paths] of dependencies.entries()) {
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
        if (paths.size === 0) {
          // Subscribe to the entire atom
          unsubscribers.push(atom.subscribe(handleChange));
        } else {
          // Subscribe to specific paths
          for (const path of paths) {
            unsubscribers.push(atom.subscribePath(path, handleChange));
          }
        }
      } catch (error) {
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

    // Return cleanup function to unsubscribe from all dependencies
    return () => {
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch (error) {
          handleError(
            createStateError(
              ErrorCode.UNKNOWN,
              "Error unsubscribing in React hook cleanup",
              undefined,
              error
            )
          );
        }
      }
    };
  }, [source, handleChange]);

  return state;
}

/**
 * Type definition for HTTP request states
 */
export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  success: boolean;
  timestamp: number | null;
}

/**
 * Configuration options for useAxios hook
 */
export interface AxiosOptions<T> {
  /**
   * Initial data to use before the first fetch
   */
  initialData?: T | null;

  /**
   * Function to transform response data before storing
   */
  transform?: (data: any) => T;

  /**
   * Automatically refetch on mount (default: true)
   */
  fetchOnMount?: boolean;

  /**
   * Dependencies array that triggers refetch when changed
   */
  deps?: React.DependencyList;

  /**
   * Refetch interval in milliseconds (0 means no auto-refetch)
   */
  refetchInterval?: number;

  /**
   * Error handler for failed requests
   */
  onError?: (error: Error) => void;

  /**
   * Success handler for successful requests
   */
  onSuccess?: (data: T) => void;

  /**
   * Retry configuration
   */
  retry?: {
    /**
     * Maximum number of retry attempts (default: 0 - no retries)
     */
    attempts?: number;

    /**
     * Delay between retries in milliseconds (default: 1000)
     */
    delay?: number;

    /**
     * Whether to use exponential backoff for retries (default: true)
     */
    exponential?: boolean;
  };

  /**
   * Cache result with the given key
   */
  cacheKey?: string;

  /**
   * Cache expiration time in milliseconds (default: 5 minutes)
   */
  cacheTime?: number;
}

// Global request cache
const requestCache = new Map<string, { data: any; timestamp: number }>();

/**
 * React hook for making HTTP requests with Axion state management.
 *
 * @param requestFn Function that returns a Promise resolving to the response
 * @param options Configuration options
 * @returns Object containing request state and control functions
 */
export function useAxios<T = any>(
  requestFn: () => Promise<T>,
  options: AxiosOptions<T> = {}
) {
  // Create an atom to manage request state
  const atomRef = useRef<Atom<RequestState<T>>>();

  // Extract options with defaults
  const {
    initialData = null,
    transform = (data: any) => data as T,
    fetchOnMount = true,
    deps = [],
    refetchInterval = 0,
    onError,
    onSuccess,
    retry = { attempts: 0, delay: 1000, exponential: true },
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 5 minutes default cache time
  } = options;

  // Initialize atom if it doesn't exist
  if (!atomRef.current) {
    // Check cache for initial data if cacheKey is provided
    let cachedData = initialData;
    let cachedTimestamp = null;

    if (cacheKey && requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)!;
      // Only use cache if it hasn't expired
      if (Date.now() - cached.timestamp < cacheTime) {
        cachedData = cached.data;
        cachedTimestamp = cached.timestamp;
      }
    }

    atomRef.current = createAtom<RequestState<T>>({
      data: cachedData,
      loading: false,
      error: null,
      success: cachedData !== null,
      timestamp: cachedTimestamp,
    });
  }

  const atom = atomRef.current;

  // Subscribe to atom state
  const state = useAxion(atom);

  // Refs for tracking the latest dependencies and request function
  const depsRef = useRef(deps);
  const requestFnRef = useRef(requestFn);

  // Update refs when dependencies change
  useEffect(() => {
    depsRef.current = deps;
    requestFnRef.current = requestFn;
  }, [requestFn, ...deps]);

  // Interval refetch controller
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Function to fetch data with retry logic
  const fetchWithRetry = useCallback(
    async (
      remainingAttempts: number = retry.attempts || 0,
      attemptNumber = 1
    ): Promise<void> => {
      // Set loading state
      atom.update((currentState) => {
        return {
          ...currentState,
          loading: true,
          error: null,
        } as RequestState<T>;
      });

      try {
        // Execute request
        const response = await requestFnRef.current();

        // Transform response data
        const transformedData = transform(response);

        // Update state with successful response
        atom.update((currentState) => {
          return {
            ...currentState,
            data: transformedData,
            loading: false,
            error: null,
            success: true,
            timestamp: Date.now(),
          } as RequestState<T>;
        });

        // Cache result if cacheKey is provided
        if (cacheKey) {
          requestCache.set(cacheKey, {
            data: transformedData,
            timestamp: Date.now(),
          });
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(transformedData);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (remainingAttempts > 0) {
          // Calculate backoff delay
          const delayTime = retry.exponential
            ? (retry.delay || 1000) * Math.pow(2, attemptNumber - 1)
            : retry.delay || 1000;

          // Set temporary error state during retry
          atom.update((currentState) => {
            return {
              ...currentState,
              loading: true,
              error: new Error(
                `Request failed, retrying (${attemptNumber}/${retry.attempts}): ${err.message}`
              ),
            } as RequestState<T>;
          });

          // Retry after delay
          setTimeout(() => {
            fetchWithRetry(remainingAttempts - 1, attemptNumber + 1);
          }, delayTime);
        } else {
          // No more retries, set error state
          atom.update((currentState) => {
            return {
              ...currentState,
              loading: false,
              error: err,
              success: false,
            } as RequestState<T>;
          });

          // Call error callback if provided
          if (onError) {
            onError(err);
          }
        }
      }
    },
    [atom, transform, retry, cacheKey, onSuccess, onError]
  );

  // Function to manually trigger fetch
  const refetch = useCallback(() => {
    return fetchWithRetry(retry.attempts);
  }, [fetchWithRetry, retry.attempts]);

  // Function to reset state
  const reset = useCallback(() => {
    atom.update((currentState) => {
      return {
        ...currentState,
        data: initialData,
        loading: false,
        error: null,
        success: false,
        timestamp: null,
      } as RequestState<T>;
    });
  }, [atom, initialData]);

  // Function to update data manually
  const updateData = useCallback(
    (updater: (data: T | null) => T) => {
      atom.update((currentState) => {
        // Type cast to handle DeepReadonly types properly
        const currentData = currentState.data as T | null;
        const updatedData = updater(currentData);

        // Update cache if using a cache key
        if (cacheKey) {
          requestCache.set(cacheKey, {
            data: updatedData,
            timestamp: Date.now(),
          });
        }

        return {
          ...currentState,
          data: updatedData,
          timestamp: Date.now(),
        } as RequestState<T>;
      });
    },
    [atom, cacheKey]
  );

  // Function to clear cache
  const clearCache = useCallback(() => {
    if (cacheKey) {
      requestCache.delete(cacheKey);
    }
  }, [cacheKey]);

  // Set up interval-based refetching
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if interval is greater than 0
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        refetch();
      }, refetchInterval);
    }

    // Clear interval on cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refetchInterval, refetch]);

  // Initial fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      refetch();
    }
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  // Refetch when dependencies change
  useEffect(() => {
    // Skip initial render
    const isDepsChanged = deps.some((dep, i) => dep !== depsRef.current[i]);
    if (isDepsChanged) {
      refetch();
    }
  }, deps);

  // Return request state and control functions
  return {
    ...state,
    refetch,
    reset,
    updateData,
    clearCache,
  };
}

/**
 * React hook that runs an effect when Axion state changes
 *
 * @param effectFn Function to run when dependencies change
 * @param deps Array of dependencies for the effect
 * @returns Cleanup function
 */
export function useAxionEffect(
  effectFn: () => void | (() => void),
  deps: React.DependencyList = []
): void {
  // Store the cleanup function
  const cleanupRef = useRef<(() => void) | void>();

  // Create effect on mount
  const effectRef = useRef<() => void>();

  useEffect(() => {
    // Create the effect that will track Axion dependencies
    if (!effectRef.current) {
      const dispose = createEffect(() => {
        // Run cleanup function from previous run if it exists
        if (typeof cleanupRef.current === "function") {
          cleanupRef.current();
          cleanupRef.current = undefined;
        }

        // Run the effect function and capture any cleanup function
        const cleanup = effectFn();
        cleanupRef.current = cleanup;

        // Return cleanup function for effect system
        return () => {
          if (typeof cleanupRef.current === "function") {
            cleanupRef.current();
            cleanupRef.current = undefined;
          }
        };
      });

      // Store the dispose function
      effectRef.current = dispose;
    }

    // Clean up the effect on unmount
    return () => {
      if (effectRef.current) {
        effectRef.current();
        effectRef.current = undefined;
      }
    };
  }, deps);
}

/**
 * React hook for creating and using an Axion atom within a component
 *
 * @param initialState Initial state for the atom
 * @param options Options for atom creation
 * @returns [state, setState, atom] tuple
 */
export function useAtom<T>(
  initialState: T,
  options?: Parameters<typeof createAtom>[1]
): [T, (value: T | ((current: T) => T)) => void, Atom<T>] {
  // Create atom ref to ensure it persists across renders
  const atomRef = useRef<Atom<T>>();

  // Create atom on first render if it doesn't exist
  if (!atomRef.current) {
    atomRef.current = createAtom(initialState, options);
  }

  // Get current atom instance
  const atom = atomRef.current;

  // Subscribe to atom changes
  const state = useAxion(atom);

  // Create setter function
  const setState = useCallback(
    (value: T | ((current: T) => T)) => {
      if (typeof value === "function") {
        // Handle updater function
        const updaterFn = value as (current: T) => T;
        atom.update((current) => {
          // Ensure the current value is treated as T (not readonly)
          return updaterFn(current as T);
        });
      } else {
        // Handle direct value
        atom.set(value);
      }
    },
    [atom]
  );

  return [state, setState, atom];
}
