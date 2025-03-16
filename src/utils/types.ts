// src/utils/types.ts - Complete implementation

/**
 * Deep readonly type utility
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

// Readonly array
type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;

// Readonly object
type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

/**
 * Path segment and full path types
 */
export type PathSegment = string | number | symbol;
export type Path = PathSegment[];

/**
 * Type to extract the value at a specific path
 */
export type PathValue<T, P extends Path> = P extends []
  ? T
  : P extends [infer K, ...infer Rest]
  ? K extends keyof T
    ? Rest extends Path
      ? PathValue<T[K], Rest>
      : T[K]
    : never
  : never;

/**
 * State updater function type
 */
export type Updater<T> = (current: DeepReadonly<T>) => T;

/**
 * Effect function type
 */
export type EffectFn<T = void> = (
  state: DeepReadonly<T>
) => void | (() => void);

/**
 * Equality comparison function type
 */
export type EqualsFn<T> = (a: T, b: T) => boolean;

/**
 * Subscription handler function type
 */
export type SubscriptionHandler = () => void;

/**
 * Atom identifier type
 */
export type AtomId = symbol;

/**
 * Path operator interface for accessing nested state
 */
export interface PathOperator<T, P extends Path> {
  /** Get value at path */
  get(): PathValue<T, P>;

  /** Set value at path */
  set(value: PathValue<T, P>): void;

  /** Update value at path */
  update(updater: (current: PathValue<T, P>) => PathValue<T, P>): void;

  /** Access child path */
  at<K extends keyof PathValue<T, P>>(key: K): PathOperator<T, [...P, K]>;

  /** Subscribe to changes at path */
  subscribe(handler: SubscriptionHandler): () => void;
}

/**
 * State snapshot for time-travel
 */
export interface StateSnapshot<T> {
  readonly value: DeepReadonly<T>;
  readonly timestamp: number;
  readonly id: string;
}

/**
 * Atom creation options
 */
export interface Options<T> {
  /** Optional name for debugging */
  name?: string;
  /** Custom equality function */
  equals?: EqualsFn<T>;
  /** Enable devtools integration */
  devtools?: boolean;
}

/**
 * Dependency path representation for tracking
 */
export interface DependencyPath {
  /** String representation of the path */
  path: string;
  /** Array representation of the path segments */
  segments: Path;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: Error) => void;
