// src/core/core-types.ts
// Common type definitions to avoid circular dependencies

import { DeepReadonly, Path, Updater } from '../utils/types';

/**
 * Internal types for dependency tracking
 */

/**
 * Unique identifier for atoms
 */
export type AtomId = symbol;

/**
 * Subscription handler function type
 */
export type SubscriptionHandler = () => void;

/**
 * Represents a dependency path within an atom
 */
export interface DependencyPath {
  /** The string representation of the path */
  path: string;
  /** The array representation of the path segments */
  segments: Array<string | number | symbol>;
}

/**
 * Represents a node in the dependency graph
 */
export interface DependencyNode {
  /** The atom ID */
  id: AtomId;
  /** The paths accessed in this atom */
  paths: Set<string>;
  /** Atoms that depend on this atom */
  dependents: Set<AtomId>;
  /** Atoms that this atom depends on */
  dependencies: Set<AtomId>;
}

/**
 * Tracking context for dependency tracking
 */
export interface TrackingContext {
  /** The source atom ID (or null if not tracking for an atom) */
  sourceId: AtomId | null;
  /** The dependencies being tracked */
  dependencies: Map<AtomId, Set<DependencyPath>>;
}

/**
 * Result of a tracking operation
 */
export interface TrackingResult<T> {
  /** The result of the tracked function */
  result: T;
  /** The dependencies that were accessed during tracking */
  dependencies: Map<AtomId, Set<DependencyPath>>;
}

/**
 * Represents a notification event from an atom
 */
export interface StateChangeEvent {
  /** The atom ID */
  atomId: AtomId;
  /** The affected paths */
  paths: Array<string>;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Public API types - These will be used by consumers directly
 */

/**
 * Path operator interface for accessing nested state
 */
export interface PathOperator<T, P extends Path> {
  /** Get value at path */
  get(): DeepReadonly<P extends [] ? T : any>;
  
  /** Set value at path */
  set<V>(value: V): void;
  
  /** Update value at path */
  update<V>(updater: (current: V) => V): void;
  
  /** Access child path */
  at<K extends keyof any>(key: K): PathOperator<T, [...P, K]>;
  
  /** Subscribe to changes at path */
  subscribe(handler: SubscriptionHandler): () => void;
}

/**
 * Atom interface - Basic unit of state
 * This is the main interface users will interact with
 */
export interface Atom<T> {
  /** Unique identifier */
  readonly id: AtomId;
  
  /** Get current state */
  get(): DeepReadonly<T>;
  
  /** Set new state */
  set(newState: T): void;
  
  /** Update state with a function */
  update(updater: Updater<T>): void;
  
  /** Access path within state */
  at<K extends keyof T>(key: K): PathOperator<T, [K]>;
  
  /** Get value at path (internal) */
  getPath(path: Path): unknown;
  
  /** Set value at path (internal) */
  setPath(path: Path, value: unknown): void;
  
  /** Subscribe to changes */
  subscribe(handler: SubscriptionHandler): () => void;
  
  /** Subscribe to changes at specific path */
  subscribePath(path: Path, handler: SubscriptionHandler): () => void;
}
