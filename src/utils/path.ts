// src/utils/path.ts
import { Path } from "./types";
import { getValueAtPath, setValueAtPath } from "./clone";

// Re-export functions from clone.ts for convenience and test compatibility
export { getValueAtPath, setValueAtPath };

/**
 * Converts a path string to a path array
 * Example: "users.0.name" -> ["users", 0, "name"]
 */
export function stringToPath(path: string): Path {
  if (path === "") {
    return [];
  }

  // Split on dots
  const segments = path.split(".");

  return segments.map((segment) => {
    // Convert numeric strings to numbers
    const numberIndex = /^\d+$/.test(segment) ? parseInt(segment, 10) : null;
    return numberIndex !== null ? numberIndex : segment;
  });
}

/**
 * Converts a path array to a string
 * Example: ["users", 0, "name"] -> "users.0.name"
 */
export function pathToString(path: Path): string {
  return path
    .map((segment) =>
      typeof segment === "symbol"
        ? segment.toString().replace(/Symbol\((.*)\)/, "$1")
        : String(segment)
    )
    .join(".");
}

/**
 * Checks if two segments are equal, handling different types
 */
function segmentsEqual(
  a: string | number | symbol,
  b: string | number | symbol
): boolean {
  // Handle symbols specially
  if (typeof a === "symbol" && typeof b === "symbol") {
    return a.toString() === b.toString();
  }

  // For other types, use strict equality
  return a === b;
}

/**
 * Checks if two paths are the same
 */
export function areSamePaths(path1: Path, path2: Path): boolean {
  if (path1.length !== path2.length) {
    return false;
  }

  for (let i = 0; i < path1.length; i++) {
    if (!segmentsEqual(path1[i], path2[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a path is a subpath of another path
 * Example: isSubPath(["users", 0, "name"], ["users"]) -> true
 */
export function isSubPath(subPath: Path, parentPath: Path): boolean {
  if (subPath.length <= parentPath.length) {
    return false;
  }

  for (let i = 0; i < parentPath.length; i++) {
    if (!segmentsEqual(parentPath[i], subPath[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if two paths are related (one is a prefix of the other)
 */
export function areRelatedPaths(path1: Path, path2: Path): boolean {
  // Empty paths are related to all paths
  if (path1.length === 0 || path2.length === 0) {
    return true;
  }

  // Get the shorter path
  const shorterPath = path1.length <= path2.length ? path1 : path2;
  const longerPath = path1.length > path2.length ? path1 : path2;

  // Check if shorter is a prefix of longer
  for (let i = 0; i < shorterPath.length; i++) {
    if (!segmentsEqual(shorterPath[i], longerPath[i])) {
      return false;
    }
  }

  // All segments in shorter path match the beginning of longer path
  return true;
}

/**
 * Checks if a path is a direct parent of another path
 */
export function isDirectParentPath(parent: Path, child: Path): boolean {
  return parent.length === child.length - 1 && isSubPath(child, parent);
}

/**
 * Normalizes a path into a consistent array format
 * Handles string paths, array paths, and mixed formats
 * 
 * @param path Path in string or array format
 * @returns Normalized path array
 */
export function normalizePath(path: string | string[] | Path): Path {
  if (typeof path === 'string') {
    return stringToPath(path);
  }
  
  if (path.length === 0) {
    return [];
  }
  
  // Handle array with string segments that might contain dots
  return path.flatMap(segment => 
    typeof segment === 'string' && segment.includes('.') 
      ? stringToPath(segment)
      : segment
  );
}

/**
 * Converts a path array to a string
 * Alias for pathToString for better API naming consistency
 */
export function stringifyPath(path: Path): string {
  return pathToString(path);
}
