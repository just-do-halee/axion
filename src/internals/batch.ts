// src/internals/batch.ts
import { createStateError, ErrorCode, handleError } from "../utils/errors";

/**
 * Current batch depth
 */
let batchDepth = 0;

/**
 * Pending effects to run when batch completes
 */
const pendingEffects = new Set<() => void>();

/**
 * Check if we're currently in a batch
 */
export function isBatching(): boolean {
  return batchDepth > 0;
}

/**
 * Set of valid effect function types
 */
type EffectCallback = (() => void) | undefined | null;

/**
 * Schedule an effect to run after batching completes
 * 
 * @param effect Function to execute after the batch completes
 * If a non-function is provided, it will be silently ignored
 */
export function scheduleBatchedEffect(effect: EffectCallback): void {
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
let effectsRunScheduled = false;

/**
 * Schedule effects to run in the next microtask
 * This separates effect execution from state changes for more predictable behavior
 */
function scheduleEffectsRun() {
  // If already scheduled, don't schedule again
  if (effectsRunScheduled) return;

  effectsRunScheduled = true;

  // Use queueMicrotask for more consistent behavior across browsers
  // Make sure to clear the flag even if an error occurs
  queueMicrotask(() => {
    try {
      // Only run if we're not in a batch 
      // (nested effects can cause this to run during a batch)
      if (!isBatching()) {
        runPendingEffects();
      }
    } finally {
      effectsRunScheduled = false;
    }
  });
}

/**
 * Run all pending effects
 */
function runPendingEffects(): void {
  // No effects to run
  if (pendingEffects.size === 0) return;

  // Make a copy of the effects to run and clear the set before running
  // This prevents issues if an effect fails and allows new effects to be scheduled
  const effects = Array.from(pendingEffects);
  pendingEffects.clear();

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Axion] Running ${effects.length} batched effects`);
  }

  // Track if any errors occurred during effect execution
  let hasErrors = false;

  // Run all effects
  for (const effect of effects) {
    try {
      effect();
    } catch (error) {
      hasErrors = true;
      handleError(
        createStateError(
          ErrorCode.UNKNOWN,
          "Error in batched effect",
          undefined,
          error
        )
      );
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
    console.debug(`[Axion] Some effects had errors but execution continued`);
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
export function executeBatch<T>(callback: () => T): T {
  // Track if this is the outermost batch
  const isOutermostBatch = batchDepth === 0;
  
  // Start a new batch or increment depth
  batchDepth++;

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Axion] Starting batch (depth: ${batchDepth})`);
  }

  let result: T;
  let error: unknown = null;

  try {
    // Run the callback
    result = callback();
  } catch (e) {
    // Capture error for later handling
    error = e;
  } 
  
  // Always decrement batch depth, even on error
  batchDepth--;

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Axion] Ending batch (depth: ${batchDepth})`);
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
    handleError(
      createStateError(
        ErrorCode.TRANSACTION_ERROR,
        "Error in transaction",
        undefined,
        error
      )
    );
    throw error;
  }

  // Return the result
  return result!;
}
