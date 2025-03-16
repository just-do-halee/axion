// Simplified test for key Axion features
const axion = require('../dist/index.js').default;

console.log("Starting simplified tests...");

// Create a basic counter atom
const counter = axion({ count: 0 });
console.log("1. Counter created:", counter.get());

// Update the counter
counter.set({ count: 5 });
console.log("2. Counter updated:", counter.get());

// Create a derived state
console.log("3. Creating derived state...");
const doubled = axion.derive(() => {
  const { count } = counter.get();
  return { 
    original: count,
    doubled: count * 2 
  };
});

// Check the derived value
console.log("4. Derived state:", doubled.get());

// Update the source and check if derived updates
console.log("5. Updating source state...");
counter.set({ count: 10 });

// Check the derived value again
console.log("6. Derived state after update:", doubled.get());

// Test path operations
const user = axion({
  profile: {
    name: "John",
    settings: {
      theme: "dark"
    }
  }
});

console.log("7. User state created:", user.get());

// Update with path
user.at("profile").at("name").set("Jane");
console.log("8. User name updated:", user.get().profile.name);

// Test time travel
const timeAPI = axion.getTimeAPI(counter);
console.log("9. Initial count:", counter.get().count);

// Make some changes
counter.set({ count: 20 });
console.log("10. Updated count:", counter.get().count);

// Undo
timeAPI.undo();
console.log("11. After undo:", counter.get().count);

// Redo
timeAPI.redo();
console.log("12. After redo:", counter.get().count);

// Test transaction
axion.tx(() => {
  counter.set({ count: 30 });
  user.at("profile").at("name").set("Alex");
});

console.log("13. After transaction:");
console.log("    - Counter:", counter.get().count);
console.log("    - User:", user.get().profile.name);

console.log("\nTest completed!");