// src/core/atom.ts - Fixed implementation
import { createStateNode } from "./stateNode";
import {
  DeepReadonly,
  Path,
  Updater,
  Options,
} from "../utils/types";
import { PathNode } from "./path";
import { isTracking, trackDependency } from "../internals/dependency";
import { notifyStateChange } from "../internals/notify";
import { registerAtom } from "../internals/registry";
import {
  createStateError,
  createPathError,
  ErrorCode,
  handleError,
} from "../utils/errors";

// Import shared types from core-types
import {
  Atom,
  AtomId as AtomIdType,
  SubscriptionHandler,
  PathOperator
} from "./core-types";

// Re-export types from core-types
export type { Atom } from "./core-types";

/**
 * Creates a state atom
 *
 * @param initialState Initial state value
 * @param options Atom creation options
 * @returns State atom
 */
export function createAtom<T>(
  initialState: T,
  options: Options<T> = {}
): Atom<T> {
  // Extract options
  const { name, equals, devtools = false } = options;

  // Internal state node
  let stateNode = createStateNode(initialState);

  // Unique identifier
  const id: AtomIdType = Symbol(name || "axion.atom");

  // Subscribers list
  const subscribers = new Set<SubscriptionHandler>();

  // Path subscribers
  const pathSubscribers = new Map<string, Set<SubscriptionHandler>>();

  // Check if path access is supported
  const supportsPathAccess =
    typeof initialState === "object" && initialState !== null;

  // DevTools integration if enabled
  if (devtools) {
    try {
      // Placeholder for future DevTools integration
      console.log(`Atom created with name: ${name || id.toString()}`);
    } catch (error) {
      console.warn("DevTools integration failed:", error);
    }
  }

  // Atom implementation
  const atom: Atom<T> = {
    id,

    get(): DeepReadonly<T> {
      // Track dependency if tracking is active
      if (isTracking()) {
        trackDependency(id, []);
      }

      return stateNode.get();
    },

    set(newState: T): void {
      const [newNode, changedPaths] = stateNode.update(() => newState);

      // Skip update if no changes using custom equals
      if (
        equals &&
        !changedPaths.size &&
        equals(stateNode.get() as T, newState)
      ) {
        return;
      }

      if (changedPaths.size > 0) {
        stateNode = newNode;
        notifyStateChange(id, changedPaths, subscribers, pathSubscribers);

        // DevTools update if enabled
        if (devtools) {
          console.log(`Atom updated: ${name || id.toString()}`, {
            newValue: newState,
            changedPaths: Array.from(changedPaths),
          });
        }
      }
    },

    update(updater: Updater<T>): void {
      try {
        const currentState = stateNode.get() as DeepReadonly<T>;
        const newState = updater(currentState);

        // Skip update if no changes using custom equals
        if (equals && equals(currentState as T, newState)) {
          return;
        }

        const [newNode, changedPaths] = stateNode.update(() => newState);

        if (changedPaths.size > 0) {
          stateNode = newNode;
          notifyStateChange(id, changedPaths, subscribers, pathSubscribers);

          // DevTools update if enabled
          if (devtools) {
            console.log(`Atom updated: ${name || id.toString()}`, {
              prevValue: currentState,
              newValue: newState,
              changedPaths: Array.from(changedPaths),
            });
          }
        }
      } catch (error) {
        handleError(
          createStateError(
            ErrorCode.UNKNOWN,
            `Error updating atom: ${String(error)}`,
            id,
            error
          )
        );
      }
    },

    at<K extends keyof T>(key: K): PathOperator<T, [K]> {
      if (typeof this.get() !== "object" || this.get() === null) {
        throw createStateError(
          ErrorCode.INVALID_OPERATION,
          `Cannot use 'at' on primitive values`
        );
      }
      return new PathNode<T, [K]>(this, [key]);
    },

    getPath(path: Path): unknown {
      if (!supportsPathAccess) {
        throw createStateError(
          ErrorCode.INVALID_OPERATION,
          `Cannot access path on primitive values`
        );
      }

      // Track dependency if tracking is active
      if (isTracking()) {
        trackDependency(id, path);
      }

      try {
        return stateNode.getPath(path);
      } catch (error) {
        const pathError = createPathError(
          ErrorCode.INVALID_PATH,
          path,
          `Error getting path: ${String(error)}`,
          error
        );
        handleError(pathError);
        throw pathError;
      }
    },

    setPath(path: Path, value: unknown): void {
      if (!supportsPathAccess) {
        throw createStateError(
          ErrorCode.INVALID_OPERATION,
          `Cannot set path on primitive values`
        );
      }

      try {
        const [newNode, changedPaths] = stateNode.setPath(path, value);

        if (changedPaths.size > 0) {
          stateNode = newNode;
          notifyStateChange(id, changedPaths, subscribers, pathSubscribers);

          // DevTools update if enabled
          if (devtools) {
            console.log(`Atom path updated: ${name || id.toString()}`, {
              path,
              value,
              changedPaths: Array.from(changedPaths),
            });
          }
        }
      } catch (error) {
        handleError(
          createPathError(
            ErrorCode.INVALID_PATH,
            path,
            `Error setting path: ${String(error)}`,
            error
          )
        );
      }
    },

    subscribe(handler: SubscriptionHandler): () => void {
      if (typeof handler !== "function") {
        throw createStateError(
          ErrorCode.SUBSCRIPTION_ERROR,
          "Subscriber must be a function"
        );
      }

      subscribers.add(handler);

      // DevTools notification if enabled
      if (devtools) {
        console.log(`Subscription added: ${name || id.toString()}`);
      }

      return () => {
        subscribers.delete(handler);

        // DevTools notification if enabled
        if (devtools) {
          console.log(`Subscription removed: ${name || id.toString()}`);
        }
      };
    },

    subscribePath(path: Path, handler: SubscriptionHandler): () => void {
      if (!supportsPathAccess) {
        throw createStateError(
          ErrorCode.INVALID_OPERATION,
          `Cannot subscribe to path on primitive values`
        );
      }

      if (typeof handler !== "function") {
        throw createStateError(
          ErrorCode.SUBSCRIPTION_ERROR,
          "Subscriber must be a function"
        );
      }

      const pathKey = path.join(".");

      if (!pathSubscribers.has(pathKey)) {
        pathSubscribers.set(pathKey, new Set());
      }

      pathSubscribers.get(pathKey)!.add(handler);

      // DevTools notification if enabled
      if (devtools) {
        console.log(`Path subscription added: ${name || id.toString()}`, {
          path,
        });
      }

      return () => {
        const handlers = pathSubscribers.get(pathKey);

        if (handlers) {
          handlers.delete(handler);

          if (handlers.size === 0) {
            pathSubscribers.delete(pathKey);
          }

          // DevTools notification if enabled
          if (devtools) {
            console.log(`Path subscription removed: ${name || id.toString()}`, {
              path,
            });
          }
        }
      };
    },
  };

  // Register in global registry
  registerAtom(id, atom);

  return atom;
}
