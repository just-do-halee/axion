// Test importing from local path with TypeScript - both methods
import axion, { createAtom } from "axion-state";
import { useAxion, createAtom as cA } from "axion-state/react";

// Create a typed state
interface CountState {
  count: number;
}

// Initialize the state
const state: CountState = { count: 0 };

// Both methods of creating atoms should work with TypeScript:

// Method 1: Using axion directly
const ax1 = axion(state);

// Method 2: Using createAtom from React
const ax2 = createAtom(state);

const ax3 = cA(state);

// Both atoms should be compatible with useAxion
// In a real component, this code would work:
function Component() {
  // These would both work:
  const value1 = useAxion(ax1);

  const value2 = useAxion(ax2);

  const value3 = useAxion(ax3);

  return null;
}
