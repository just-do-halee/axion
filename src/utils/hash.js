"use strict";
/**
 * 고성능 해싱 알고리즘
 * 머클 트리에서 효율적인 상태 비교를 위한 해시 함수
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashString = hashString;
exports.hashObject = hashObject;
exports.computeHash = computeHash;
exports.hashPath = hashPath;
// FNV-1a 파라미터
var FNV_PRIME = 0x01000193;
var FNV_OFFSET_BASIS = 0x811c9dc5;
/**
 * 문자열의 FNV-1a 해시 계산
 * O(n) 시간 복잡도, n은 문자열 길이
 */
function hashString(str) {
    var hash = FNV_OFFSET_BASIS;
    for (var i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0; // 부호 없는 32비트 정수로 변환
}
/**
 * Hash any object using a more direct approach
 * This is a simpler function that's useful for tests
 */
function hashObject(obj) {
    // Create a visited set to handle circular references
    var visited = new Set();
    function hashValue(value) {
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
            if (visited.has(value)) {
                return '[Circular]';
            }
            visited.add(value);
        }
        if (value === null)
            return 'null';
        if (value === undefined)
            return 'undefined';
        var type = typeof value;
        switch (type) {
            case 'number':
            case 'boolean':
            case 'symbol':
                return String(value);
            case 'string':
                return "\"".concat(value, "\"");
            case 'object':
                if (Array.isArray(value)) {
                    return "[".concat(value.map(hashValue).join(','), "]");
                }
                if (value instanceof Date) {
                    return value.toISOString();
                }
                if (value instanceof RegExp) {
                    return value.toString();
                }
                if (value instanceof Map) {
                    var entries_1 = [];
                    value.forEach(function (v, k) {
                        entries_1.push("".concat(hashValue(k), "=>").concat(hashValue(v)));
                    });
                    return "Map{".concat(entries_1.join(','), "}");
                }
                if (value instanceof Set) {
                    return "Set{".concat(Array.from(value).map(hashValue).join(','), "}");
                }
                // Regular object
                var keys = Object.keys(value).sort();
                var objHash = keys
                    .map(function (key) { return "".concat(key, ":").concat(hashValue(value[key])); })
                    .join(',');
                return "{".concat(objHash, "}");
            default:
                return "".concat(type, ":").concat(String(value));
        }
    }
    return hashValue(obj);
}
/**
 * 값의 해시 계산
 * 객체는 재귀적으로 처리되며 키 순서에 독립적
 */
function computeHash(value, visited) {
    if (visited === void 0) { visited = new WeakMap(); }
    if (value === null)
        return "null";
    if (value === undefined)
        return "undefined";
    var type = typeof value;
    // Handle primitive types first
    switch (type) {
        case "number":
        case "boolean":
        case "symbol":
            return "".concat(type, ":").concat(String(value));
        case "string":
            return "string:".concat(hashString(value));
        case "function":
            return "function";
        case "object":
            // Handle circular references
            if (value !== null && typeof value === "object") {
                // Return cached hash if this object was already visited
                if (visited.has(value)) {
                    return visited.get(value) || "[Circular]";
                }
                // Create a temporary hash for circular reference detection
                visited.set(value, "[Processing]");
                try {
                    var result = void 0;
                    if (Array.isArray(value)) {
                        // Use a safer implementation that handles circular references
                        var arrayHash = value.map(function (item) { return computeHash(item, visited); }).join(",");
                        result = "array:[".concat(arrayHash, "]");
                    }
                    else if (value instanceof Date) {
                        result = "date:".concat(value.getTime());
                    }
                    else if (value instanceof RegExp) {
                        result = "regexp:".concat(value.toString());
                    }
                    else if (value instanceof Map || value instanceof Set) {
                        // Not hashing maps and sets in detail to prevent potential issues
                        result = value instanceof Map ? "map" : "set";
                    }
                    else {
                        // Regular object - safely get keys and hash them
                        var keys = Object.keys(value).sort();
                        // Limit to maximum of 100 keys to prevent stack overflow
                        var limitedKeys = keys.slice(0, 100);
                        // Safely compute hash for each key-value pair
                        var pairs = [];
                        for (var _i = 0, limitedKeys_1 = limitedKeys; _i < limitedKeys_1.length; _i++) {
                            var key = limitedKeys_1[_i];
                            try {
                                var keyHash = computeHash(key, visited);
                                var valueHash = computeHash(value[key], visited);
                                pairs.push("".concat(keyHash, ":").concat(valueHash));
                            }
                            catch (e) {
                                pairs.push("".concat(key, ":[Error]"));
                            }
                        }
                        // Add indication if keys were limited
                        var suffix = keys.length > 100 ? "...<truncated>" : "";
                        result = "object:{".concat(pairs.join(",")).concat(suffix, "}");
                    }
                    // Update the visited map with the actual hash
                    visited.set(value, result);
                    return result;
                }
                catch (e) {
                    // Fallback to a simple representation in case of errors
                    return "object:[Error:".concat(String(e).substring(0, 50), "]");
                }
            }
            // Fallback for null or other unhandled object types
            return "object";
        default:
            return "".concat(type, ":").concat(String(value));
    }
}
/**
 * 경로 해싱
 * 경로를 문자열로 변환하고 해시
 */
function hashPath(path) {
    var pathStr = path
        .map(function (segment) {
        return typeof segment === "symbol" ? segment.toString() : String(segment);
    })
        .join(".");
    return "path:".concat(hashString(pathStr));
}
