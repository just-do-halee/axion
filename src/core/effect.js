"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEffect = createEffect;
// src/core/effect.ts - Fixed Implementation
var dependency_1 = require("../internals/dependency");
var registry_1 = require("../internals/registry");
var errors_1 = require("../utils/errors");
/**
 * Creates a reactive effect that automatically re-runs when its dependencies change
 *
 * Effects are similar to derived states but instead of computing a value, they
 * perform side effects like DOM updates, network requests, etc.
 *
 * @param effectFn The effect function to run
 * @returns A function to clean up the effect
 */
function createEffect(effectFn) {
    if (typeof effectFn !== "function") {
        throw (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Effect must be a function"));
    }
    // Effect state
    var isActive = true;
    var cleanup;
    // Subscription list
    var subscriptions = [];
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
            }
            catch (error) {
                (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error in effect cleanup function", undefined, error));
            }
            cleanup = undefined;
        }
        try {
            // Debug logging in development
            if (process.env.NODE_ENV !== "production") {
                console.debug("[Axion] Running effect");
            }
            // Run the effect with dependency tracking
            var _a = (0, dependency_1.withTracking)(null, function () {
                return effectFn(undefined);
            }), effectResult = _a[0], dependencies = _a[1];
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
            for (var _i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
                var unsubscribe = subscriptions_1[_i];
                try {
                    unsubscribe();
                }
                catch (error) {
                    (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error unsubscribing from dependency", undefined, error));
                }
            }
            subscriptions.length = 0;
            // Set up new subscriptions
            for (var _b = 0, _c = dependencies.entries(); _b < _c.length; _b++) {
                var _d = _c[_b], atomId = _d[0], paths = _d[1];
                // Get the atom reference
                var atom = (0, registry_1.getAtomById)(atomId);
                if (!atom) {
                    (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.ATOM_NOT_FOUND, "Atom with id ".concat(String(atomId), " not found")));
                    continue;
                }
                try {
                    // ADDED CODE: Check if atom contains a primitive value
                    var isPrimitive = typeof atom.get() !== "object" || atom.get() === null;
                    // Determine the subscription approach based on paths
                    if (paths.size === 0 || isPrimitive) {
                        // Subscribe to the entire atom
                        subscriptions.push(atom.subscribe(runEffect));
                    }
                    else {
                        // Subscribe to multiple paths
                        for (var _e = 0, paths_1 = paths; _e < paths_1.length; _e++) {
                            var path = paths_1[_e];
                            subscriptions.push(atom.subscribePath(path, runEffect));
                        }
                    }
                }
                catch (error) {
                    // Log the error but continue processing other dependencies
                    (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.SUBSCRIPTION_ERROR, "Error subscribing to ".concat(String(atomId)), undefined, error));
                }
            }
        }
        catch (error) {
            (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error in effect function", undefined, error));
        }
    }
    // Initial execution
    runEffect();
    // Return cleanup function
    return function () {
        // Mark as inactive first to prevent re-execution
        isActive = false;
        // Debug logging in development
        if (process.env.NODE_ENV !== "production") {
            console.debug("[Axion] Disposing effect");
        }
        // Unsubscribe from all dependencies
        for (var _i = 0, subscriptions_2 = subscriptions; _i < subscriptions_2.length; _i++) {
            var unsubscribe = subscriptions_2[_i];
            try {
                unsubscribe();
            }
            catch (error) {
                (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error unsubscribing during effect disposal", undefined, error));
            }
        }
        subscriptions.length = 0;
        // Run cleanup function
        if (typeof cleanup === "function") {
            try {
                cleanup();
            }
            catch (error) {
                (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error in effect cleanup during disposal", undefined, error));
            }
            cleanup = undefined;
        }
    };
}
