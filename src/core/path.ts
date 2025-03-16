// src/core/path.ts - Fixed implementation
import { Atom, PathOperator } from "./core-types";
import { Path, DeepReadonly } from "../utils/types";

/**
 * Path node - Provides access to a specific path within state
 * Type-safe path access
 */
export class PathNode<T, P extends Path = []> implements PathOperator<T, P> {
  /**
   * Creates a new path node
   *
   * @param atom The parent atom
   * @param path The path within the atom
   */
  constructor(private readonly atom: Atom<T>, private readonly path: P) {}

  /**
   * Gets the value at this path
   */
  get(): DeepReadonly<P extends [] ? T : any> {
    return this.atom.getPath(this.path) as DeepReadonly<P extends [] ? T : any>;
  }

  /**
   * Sets the value at this path
   */
  set(value: any): void {
    this.atom.setPath(this.path, value);
  }

  /**
   * Updates the value at this path with an updater function
   */
  update(updater: (current: any) => any): void {
    const currentValue = this.get();
    this.set(updater(currentValue));
  }

  /**
   * Accesses a child path
   */
  at<K extends keyof any>(key: K): PathOperator<T, [...P, K]> {
    return new PathNode(this.atom, [...this.path, key as any]);
  }

  /**
   * Subscribes to changes at this path
   */
  subscribe(handler: () => void): () => void {
    return this.atom.subscribePath(this.path, handler);
  }
}
