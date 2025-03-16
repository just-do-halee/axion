"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTracking = isTracking;
exports.getCurrentTracker = getCurrentTracker;
exports.startTracking = startTracking;
exports.stopTracking = stopTracking;
exports.cleanupAllTracking = cleanupAllTracking;
exports.trackDependency = trackDependency;
exports.withTracking = withTracking;
exports.detectCycle = detectCycle;
exports.removeNode = removeNode;
exports.getDependencyGraph = getDependencyGraph;
exports.resetDependencyGraph = resetDependencyGraph;
var path_1 = require("../utils/path");
var errors_1 = require("../utils/errors");
var registry_1 = require("./registry");
// The global dependency graph
var dependencyGraph = new Map();
// Stack of tracking contexts
var trackingStack = [];
/**
 * Checks if dependency tracking is currently active
 * @returns true if tracking is active, false otherwise
 */
function isTracking() {
    return trackingStack.length > 0;
}
/**
 * Gets the current tracking context
 * @returns The current tracking context or null if not tracking
 */
function getCurrentTracker() {
    if (trackingStack.length === 0)
        return null;
    return trackingStack[trackingStack.length - 1];
}
/**
 * Starts dependency tracking
 * @param sourceId The ID of the atom that will depend on tracked dependencies
 * @returns The tracking context
 */
function startTracking(sourceId) {
    if (sourceId === void 0) { sourceId = null; }
    // Create a fresh tracking context with empty dependencies
    var context = {
        sourceId: sourceId,
        dependencies: new Map(),
    };
    // Add debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Starting dependency tracking".concat(sourceId ? " for ".concat(String(sourceId)) : ""));
    }
    trackingStack.push(context);
    return context;
}
/**
 * Stops dependency tracking and returns the tracked dependencies
 * @returns Map of atom IDs to sets of paths that were accessed
 */
function stopTracking() {
    if (trackingStack.length === 0) {
        throw (0, errors_1.handleError)((0, errors_1.createDependencyError)(errors_1.ErrorCode.UNKNOWN, "No active dependency tracker"));
    }
    var context = trackingStack.pop();
    var result = new Map();
    // Add debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Stopping dependency tracking".concat(context.sourceId ? " for ".concat(String(context.sourceId)) : ""), {
            dependencyCount: context.dependencies.size,
        });
    }
    // Convert DependencyPath objects to Path arrays
    for (var _i = 0, _a = context.dependencies.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], atomId = _b[0], paths = _b[1];
        var pathSet = new Set();
        for (var _c = 0, paths_1 = paths; _c < paths_1.length; _c++) {
            var depPath = paths_1[_c];
            pathSet.add(depPath.segments);
        }
        result.set(atomId, pathSet);
    }
    return result;
}
/**
 * Ensure no active tracking sessions are left
 * Useful for test cleanup and error recovery
 */
function cleanupAllTracking() {
    while (trackingStack.length > 0) {
        try {
            stopTracking();
        }
        catch (error) {
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
function trackDependency(atomId, path) {
    var tracker = getCurrentTracker();
    if (!tracker)
        return;
    // Make sure the atom exists before tracking it
    if (process.env.NODE_ENV !== "production") {
        var atom = (0, registry_1.getAtomById)(atomId);
        if (!atom) {
            console.warn("Tracking dependency on unregistered atom: ".concat(String(atomId)));
        }
    }
    // Don't track dependencies on the source atom itself
    if (tracker.sourceId && tracker.sourceId === atomId) {
        return;
    }
    // Add debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Tracking dependency: ".concat(String(atomId), " path: ").concat((0, path_1.pathToString)(path)));
    }
    // Add the dependency to the current tracking context
    if (!tracker.dependencies.has(atomId)) {
        tracker.dependencies.set(atomId, new Set());
    }
    // Convert path to a DependencyPath object
    var depPath = {
        path: (0, path_1.pathToString)(path),
        segments: __spreadArray([], path, true), // create a copy to avoid mutations
    };
    tracker.dependencies.get(atomId).add(depPath);
}
/**
 * Executes a function with dependency tracking
 * @param sourceId The ID of the source atom (optional)
 * @param fn The function to execute
 * @returns The result of the function and the tracked dependencies
 */
function withTracking(sourceId, fn) {
    // Start fresh tracking context
    startTracking(sourceId);
    try {
        // Execute the function with tracking active
        var result = fn();
        // Get the tracked dependencies
        var dependencies = stopTracking();
        // Update the dependency graph if we have a source atom
        if (sourceId) {
            try {
                updateDependencyGraph(sourceId, convertToDepPathMap(dependencies));
            }
            catch (error) {
                // If the update fails (e.g., due to circular dependency),
                // log it but don't fail the entire operation
                if (!(error instanceof errors_1.CircularDependencyError)) {
                    console.error("[Axion] Error updating dependency graph:", error);
                }
                throw error;
            }
        }
        return [result, dependencies];
    }
    catch (error) {
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
function convertToDepPathMap(pathMap) {
    var result = new Map();
    for (var _i = 0, _a = pathMap.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], atomId = _b[0], paths = _b[1];
        var depPaths = new Set();
        for (var _c = 0, paths_2 = paths; _c < paths_2.length; _c++) {
            var path = paths_2[_c];
            depPaths.add({
                path: (0, path_1.pathToString)(path),
                segments: __spreadArray([], path, true),
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
function updateDependencyGraph(sourceId, dependencies) {
    // Add debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Updating dependency graph for ".concat(String(sourceId)));
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
    var sourceNode = dependencyGraph.get(sourceId);
    // Record old dependencies before clearing them
    var oldDependencies = new Set(sourceNode.dependencies);
    // Clear previous dependencies
    for (var _i = 0, oldDependencies_1 = oldDependencies; _i < oldDependencies_1.length; _i++) {
        var depId = oldDependencies_1[_i];
        var depNode = dependencyGraph.get(depId);
        if (depNode) {
            depNode.dependents.delete(sourceId);
        }
    }
    sourceNode.dependencies.clear();
    sourceNode.paths.clear();
    // Add new dependencies
    for (var _a = 0, _b = dependencies.entries(); _a < _b.length; _a++) {
        var _c = _b[_a], atomId = _c[0], depPaths = _c[1];
        // Skip if this is a self-dependency
        if (atomId === sourceId)
            continue;
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
        var targetNode = dependencyGraph.get(atomId);
        // Add dependency relationship
        sourceNode.dependencies.add(atomId);
        targetNode.dependents.add(sourceId);
        // Add paths
        for (var _d = 0, depPaths_1 = depPaths; _d < depPaths_1.length; _d++) {
            var depPath = depPaths_1[_d];
            sourceNode.paths.add(depPath.path);
        }
    }
    // Check for circular dependencies
    try {
        var cycle = detectCycle(sourceId);
        if (cycle) {
            // Restore the old dependency graph to avoid leaving it in a broken state
            restoreDependencyGraph(sourceId, oldDependencies);
            throw new errors_1.CircularDependencyError("Circular dependency detected: ".concat(cycle.map(String).join(" -> ")), cycle);
        }
    }
    catch (error) {
        if (error instanceof errors_1.CircularDependencyError) {
            throw error;
        }
        // Handle other errors by restoring old dependencies and reporting
        restoreDependencyGraph(sourceId, oldDependencies);
        throw (0, errors_1.createDependencyError)(errors_1.ErrorCode.DEPENDENCY_ERROR, "Error detecting cycles: ".concat(String(error)), error);
    }
}
/**
 * Restores the old dependency graph in case of an error
 * @param sourceId The ID of the source atom
 * @param oldDependencies The old dependencies to restore
 */
function restoreDependencyGraph(sourceId, oldDependencies) {
    var sourceNode = dependencyGraph.get(sourceId);
    if (!sourceNode)
        return;
    // Clear current dependencies
    for (var _i = 0, _a = sourceNode.dependencies; _i < _a.length; _i++) {
        var depId = _a[_i];
        var depNode = dependencyGraph.get(depId);
        if (depNode) {
            depNode.dependents.delete(sourceId);
        }
    }
    sourceNode.dependencies.clear();
    // Restore old dependencies
    for (var _b = 0, oldDependencies_2 = oldDependencies; _b < oldDependencies_2.length; _b++) {
        var depId = oldDependencies_2[_b];
        var depNode = dependencyGraph.get(depId);
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
function detectCycle(startId) {
    // Track visited nodes to avoid infinite loops
    var visited = new Set();
    // Track the current path we're exploring
    var path = [];
    // Recursive depth-first search function
    var dfs = function (nodeId) {
        // If the node is already in our current path, we found a cycle
        var cycleIndex = path.indexOf(nodeId);
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
        var node = dependencyGraph.get(nodeId);
        if (node) {
            // Check all dependencies for cycles
            for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
                var dependencyId = _a[_i];
                var cycle = dfs(dependencyId);
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
function removeNode(atomId) {
    // Get the node
    var node = dependencyGraph.get(atomId);
    if (!node)
        return;
    // Remove all dependency relationships
    for (var _i = 0, _a = node.dependencies; _i < _a.length; _i++) {
        var depId = _a[_i];
        var depNode = dependencyGraph.get(depId);
        if (depNode) {
            depNode.dependents.delete(atomId);
        }
    }
    // Remove all dependent relationships
    for (var _b = 0, _c = node.dependents; _b < _c.length; _b++) {
        var depId = _c[_b];
        var depNode = dependencyGraph.get(depId);
        if (depNode) {
            depNode.dependencies.delete(atomId);
        }
    }
    // Remove the node
    dependencyGraph.delete(atomId);
}
/**
 * Get the current dependency graph (for debugging)
 */
function getDependencyGraph() {
    return new Map(dependencyGraph);
}
/**
 * Reset the entire dependency graph (for testing)
 */
function resetDependencyGraph() {
    dependencyGraph.clear();
}
