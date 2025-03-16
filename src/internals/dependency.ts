// src/internals/dependency.ts - Fixed implementation
import {
  AtomId,
  TrackingContext,
  DependencyNode,
  DependencyPath,
} from "../core/core-types";
import { Path } from "../utils/types";
import { pathToString } from "../utils/path";
import {
  ErrorCode,
  CircularDependencyError,
  handleError,
  createDependencyError,
} from "../utils/errors";
import { getAtomById } from "./registry";

// The global dependency graph
const dependencyGraph = new Map<AtomId, DependencyNode>();

// Stack of tracking contexts
const trackingStack: TrackingContext[] = [];

/**
 * Checks if dependency tracking is currently active
 * @returns true if tracking is active, false otherwise
 */
export function isTracking(): boolean {
  return trackingStack.length > 0;
}

/**
 * Gets the current tracking context
 * @returns The current tracking context or null if not tracking
 */
export function getCurrentTracker(): TrackingContext | null {
  if (trackingStack.length === 0) return null;
  return trackingStack[trackingStack.length - 1];
}

/**
 * Starts dependency tracking
 * @param sourceId The ID of the atom that will depend on tracked dependencies
 * @returns The tracking context
 */
export function startTracking(sourceId: AtomId | null = null): TrackingContext {
  // Create a fresh tracking context with empty dependencies
  const context: TrackingContext = {
    sourceId,
    dependencies: new Map(),
  };

  // Debug logging in development mode
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[Axion] Starting dependency tracking${
        sourceId ? ` for ${String(sourceId)}` : ""
      }`
    );
  }

  trackingStack.push(context);
  return context;
}

/**
 * Stops dependency tracking and returns the tracked dependencies
 * @returns Map of atom IDs to sets of paths that were accessed
 */
export function stopTracking(): Map<AtomId, Set<Path>> {
  if (trackingStack.length === 0) {
    throw handleError(
      createDependencyError(ErrorCode.UNKNOWN, "No active dependency tracker")
    );
  }

  const context = trackingStack.pop()!;
  const result = new Map<AtomId, Set<Path>>();

  // Debug logging in development mode
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[Axion] Stopping dependency tracking${
        context.sourceId ? ` for ${String(context.sourceId)}` : ""
      }`,
      {
        dependencyCount: context.dependencies.size,
      }
    );
  }

  // Convert DependencyPath objects to Path arrays
  for (const [atomId, paths] of context.dependencies.entries()) {
    const pathSet = new Set<Path>();
    for (const depPath of paths) {
      pathSet.add(depPath.segments);
    }
    result.set(atomId, pathSet);
  }

  return result;
}

/**
 * Clean up all tracking sessions
 * Useful for testing and error recovery
 */
export function cleanupAllTracking(): void {
  while (trackingStack.length > 0) {
    try {
      stopTracking();
    } catch (error) {
      // Just clear the stack if we can't properly stop tracking
      console.error("[Axion] Error cleaning up tracking", error);
      trackingStack.length = 0;
      break;
    }
  }
}

/**
 * Tracks a dependency access during tracking
 * @param atomId The ID of the atom being accessed
 * @param path The path within the atom being accessed
 */
export function trackDependency(atomId: AtomId, path: Path): void {
  const tracker = getCurrentTracker();
  if (!tracker) return;

  // Make sure the atom exists before tracking it
  if (process.env.NODE_ENV !== "production") {
    const atom = getAtomById(atomId);
    if (!atom) {
      console.warn(
        `Tracking dependency on unregistered atom: ${String(atomId)}`
      );
    }
  }

  // Don't track dependencies on the source atom itself
  if (tracker.sourceId && tracker.sourceId === atomId) {
    return;
  }

  // Debug logging in development mode
  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[Axion] Tracking dependency: ${String(atomId)} path: ${pathToString(
        path
      )}`
    );
  }

  // Add the dependency to the current tracking context
  if (!tracker.dependencies.has(atomId)) {
    tracker.dependencies.set(atomId, new Set());
  }

  // Convert path to a DependencyPath object
  const depPath: DependencyPath = {
    path: pathToString(path),
    segments: [...path], // create a copy to avoid mutations
  };

  tracker.dependencies.get(atomId)!.add(depPath);
}

/**
 * Executes a function with dependency tracking
 * @param sourceId The ID of the source atom (optional)
 * @param fn The function to execute
 * @returns The result of the function and the tracked dependencies
 */
export function withTracking<T>(
  sourceId: AtomId | null,
  fn: () => T
): [T, Map<AtomId, Set<Path>>] {
  // Start fresh tracking context
  startTracking(sourceId);

  try {
    // Execute the function with tracking active
    const result = fn();

    // Get the tracked dependencies
    const dependencies = stopTracking();

    // Update the dependency graph if we have a source atom
    if (sourceId) {
      try {
        updateDependencyGraph(sourceId, convertToDepPathMap(dependencies));
      } catch (error) {
        // If the update fails (e.g., due to circular dependency),
        // log it but don't fail the entire operation
        if (!(error instanceof CircularDependencyError)) {
          console.error("[Axion] Error updating dependency graph:", error);
        }
        throw error;
      }
    }

    return [result, dependencies];
  } catch (error) {
    // Always clean up tracking state on error
    if (trackingStack.length > 0) {
      stopTracking();
    }
    throw error;
  }
}

/**
 * Helper to convert from Map<AtomId, Set<Path>> to Map<AtomId, Set<DependencyPath>>
 */
function convertToDepPathMap(
  pathMap: Map<AtomId, Set<Path>>
): Map<AtomId, Set<DependencyPath>> {
  const result = new Map<AtomId, Set<DependencyPath>>();

  for (const [atomId, paths] of pathMap.entries()) {
    const depPaths = new Set<DependencyPath>();

    for (const path of paths) {
      depPaths.add({
        path: pathToString(path),
        segments: [...path],
      });
    }

    result.set(atomId, depPaths);
  }

  return result;
}

/**
 * Updates the dependency graph with new dependencies
 * @param sourceId The ID of the source atom
 * @param dependencies The dependencies to add
 * @throws CircularDependencyError if adding these dependencies would create a cycle
 */
function updateDependencyGraph(
  sourceId: AtomId,
  dependencies: Map<AtomId, Set<DependencyPath>>
): void {
  // Debug logging in development mode
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Axion] Updating dependency graph for ${String(sourceId)}`);
  }

  // Ensure the source node exists
  if (!dependencyGraph.has(sourceId)) {
    dependencyGraph.set(sourceId, {
      id: sourceId,
      paths: new Set(),
      dependents: new Set(),
      dependencies: new Set(),
    });
  }

  // Get the source node
  const sourceNode = dependencyGraph.get(sourceId)!;

  // Record old dependencies before clearing them
  const oldDependencies = new Set(sourceNode.dependencies);

  // Clear previous dependencies
  for (const depId of oldDependencies) {
    const depNode = dependencyGraph.get(depId);
    if (depNode) {
      depNode.dependents.delete(sourceId);
    }
  }

  sourceNode.dependencies.clear();
  sourceNode.paths.clear();

  // Add new dependencies
  for (const [atomId, depPaths] of dependencies.entries()) {
    // Skip if this is a self-dependency
    if (atomId === sourceId) continue;

    // Ensure target node exists
    if (!dependencyGraph.has(atomId)) {
      dependencyGraph.set(atomId, {
        id: atomId,
        paths: new Set(),
        dependents: new Set(),
        dependencies: new Set(),
      });
    }

    // Get target node
    const targetNode = dependencyGraph.get(atomId)!;

    // Add dependency relationship
    sourceNode.dependencies.add(atomId);
    targetNode.dependents.add(sourceId);

    // Add paths
    for (const depPath of depPaths) {
      sourceNode.paths.add(depPath.path);
    }
  }

  // Check for circular dependencies
  try {
    const cycle = detectCycle(sourceId);
    if (cycle) {
      // Restore the old dependency graph to avoid leaving it in a broken state
      restoreDependencyGraph(sourceId, oldDependencies);

      throw new CircularDependencyError(
        `Circular dependency detected: ${cycle.map(String).join(" -> ")}`,
        cycle
      );
    }
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      throw error;
    }

    // Handle other errors by restoring old dependencies and reporting
    restoreDependencyGraph(sourceId, oldDependencies);

    throw createDependencyError(
      ErrorCode.DEPENDENCY_ERROR,
      `Error detecting cycles: ${String(error)}`,
      error
    );
  }
}

/**
 * Restores the old dependency graph in case of an error
 * @param sourceId The ID of the source atom
 * @param oldDependencies The old dependencies to restore
 */
function restoreDependencyGraph(
  sourceId: AtomId,
  oldDependencies: Set<AtomId>
): void {
  const sourceNode = dependencyGraph.get(sourceId);
  if (!sourceNode) return;

  // Clear current dependencies
  for (const depId of sourceNode.dependencies) {
    const depNode = dependencyGraph.get(depId);
    if (depNode) {
      depNode.dependents.delete(sourceId);
    }
  }

  sourceNode.dependencies.clear();

  // Restore old dependencies
  for (const depId of oldDependencies) {
    const depNode = dependencyGraph.get(depId);
    if (depNode) {
      depNode.dependents.add(sourceId);
      sourceNode.dependencies.add(depId);
    }
  }
}

/**
 * Detects if there are any circular dependencies from the given starting atom
 * @param startId The ID of the atom to check for circular dependencies
 * @returns An array of atom IDs representing the cycle, or null if no cycle
 */
export function detectCycle(startId: AtomId): AtomId[] | null {
  // Track visited nodes to avoid infinite loops
  const visited = new Set<AtomId>();
  // Track the current path we're exploring
  const path: AtomId[] = [];

  // Recursive depth-first search function
  const dfs = (nodeId: AtomId): AtomId[] | null => {
    // If the node is already in our current path, we found a cycle
    const cycleIndex = path.indexOf(nodeId);
    if (cycleIndex >= 0) {
      return path.slice(cycleIndex).concat(nodeId);
    }

    // If we've already explored this node (and found no cycles), skip it
    if (visited.has(nodeId)) {
      return null;
    }

    // Mark node as visited and add to current path
    visited.add(nodeId);
    path.push(nodeId);

    // Get the node from the graph
    const node = dependencyGraph.get(nodeId);
    if (node) {
      // Check all dependencies for cycles
      for (const dependencyId of node.dependencies) {
        const cycle = dfs(dependencyId);
        if (cycle) {
          return cycle;
        }
      }
    }

    // Backtrack - remove from current path
    path.pop();
    return null;
  };

  return dfs(startId);
}

/**
 * Removes a node from the dependency graph
 * Used for cleanup when atoms are garbage collected
 * @param atomId The ID of the atom to remove
 */
export function removeNode(atomId: AtomId): void {
  // Get the node
  const node = dependencyGraph.get(atomId);
  if (!node) return;

  // Remove all dependency relationships
  for (const depId of node.dependencies) {
    const depNode = dependencyGraph.get(depId);
    if (depNode) {
      depNode.dependents.delete(atomId);
    }
  }

  // Remove all dependent relationships
  for (const depId of node.dependents) {
    const depNode = dependencyGraph.get(depId);
    if (depNode) {
      depNode.dependencies.delete(atomId);
    }
  }

  // Remove the node
  dependencyGraph.delete(atomId);
}

/**
 * Get the current dependency graph for debugging
 */
export function getDependencyGraph(): Map<AtomId, DependencyNode> {
  return new Map(dependencyGraph);
}

/**
 * Reset the entire dependency graph for testing
 */
export function resetDependencyGraph(): void {
  dependencyGraph.clear();
}
