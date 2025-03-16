// src/index.ts - Main entry point

import { createAtom } from "./core/atom";
import { createDerived } from "./core/derive";
import { createEffect } from "./core/effect";
import { transaction } from "./core/transaction";
import { getTimeAPI, TimeAPI } from "./time/history";
import { setErrorHandler } from "./utils/errors";

// Import the shared types from core
import { Atom, PathOperator } from "./core/core-types";
import { DeepReadonly, Options } from "./utils/types";

// Import version from package.json
import { version } from "../package.json";

// Import debug utilities for initialization
import "./debug";

// Re-export core types for consumers
export type { Atom, DeepReadonly, PathOperator, TimeAPI, Options };

/**
 * Axion API interface - defines the complete public API
 */
export interface AxionStatic {
  /**
   * Creates a state atom
   * @param initialState Initial state value
   * @param options Optional configuration
   * @returns A state atom
   */
  <T>(initialState: T, options?: Options<T>): Atom<T>;

  /**
   * Creates a derived state that computes based on other atoms
   * @param compute Computation function
   * @param options Optional configuration
   * @returns A read-only derived atom
   */
  derive: <T>(
    compute: () => T,
    options?: {
      equals?: (a: T, b: T) => boolean;
      name?: string;
    }
  ) => Atom<T>;

  /**
   * Creates a reactive effect that runs when dependencies change
   * @param effectFn Effect function
   * @returns A cleanup function
   */
  effect: <T = void>(
    effectFn: (state: DeepReadonly<T>) => void | (() => void)
  ) => () => void;

  /**
   * Executes a transaction, batching multiple state changes
   * @param callback Transaction function
   * @returns The function result
   */
  tx: <T>(callback: () => T) => T;

  /**
   * Gets time travel API for an atom
   * @param atom The atom to track history for
   * @returns Time travel API
   */
  getTimeAPI: <T>(atom: Atom<T>) => TimeAPI<T>;

  /**
   * Sets the global error handler
   * @param handler Error handler function
   */
  setErrorHandler: typeof setErrorHandler;

  /**
   * Library version
   */
  readonly VERSION: string;
}

/**
 * Creates the Axion API
 * Factory function to create the full API object
 */
function createAxionAPI(): AxionStatic {
  // Create the atom creator function that will be the main export
  const atomCreate = <T>(
    initialState: T,
    options: Options<T> = {}
  ): Atom<T> => {
    return createAtom<T>(initialState, options) as Atom<T>;
  };

  // Create the complete API with all methods
  const api: AxionStatic = Object.assign(atomCreate, {
    derive: createDerived,
    effect: createEffect,
    tx: transaction,
    getTimeAPI: getTimeAPI,
    setErrorHandler: setErrorHandler,
    // Library version from package.json
    VERSION: version,
  });

  return api;
}

// Create the main Axion instance and freeze it to prevent modifications
const axion = Object.freeze(createAxionAPI()) as AxionStatic;

// Export all core functionality for subpath imports
export {
  createAtom,
  createDerived,
  createEffect,
  transaction,
  getTimeAPI,
  setErrorHandler,
};

// Export the main API
export default axion;
