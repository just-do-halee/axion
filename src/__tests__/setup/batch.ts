// src/__tests__/setup/batch.ts
// Special setup file for batch testing

// React Testing Library and Jest DOM extensions
import "@testing-library/jest-dom";

// This setup specifically avoids mocking batch functionality
// to test the real batching behavior

// Mock error handling
jest.mock('../../utils/errors', () => {
  const originalModule = jest.requireActual('../../utils/errors');
  return {
    ...originalModule,
    handleError: jest.fn((error) => {
      // Log errors for easier debugging
      console.error(`[MockedError] ${error.message || 'Unknown error'}`);
      return error;
    }),
    createStateError: jest.fn().mockImplementation((code, message, details, cause) => ({
      code,
      message,
      details,
      cause
    }))
  };
});

// No need to store the original since we're using jest.fn() to create a spy

// Override queueMicrotask with a version we can control in tests
global.queueMicrotask = jest.fn((cb) => {
  // Use setTimeout with 0ms delay for predictable behavior in tests
  return setTimeout(cb, 0);
});

// Global test setup
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Use fake timers for controlled timer execution
  jest.useFakeTimers({
    // Use modern timer implementation
    legacyFakeTimers: false
  });
  
  // Mock performance.now() to ensure consistent timing in tests
  jest.spyOn(performance, "now").mockImplementation(() => Date.now());

  // Set a flag to indicate we're in a test environment
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Restore real timers
  jest.useRealTimers();
  
  // Clear mocks
  jest.clearAllMocks();
});

// Expose helper function to run all pending microtasks
export function flushMicrotasks() {
  // Run all timers once to process microtasks
  jest.runAllTimers();
}

// Ensure this file is treated as a module
export {};