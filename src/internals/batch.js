"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBatching = isBatching;
exports.scheduleBatchedEffect = scheduleBatchedEffect;
exports.executeBatch = executeBatch;
// src/internals/batch.ts
var errors_1 = require("../utils/errors");
/**
 * Current batch depth
 */
var batchDepth = 0;
/**
 * Pending effects to run when batch completes
 */
var pendingEffects = new Set();
/**
 * Check if we're currently in a batch
 */
function isBatching() {
    return batchDepth > 0;
}
/**
 * Schedule an effect to run after batching completes
 *
 * @param effect Function to execute after the batch completes
 * If a non-function is provided, it will be silently ignored
 */
function scheduleBatchedEffect(effect) {
    if (typeof effect !== "function") {
        return;
    }
    pendingEffects.add(effect);
    // Automatically schedule a microtask to run effects if not batching
    if (!isBatching()) {
        scheduleEffectsRun();
    }
}
/**
 * A flag to track if effects run is already scheduled
 */
var effectsRunScheduled = false;
/**
 * Schedule effects to run in the next microtask
 * This separates effect execution from state changes for more predictable behavior
 */
function scheduleEffectsRun() {
    // If already scheduled, don't schedule again
    if (effectsRunScheduled)
        return;
    effectsRunScheduled = true;
    // Use queueMicrotask for more consistent behavior across browsers
    // Make sure to clear the flag even if an error occurs
    queueMicrotask(function () {
        try {
            // Only run if we're not in a batch 
            // (nested effects can cause this to run during a batch)
            if (!isBatching()) {
                runPendingEffects();
            }
        }
        finally {
            effectsRunScheduled = false;
        }
    });
}
/**
 * Run all pending effects
 */
function runPendingEffects() {
    // No effects to run
    if (pendingEffects.size === 0)
        return;
    // Make a copy of the effects to run and clear the set before running
    // This prevents issues if an effect fails and allows new effects to be scheduled
    var effects = Array.from(pendingEffects);
    pendingEffects.clear();
    // Debug logging
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Running ".concat(effects.length, " batched effects"));
    }
    // Track if any errors occurred during effect execution
    var hasErrors = false;
    // Run all effects
    for (var _i = 0, effects_1 = effects; _i < effects_1.length; _i++) {
        var effect = effects_1[_i];
        try {
            effect();
        }
        catch (error) {
            hasErrors = true;
            (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error in batched effect", undefined, error));
        }
    }
    // Check if new effects were scheduled during this run
    if (pendingEffects.size > 0) {
        // Schedule another run to handle these new effects
        // If we're in a batch, they'll be run when the batch completes
        // Otherwise, schedule them for the next microtask
        if (!isBatching()) {
            scheduleEffectsRun();
        }
    }
    // Log errors in development mode
    if (hasErrors && process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Some effects had errors but execution continued");
    }
}
/**
 * Execute a function in a transaction/batch
 *
 * Batches group multiple state updates into a single notification event,
 * which improves performance by reducing redundant updates and ensures
 * state consistency.
 *
 * @param callback The function to execute within the batch
 * @returns The result of the callback function
 */
function executeBatch(callback) {
    // Track if this is the outermost batch
    var isOutermostBatch = batchDepth === 0;
    // Start a new batch or increment depth
    batchDepth++;
    // Debug logging
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Starting batch (depth: ".concat(batchDepth, ")"));
    }
    var result;
    var error = null;
    try {
        // Run the callback
        result = callback();
    }
    catch (e) {
        // Capture error for later handling
        error = e;
    }
    // Always decrement batch depth, even on error
    batchDepth--;
    // Debug logging
    if (process.env.NODE_ENV !== "production") {
        console.debug("[Axion] Ending batch (depth: ".concat(batchDepth, ")")); 
    }
    // Only run pending effects when we exit the outermost batch
    // This ensures all state changes have been processed before effects run
    if (isOutermostBatch && pendingEffects.size > 0) {
        // Execute the effects synchronously rather than scheduling them
        // This ensures effects run predictably after the batch completes
        runPendingEffects();
    }
    // Now handle any error that occurred
    if (error !== null) {
        (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.TRANSACTION_ERROR, "Error in transaction", undefined, error));
        throw error;
    }
    // Return the result
    return result;
}
