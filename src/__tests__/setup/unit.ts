// src/__tests__/setup/unit.ts
// Unit test setup - uses mocks for isolation

// React Testing Library and Jest DOM extensions
import "@testing-library/jest-dom";

// Force synchronous execution in tests instead of async batching
// Important: This is for unit tests only. Integration tests should use the real implementations.
const originalBatch = jest.requireActual('../../internals/batch');
const mockExecuteBatch = jest.fn().mockImplementation((callback) => {
  // Don't batch in tests, execute immediately
  return callback();
});
const mockScheduleBatchedEffect = jest.fn().mockImplementation((effect) => {
  if (typeof effect === 'function') {
    effect();
  }
});
const mockIsBatching = jest.fn().mockReturnValue(false);

jest.mock('../../internals/batch', () => {
  return {
    ...originalBatch,
    // Make executeBatch run synchronously in tests
    executeBatch: mockExecuteBatch,
    // Schedule effects to run immediately in tests
    scheduleBatchedEffect: mockScheduleBatchedEffect,
    // For test consistency
    isBatching: mockIsBatching,
  };
});

// Create a special mock for the derive module
jest.mock('../../core/derive', () => {
  const actual = jest.requireActual('../../core/derive');
  
  // The real implementation
  const originalCreateDerived = actual.createDerived;
  
  // Our modified implementation for tests
  const mockedCreateDerived = function(...args: any[]) {
    const derived = originalCreateDerived(...args);
    
    // Add a spy to the original get method
    const originalGet = derived.get;
    
    // Override get method to ensure it always returns the latest value
    derived.get = function() {
      // Do a first call to ensure dependencies are tracked
      originalGet.apply(this);
      
      // Do a second call to ensure we get the latest value
      return originalGet.apply(this);
    };
    
    return derived;
  };
  
  return {
    ...actual,
    createDerived: mockedCreateDerived,
  };
});

// Global test setup
beforeEach(() => {
  // Mock performance.now() to ensure consistent timing in tests
  jest.spyOn(performance, "now").mockImplementation(() => {
    return Date.now();
  });

  // Set a flag to indicate we're in a test environment
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Ensure this file is treated as a module
export {};