// src/__tests__/setup/integration.ts
// Integration test setup - uses real implementations

// React Testing Library and Jest DOM extensions
import "@testing-library/jest-dom";

// Ensure performance.now() is consistent for tests
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
  
  // Restore all mocks to ensure tests don't interfere with each other
  jest.restoreAllMocks();
});

// Ensure this file is treated as a module
export {};