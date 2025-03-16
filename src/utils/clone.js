"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepClone = deepClone;
exports.structuralClone = structuralClone;
exports.deepFreeze = deepFreeze;
exports.setValueAtPath = setValueAtPath;
exports.getValueAtPath = getValueAtPath;
/**
 * Deep clone implementation with circular reference handling
 */
function deepClone(obj, visited) {
    if (visited === void 0) { visited = new WeakMap(); }
    // Handle primitive types and null/undefined
    if (obj === null || obj === undefined || typeof obj !== "object") {
        return obj;
    }
    // Handle circular references
    if (visited.has(obj)) {
        return visited.get(obj);
    }
    // Handle special object types
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
    }
    if (obj instanceof Map) {
        var mapClone_1 = new Map();
        visited.set(obj, mapClone_1);
        obj.forEach(function (value, key) {
            mapClone_1.set(typeof key === "object" && key !== null ? deepClone(key, visited) : key, deepClone(value, visited));
        });
        return mapClone_1;
    }
    if (obj instanceof Set) {
        var setClone_1 = new Set();
        visited.set(obj, setClone_1);
        obj.forEach(function (value) {
            setClone_1.add(deepClone(value, visited));
        });
        return setClone_1;
    }
    // Handle arrays
    if (Array.isArray(obj)) {
        var copy_1 = [];
        visited.set(obj, copy_1);
        obj.forEach(function (item, index) {
            copy_1[index] = deepClone(item, visited);
        });
        return copy_1;
    }
    // Handle plain objects
    var copy = Object.create(Object.getPrototypeOf(obj));
    visited.set(obj, copy);
    Object.keys(obj).forEach(function (key) {
        copy[key] = deepClone(obj[key], visited);
    });
    return copy;
}
/**
 * 구조적 공유를 활용한 깊은 복제
 * 변경된 경로만 새 객체로 생성하여 메모리 사용 최적화
 */
function structuralClone(value) {
    if (value === null || value === undefined) {
        return value;
    }
    // 원시 타입은 그대로 반환
    if (typeof value !== "object") {
        return value;
    }
    // 배열 처리 - 얕은 복사를 수행
    if (Array.isArray(value)) {
        // Deep clone array elements for better immutability
        return value.map(function (item) {
            return item !== null && typeof item === 'object'
                ? structuralClone(item)
                : item;
        });
    }
    // 객체 처리 (Date, Map, Set 등 특수 객체는 별도 처리)
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (value instanceof Map) {
        return new Map(value);
    }
    if (value instanceof Set) {
        return new Set(value);
    }
    // 일반 객체 - 객체의 각 속성에 대해 재귀적으로 클론
    var cloned = __assign({}, value);
    // Iterate through all properties
    Object.keys(cloned).forEach(function (key) {
        var prop = cloned[key];
        // Recursively clone object properties
        if (prop !== null && typeof prop === 'object') {
            cloned[key] = structuralClone(prop);
        }
    });
    return cloned;
}
/**
 * 깊은 동결 - 상태 불변성 강제
 */
function deepFreeze(obj) {
    if (obj === null ||
        obj === undefined ||
        typeof obj !== "object" ||
        Object.isFrozen(obj)) {
        return obj;
    }
    // 객체 동결
    Object.freeze(obj);
    // 속성 재귀적 동결
    var propNames = Object.getOwnPropertyNames(obj);
    for (var _i = 0, propNames_1 = propNames; _i < propNames_1.length; _i++) {
        var name_1 = propNames_1[_i];
        var value = obj[name_1];
        if (value && typeof value === "object") {
            deepFreeze(value);
        }
    }
    return obj;
}
/**
 * 경로 값 설정 - 구조적 공유 활용
 * This function creates a new object with the value at the specified path updated.
 * @param obj The source object to update
 * @param path The path to the value to update
 * @param value The new value to set
 * @returns A new object with the updated value
 */
function setValueAtPath(obj, path, value) {
    // Handle empty path case - replace the entire object
    if (path.length === 0) {
        return structuralClone(value);
    }
    // Clone the root object to avoid mutating the original
    var result = structuralClone(obj);
    var current = result;
    // Navigate to the parent of the target path
    for (var i = 0; i < path.length - 1; i++) {
        var segment = path[i];
        var nextSegment = path[i + 1];
        // If the next segment doesn't exist, create appropriate container
        if (current[segment] === undefined) {
            // Create an array if the next segment is a number, otherwise an object
            var isNextNumeric = typeof nextSegment === 'string' && /^\d+$/.test(nextSegment);
            current[segment] = isNextNumeric || typeof nextSegment === 'number' ? [] : {};
        }
        else {
            // Clone the next level to maintain immutability
            current[segment] = structuralClone(current[segment]);
        }
        // Move to the next level
        current = current[segment];
    }
    // Get the last segment of the path
    var lastSegment = path[path.length - 1];
    // Handle array push case - if the last segment is an array length
    if (Array.isArray(current) &&
        typeof lastSegment === 'string' &&
        /^\d+$/.test(lastSegment) &&
        parseInt(lastSegment, 10) === current.length) {
        // Add the new value to the array
        current.push(structuralClone(value));
    }
    else {
        // Set the value at the last segment
        current[lastSegment] = structuralClone(value);
    }
    return result;
}
/**
 * 경로 값 가져오기
 */
function getValueAtPath(obj, path) {
    if (path.length === 0) {
        return obj;
    }
    var current = obj;
    for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
        var segment = path_1[_i];
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}
