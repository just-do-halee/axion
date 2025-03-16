/**
 * Simple performance tests for atom operations
 */

import { createAtom } from "../../core/atom";
import { Benchmark, runBenchmarks } from "./benchmark";

// Only run performance tests when specifically enabled
// You can enable by setting TEST_ENV=performance when running tests
const testFn = process.env.TEST_ENV === "performance" ? test : test.skip;

describe("Atom Performance", () => {
  testFn("should measure basic atom operations", () => {
    // Create atom benchmark
    const createAtomBenchmark = new Benchmark("Create atom", () => {
      createAtom({ count: 0 });
    });

    // Get atom benchmark
    const smallAtom = createAtom({ count: 0 });
    const getSmallAtomBenchmark = new Benchmark("Get atom", () => {
      smallAtom.get();
    });

    // Set atom benchmark
    const setSmallAtomBenchmark = new Benchmark("Set atom", () => {
      smallAtom.set({ count: Math.random() });
    });

    // Update atom benchmark
    const updateAtomBenchmark = new Benchmark("Update atom", () => {
      smallAtom.update((state) => ({ count: state.count + 1 }));
    });

    // Create a nested object for path tests
    const nestedAtom = createAtom({
      user: {
        profile: {
          name: "John",
          age: 30,
          address: {
            city: "New York",
            country: "USA",
          },
        },
      },
    });

    // Path get benchmark
    const pathGetBenchmark = new Benchmark("Get via path", () => {
      nestedAtom.at("user").at("profile").at("name").get();
    });

    // Path set benchmark
    const pathSetBenchmark = new Benchmark("Set via path", () => {
      nestedAtom.at("user").at("profile").at("name").set("Jane");
    });

    // Run benchmarks with appropriate iterations
    const results = runBenchmarks([
      createAtomBenchmark.setIterations(1000),
      getSmallAtomBenchmark.setIterations(10000),
      setSmallAtomBenchmark.setIterations(1000),
      updateAtomBenchmark.setIterations(1000),
      pathGetBenchmark.setIterations(5000),
      pathSetBenchmark.setIterations(1000),
    ]);

    // Log results - we don't assert anything yet as we're just establishing baselines
    console.log("Performance test results:", results);
  });
});
