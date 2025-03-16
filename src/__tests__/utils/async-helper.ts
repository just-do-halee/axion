// src/__tests__/utils/async-helper.ts

// Global state to track fake timer usage
let usingFakeTimers = false;

/**
 * Helper to set up tests with consistent timing control
 */
export function setupAsyncTest() {
  beforeEach(() => {
    jest.useFakeTimers();
    usingFakeTimers = true;
  });

  afterEach(() => {
    jest.useRealTimers();
    usingFakeTimers = false;
  });
}
/**
 * Helper function to flush all pending async operations
 * This ensures that effects, derived states, and subscriptions
 * have been processed before making assertions
 */
export async function flushAsyncOperations(): Promise<void> {
  // Wait for microtasks to complete
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Use the global flag to determine if we should run timers
  if (typeof jest !== "undefined" && usingFakeTimers) {
    jest.runAllTimers();
  }

  // Wait one more microtask cycle
  await new Promise((resolve) => setTimeout(resolve, 0));
}
