// Focused test for derived state
const axion = require('../dist/index.js').default;

console.log("Derived State Test");
console.log("-----------------");

// Create a simple counter atom
const counter = axion({ count: 10 });
console.log("Counter initial state:", counter.get());

// Create a derived state that doubles the count
const doubled = axion.derive(() => {
  console.log("Derive function executing...");
  const count = counter.get().count;
  return {
    originalCount: count,
    doubledCount: count * 2
  };
});

// Check initial derived value
console.log("\nInitial derived value:", doubled.get());

// Update the source atom
console.log("\nUpdating counter to 20...");
counter.set({ count: 20 });

// A brief delay to ensure async notifications complete
console.log("\nChecking derived value after update:");
console.log("Derived value:", doubled.get());

// Manual lookup of the values for direct comparison
console.log("\nDirect comparison:");
console.log("Source count:", counter.get().count);
console.log("Derived originalCount:", doubled.get().originalCount);
console.log("Expected doubledCount:", counter.get().count * 2);
console.log("Actual doubledCount:", doubled.get().doubledCount);

// Test subscription to derived state to see if changes propagate
console.log("\nTesting derived state subscriptions:");
let derivedStateChanged = false;

const unsubscribe = doubled.subscribe(() => {
  derivedStateChanged = true;
  console.log("Derived state subscription triggered!");
  console.log("New derived value:", doubled.get());
});

console.log("Updating counter to 30...");
counter.set({ count: 30 });

// Check if subscription was triggered
console.log("\nDerived state changed:", derivedStateChanged);

// Cleanup
unsubscribe();

console.log("\nTest completed.");