"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setValueAtPath = exports.getValueAtPath = void 0;
exports.stringToPath = stringToPath;
exports.pathToString = pathToString;
exports.areSamePaths = areSamePaths;
exports.isSubPath = isSubPath;
exports.areRelatedPaths = areRelatedPaths;
exports.isDirectParentPath = isDirectParentPath;
exports.normalizePath = normalizePath;
exports.stringifyPath = stringifyPath;
var clone_1 = require("./clone");
Object.defineProperty(exports, "getValueAtPath", { enumerable: true, get: function () { return clone_1.getValueAtPath; } });
Object.defineProperty(exports, "setValueAtPath", { enumerable: true, get: function () { return clone_1.setValueAtPath; } });
/**
 * Converts a path string to a path array
 * Example: "users.0.name" -> ["users", 0, "name"]
 */
function stringToPath(path) {
    if (path === "") {
        return [];
    }
    // Split on dots
    var segments = path.split(".");
    return segments.map(function (segment) {
        // Convert numeric strings to numbers
        var numberIndex = /^\d+$/.test(segment) ? parseInt(segment, 10) : null;
        return numberIndex !== null ? numberIndex : segment;
    });
}
/**
 * Converts a path array to a string
 * Example: ["users", 0, "name"] -> "users.0.name"
 */
function pathToString(path) {
    return path
        .map(function (segment) {
        return typeof segment === "symbol"
            ? segment.toString().replace(/Symbol\((.*)\)/, "$1")
            : String(segment);
    })
        .join(".");
}
/**
 * Checks if two segments are equal, handling different types
 */
function segmentsEqual(a, b) {
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
function areSamePaths(path1, path2) {
    if (path1.length !== path2.length) {
        return false;
    }
    for (var i = 0; i < path1.length; i++) {
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
function isSubPath(subPath, parentPath) {
    if (subPath.length <= parentPath.length) {
        return false;
    }
    for (var i = 0; i < parentPath.length; i++) {
        if (!segmentsEqual(parentPath[i], subPath[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if two paths are related (one is a prefix of the other)
 */
function areRelatedPaths(path1, path2) {
    // Empty paths are related to all paths
    if (path1.length === 0 || path2.length === 0) {
        return true;
    }
    // Get the shorter path
    var shorterPath = path1.length <= path2.length ? path1 : path2;
    var longerPath = path1.length > path2.length ? path1 : path2;
    // Check if shorter is a prefix of longer
    for (var i = 0; i < shorterPath.length; i++) {
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
function isDirectParentPath(parent, child) {
    return parent.length === child.length - 1 && isSubPath(child, parent);
}
/**
 * Normalizes a path into a consistent array format
 * Handles string paths, array paths, and mixed formats
 *
 * @param path Path in string or array format
 * @returns Normalized path array
 */
function normalizePath(path) {
    if (typeof path === 'string') {
        return stringToPath(path);
    }
    if (path.length === 0) {
        return [];
    }
    // Handle array with string segments that might contain dots
    return path.flatMap(function (segment) {
        return typeof segment === 'string' && segment.includes('.')
            ? stringToPath(segment)
            : segment;
    });
}
/**
 * Converts a path array to a string
 * Alias for pathToString for better API naming consistency
 */
function stringifyPath(path) {
    return pathToString(path);
}
