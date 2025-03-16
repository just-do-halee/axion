// Test importing from local path with TypeScript
import axion, { createAtom, Atom } from "axion-state";
import { useAxion } from "axion-state/react";

// Create a typed state
interface CountState {
  count: number;
}

// Initialize the state
const state: CountState = { count: 0 };

// Create atom with explicit type annotation
const ax: Atom<CountState> = createAtom<CountState>(state);

// Alternative syntax using axion directly with type parameters
const ax2 = axion<CountState>(state);

// Use the atom with React hook
const value = useAxion(ax);

// Test VERSION property
console.log("axion VERSION:", axion.VERSION);
console.log("axion:", axion);
console.log("useAxion:", useAxion);
