// src/debug.ts

import { AtomId } from "./utils/types";
import { getAtomById } from "./internals/registry";

/**
 * Debug utilities for Axion
 * These are exposed globally for development and testing purposes
 */
interface AxionDebug {
  /**
   * Get an atom by its ID from the registry
   */
  getAtomById: (id: AtomId) => any | undefined;

  /**
   * Get the dependency graph for visualization
   */
  getDependencyGraph: () => {
    nodes: Array<{
      id: string;
      type: "atom" | "derived" | "effect";
      label: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      type: "depends" | "updates";
    }>;
  };

  /**
   * Print all atoms and their values to the console
   */
  printAtoms: () => void;
}

// Create debug object with methods
const debug: AxionDebug = {
  getAtomById,
  getDependencyGraph: () => {
    // This is a stub implementation
    // In development mode, this would be a real implementation
    return {
      nodes: [],
      edges: []
    };
  },
  printAtoms: () => {
    // This is a stub implementation
    // In development mode, this would print all atoms
    console.log("Printing atoms is only available in development mode");
  }
};

// Make debug tools available globally for development
declare global {
  interface Window {
    __AXION_DEBUG__: AxionDebug;
  }
}

// Expose debug tools in development mode
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__AXION_DEBUG__ = debug;
}

export default debug;