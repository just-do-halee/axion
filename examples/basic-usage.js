// This file follows exactly the examples from the README
const axion = require('../dist/index.js').default;

console.log("Testing README examples...");

// === Basic Usage ===
console.log("\n=== Basic Usage ===");

// Create a state atom
const counter = axion({ count: 0 });

// Read state
console.log("Initial count:", counter.get().count); // 0

// Update state through paths
counter.at("count").set(1);
console.log("After set:", counter.get().count); // 1

counter.at("count").update((n) => n + 1);
console.log("After update:", counter.get().count); // 2

// Subscribe to changes
const unsubscribe = counter.subscribe(() => {
  console.log("Subscription triggered - New count:", counter.get().count);
});

counter.at("count").set(5);
unsubscribe(); // Stop listening to changes
counter.at("count").set(10); // This won't trigger the subscription

// === Derived State ===
console.log("\n=== Derived State ===");

const numbers = axion({ values: [1, 2, 3, 4, 5] });

// Create derived state with automatic dependency tracking
const stats = axion.derive(() => {
  const values = numbers.get().values;
  return {
    sum: values.reduce((a, b) => a + b, 0),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
  };
});

console.log("Initial stats:", stats.get());

// Update source state - derived state should recalculate automatically
numbers.at("values").update((values) => [...values, 6]);

console.log("Updated stats:", stats.get());

// === Transactions ===
console.log("\n=== Transactions ===");

const bankAccount = axion({
  balance: 1000,
  transactions: [],
  lastUpdated: null,
});

console.log("Initial bankAccount:", bankAccount.get());

// Execute multiple updates as a single atomic operation
axion.tx(() => {
  // Withdraw money
  bankAccount.at("balance").update((balance) => balance - 100);

  // Add transaction record
  bankAccount
    .at("transactions")
    .update((transactions) => [
      ...transactions,
      { type: "withdrawal", amount: 100, date: new Date().toISOString() },
    ]);

  // Update timestamp
  bankAccount.at("lastUpdated").set(new Date().toISOString());
});

console.log("After transaction:", bankAccount.get());

// === Time Travel ===
console.log("\n=== Time Travel ===");

const counterState = axion({ count: 0 });
const timeAPI = axion.getTimeAPI(counterState);

// Make some changes
console.log("Initial:", counterState.get().count);

counterState.at("count").set(1);
console.log("After first change:", counterState.get().count);

counterState.at("count").set(2);
console.log("After second change:", counterState.get().count);

counterState.at("count").set(3);
console.log("After third change:", counterState.get().count);

// Undo changes
timeAPI.undo(); // count is now 2
console.log("After first undo:", counterState.get().count);

timeAPI.undo(); // count is now 1
console.log("After second undo:", counterState.get().count);

// Redo changes
timeAPI.redo(); // count is now 2
console.log("After redo:", counterState.get().count);

// List snapshots
console.log("Past snapshots:", timeAPI.getPast().length);
console.log("Future snapshots:", timeAPI.getFuture().length);

console.log("\nAll README examples tested successfully!");