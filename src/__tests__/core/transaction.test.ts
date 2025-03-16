/**
 * Tests for transaction functionality
 */

import { transaction } from "../../core/transaction";
import { createAtom } from "../../core/atom";
import { executeBatch } from "../../internals/batch";

// Mock batch module directly
jest.mock("../../internals/batch", () => {
  const originalModule = jest.requireActual("../../internals/batch");
  return {
    ...originalModule,
    executeBatch: jest.fn(callback => callback())
  };
});

describe("Transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute callback in a batch", () => {
    // Prepare test data
    const result = { success: true };
    const callback = jest.fn().mockReturnValue(result);
    
    // Execute transaction
    const returnedValue = transaction(callback);
    
    // Check transaction behavior
    expect(executeBatch).toHaveBeenCalledWith(callback);
    expect(callback).toHaveBeenCalled();
    expect(returnedValue).toBe(result);
  });

  test("should execute multiple state changes as a single operation", () => {
    // Create test atoms
    const count = createAtom(0);
    const message = createAtom("");
    
    // Subscribe to atoms to check notification behavior
    const countHandler = jest.fn();
    const messageHandler = jest.fn();
    
    count.subscribe(countHandler);
    message.subscribe(messageHandler);
    
    // Execute transaction with multiple updates
    transaction(() => {
      count.set(1);
      message.set("Updated");
    });
    
    // Both values should be updated
    expect(count.get()).toBe(1);
    expect(message.get()).toBe("Updated");
    
    // Subscribers should be notified exactly once
    expect(countHandler).toHaveBeenCalledTimes(1);
    expect(messageHandler).toHaveBeenCalledTimes(1);
  });

  test("should handle errors in transaction", () => {
    // Prepare test data
    const atom = createAtom(0);
    const errorMessage = "Transaction error";
    
    // Define a transaction that throws an error
    const transactionWithError = () => {
      transaction(() => {
        atom.set(5);
        throw new Error(errorMessage);
      });
    };
    
    // The transaction should throw the error
    expect(transactionWithError).toThrow(errorMessage);
    
    // Changes made before the error should be preserved
    expect(atom.get()).toBe(5);
  });
});