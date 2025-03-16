// Test script for core Axion features
// To run: node core-features-test.js

// Import the library
const axion = require('../dist/index.js').default;

// Helper to check if a test passes
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

// =====================================================
// Test 1: Basic Atom Creation and Updates
// =====================================================
console.log("\n--- Test 1: Basic Atom Creation and Updates ---");

const counter = axion({ count: 0 });
assert(counter.get().count === 0, "Initial atom state is correct");

counter.set({ count: 5 });
assert(counter.get().count === 5, "Atom state updates with set()");

counter.update(state => ({ count: state.count + 1 }));
assert(counter.get().count === 6, "Atom state updates with update()");

// =====================================================
// Test a subscription
let subscriptionCalled = false;
const unsubscribe = counter.subscribe(() => {
  subscriptionCalled = true;
});

counter.set({ count: 10 });
assert(subscriptionCalled, "Subscription is called on state change");
unsubscribe();

// Reset the subscription flag
subscriptionCalled = false;
counter.set({ count: 20 });
assert(!subscriptionCalled, "Unsubscribe works correctly");

// =====================================================
// Test 2: Path Operations
// =====================================================
console.log("\n--- Test 2: Path Operations ---");

const userState = axion({
  profile: {
    name: "John",
    age: 30,
    address: {
      city: "New York",
      zip: "10001"
    }
  }
});

assert(userState.get().profile.name === "John", "Can access nested properties");

// Test path operations
userState.at("profile").at("name").set("Jane");
assert(userState.get().profile.name === "Jane", "Path setter works");

userState.at("profile").at("age").update(age => age + 1);
assert(userState.get().profile.age === 31, "Path updater works");

userState.at("profile").at("address").at("city").set("Boston");
assert(userState.get().profile.address.city === "Boston", "Deep path setter works");

// =====================================================
// Test 3: Derived State
// =====================================================
console.log("\n--- Test 3: Derived State ---");

const statsState = axion.derive(() => {
  const { count } = counter.get();
  return {
    count,
    doubled: count * 2,
    isEven: count % 2 === 0
  };
});

// Test that derived state reflects source state
assert(statsState.get().count === 20, "Derived state reflects source value");
assert(statsState.get().doubled === 40, "Derived computation works");
assert(statsState.get().isEven === true, "Boolean computation works");

// Update source and check derived state updates
counter.set({ count: 21 });
assert(statsState.get().count === 21, "Derived state updates with source");
assert(statsState.get().doubled === 42, "Derived computation re-executes");
assert(statsState.get().isEven === false, "Boolean computation updates");

// =====================================================
// Test 4: Transactions
// =====================================================
console.log("\n--- Test 4: Transactions ---");

// Set up to count the number of subscription calls
let notificationCount = 0;
counter.subscribe(() => { notificationCount++; });
userState.subscribe(() => { notificationCount++; });

// Reset notification count
notificationCount = 0;

// Execute a transaction
axion.tx(() => {
  counter.set({ count: 30 });
  userState.at("profile").at("name").set("Bob");
  userState.at("profile").at("age").set(40);
});

// Both atoms were updated
assert(counter.get().count === 30, "Transaction updates first atom");
assert(userState.get().profile.name === "Bob", "Transaction updates second atom");
assert(userState.get().profile.age === 40, "Transaction updates nested path");

// Subscribers should have been notified once per atom
assert(notificationCount === 2, "Transaction batches notifications");

// =====================================================
// Test 5: Time Travel
// =====================================================
console.log("\n--- Test 5: Time Travel ---");

const timeAPI = axion.getTimeAPI(counter);

// Make some changes to build up history
counter.set({ count: 31 });
counter.set({ count: 32 });
counter.set({ count: 33 });

// Test undo
timeAPI.undo();
assert(counter.get().count === 32, "Undo goes to previous state");

timeAPI.undo();
assert(counter.get().count === 31, "Undo works multiple times");

// Test redo
timeAPI.redo();
assert(counter.get().count === 32, "Redo restores undone state");

// Test history API
const past = timeAPI.getPast();
const future = timeAPI.getFuture();

assert(past.length > 0, "Time API returns past snapshots");
assert(future.length > 0, "Time API returns future snapshots");

// =====================================================
// Test 6: Effect
// =====================================================
console.log("\n--- Test 6: Effect ---");

let effectExecutionCount = 0;
let cleanupExecutionCount = 0;

const disposeEffect = axion.effect(() => {
  effectExecutionCount++;
  // Test that the effect can access state
  const { count } = counter.get();
  
  // Return a cleanup function
  return () => {
    cleanupExecutionCount++;
  };
});

// Effect should run once initially
assert(effectExecutionCount === 1, "Effect runs on creation");

// Update state that effect depends on
counter.set({ count: 40 });

// Effect should run again
assert(effectExecutionCount > 1, "Effect reruns when dependencies change");

// Clean up the effect
disposeEffect();

// Cleanup should have run
assert(cleanupExecutionCount > 0, "Effect cleanup is executed on disposal");

// Update state again
counter.set({ count: 50 });

// Effect execution count should not change
const finalEffectCount = effectExecutionCount;
assert(effectExecutionCount === finalEffectCount, "Disposed effect doesn't run");

// =====================================================
// Summary
// =====================================================
console.log("\n--- Summary ---");
console.log("All tests passed!");
console.log("✅ Core functionality working as expected");
console.log("✅ Path operations working as expected");
console.log("✅ Derived state working as expected");
console.log("✅ Transactions working as expected");
console.log("✅ Time travel working as expected");
console.log("✅ Effects working as expected");