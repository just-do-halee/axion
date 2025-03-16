/**
 * Simple performance benchmarking framework for Axion
 */

/**
 * Result of a benchmark run
 */
export interface BenchmarkResult {
  /** Name of the benchmark */
  name: string;
  /** Operations per second */
  operationsPerSecond: number;
  /** Mean time per operation in milliseconds */
  meanTime: number;
  /** Number of samples collected */
  samples: number;
  /** Standard deviation in milliseconds */
  deviation: number;
}

/**
 * Options for benchmark construction
 */
export interface BenchmarkOptions {
  /** Number of iterations to run */
  iterations?: number;
  /** Number of warmup runs to perform before measuring */
  warmupRuns?: number;
  /** Whether to log progress to console */
  verbose?: boolean;
}

/**
 * Benchmark class for measuring performance
 */
export class Benchmark {
  private samples: number[] = [];
  private iterations: number;
  private warmupRuns: number;
  private verbose: boolean;

  /**
   * Create a new benchmark
   *
   * @param name - Name of the benchmark
   * @param fn - Function to benchmark
   * @param options - Benchmark options
   */
  constructor(
    private name: string,
    private fn: () => void,
    options: BenchmarkOptions = {}
  ) {
    this.iterations = options.iterations ?? 1000;
    this.warmupRuns = options.warmupRuns ?? 5;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Set the number of iterations
   */
  setIterations(iterations: number): this {
    this.iterations = iterations;
    return this;
  }

  /**
   * Set the number of warmup runs
   */
  setWarmupRuns(runs: number): this {
    this.warmupRuns = runs;
    return this;
  }

  /**
   * Run the benchmark
   *
   * @returns Benchmark results
   */
  run(): BenchmarkResult {
    this.samples = [];

    if (this.verbose) {
      console.log(`Running benchmark: ${this.name}`);
      console.log(`Warmup runs: ${this.warmupRuns}`);
      console.log(`Iterations: ${this.iterations}`);
    }

    // Warmup
    for (let i = 0; i < this.warmupRuns; i++) {
      this.fn();
    }

    if (this.verbose) {
      console.log("Warmup complete, starting measurement...");
    }

    // Actual benchmark
    for (let i = 0; i < this.iterations; i++) {
      const start = performance.now();
      this.fn();
      const end = performance.now();
      this.samples.push(end - start);

      if (
        this.verbose &&
        i % Math.max(1, Math.floor(this.iterations / 10)) === 0
      ) {
        console.log(`Progress: ${Math.round((i / this.iterations) * 100)}%`);
      }
    }

    // Calculate statistics
    const meanTime =
      this.samples.reduce((sum, time) => sum + time, 0) / this.samples.length;
    const operationsPerSecond = 1000 / meanTime;

    // Calculate standard deviation
    const squareDiffs = this.samples.map((value) => {
      const diff = value - meanTime;
      return diff * diff;
    });
    const avgSquareDiff =
      squareDiffs.reduce((sum, value) => sum + value, 0) / squareDiffs.length;
    const deviation = Math.sqrt(avgSquareDiff);

    const result: BenchmarkResult = {
      name: this.name,
      operationsPerSecond,
      meanTime,
      samples: this.samples.length,
      deviation,
    };

    if (this.verbose) {
      console.log(`Benchmark complete: ${this.name}`);
      console.log(`  Ops/sec: ${operationsPerSecond.toFixed(2)}`);
      console.log(`  Mean time: ${meanTime.toFixed(4)} ms`);
      console.log(
        `  Deviation: ±${deviation.toFixed(4)} ms (${(
          (deviation / meanTime) *
          100
        ).toFixed(2)}%)`
      );
    }

    return result;
  }
}

/**
 * Run multiple benchmarks in sequence
 *
 * @param benchmarks - Array of benchmarks to run
 * @returns Array of benchmark results
 */
export function runBenchmarks(benchmarks: Benchmark[]): BenchmarkResult[] {
  console.log("Running benchmarks...\n");

  const results = benchmarks.map((benchmark) => {
    const result = benchmark.run();

    console.log(`${result.name}:`);
    console.log(
      `  ${result.operationsPerSecond.toFixed(2)} ops/sec ±${(
        (result.deviation / result.meanTime) *
        100
      ).toFixed(2)}%`
    );
    console.log(`  Mean: ${result.meanTime.toFixed(4)} ms\n`);

    return result;
  });

  return results;
}
