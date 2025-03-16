"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimitiveStateNode = exports.StateNode = void 0;
exports.createStateNode = createStateNode;
// src/core/stateNode.ts
var hash_1 = require("../utils/hash");
var clone_1 = require("../utils/clone");
var path_1 = require("../utils/path");
var errors_1 = require("../utils/errors");
/**
 * 객체 타입을 위한 상태 노드 구현
 */
var StateNode = /** @class */ (function () {
    function StateNode(value) {
        // 깊은 복제 후 동결하여 불변성 보장
        this.value = (0, clone_1.deepFreeze)((0, clone_1.structuralClone)(value));
        this.hash = (0, hash_1.computeHash)(this.value);
    }
    StateNode.prototype.get = function () {
        return this.value;
    };
    StateNode.prototype.getHash = function () {
        return this.hash;
    };
    StateNode.prototype.update = function (updater) {
        var newValue = updater(this.value);
        // 해시로 빠르게 동등성 검사
        var newHash = (0, hash_1.computeHash)(newValue);
        if (this.hash === newHash) {
            return [this, new Set()];
        }
        // 변경된 경로 계산
        var changedPaths = this.computeChangedPaths(this.value, newValue);
        // 새 노드 생성
        return [new StateNode(newValue), changedPaths];
    };
    StateNode.prototype.getPath = function (path) {
        if (path.length === 0) {
            return this.value;
        }
        var current = this.value;
        for (var i = 0; i < path.length; i++) {
            var segment = path[i];
            // Check if current is null or undefined
            if (current === undefined || current === null) {
                throw new Error("Cannot access path: ".concat(path.slice(0, i + 1).join("."), " - parent is ").concat(current === null ? "null" : "undefined"));
            }
            // Check if segment exists in current
            if (!(segment in current)) {
                throw new Error("Cannot access path: ".concat(path
                    .slice(0, i + 1)
                    .join("."), " - property '").concat(String(segment), "' does not exist"));
            }
            current = current[segment];
        }
        return current;
    };
    StateNode.prototype.setPath = function (path, value) {
        if (path.length === 0) {
            if (typeof value !== "object" || value === null) {
                throw (0, errors_1.createPathError)(errors_1.ErrorCode.INVALID_PATH, path, "Cannot set a non-object value at root level");
            }
            return this.update(function () { return value; });
        }
        // 현재 경로 값 가져오기
        var currentValue = this.getPath(path);
        // 값이 동일하면 변경 없음
        if ((0, hash_1.computeHash)(currentValue) === (0, hash_1.computeHash)(value)) {
            return [this, new Set()];
        }
        // 새 상태 생성
        var newValue = (0, clone_1.setValueAtPath)(this.value, path, value);
        // 변경된 경로 집합 생성
        var changedPaths = new Set([path]);
        return [new StateNode(newValue), changedPaths];
    };
    StateNode.prototype.computeChangedPaths = function (oldValue, newValue) {
        var changedPaths = new Set();
        // 재귀적으로 변경 감지
        function detectChanges(a, b, currentPath) {
            if (currentPath === void 0) { currentPath = []; }
            // 기본 비교로 빠르게 확인
            if (Object.is(a, b)) {
                return;
            }
            // 타입 불일치
            if (typeof a !== typeof b ||
                (a === null && b !== null) ||
                (a !== null && b === null)) {
                changedPaths.add(__spreadArray([], currentPath, true));
                return;
            }
            // 객체가 아니면 값이 다른 것
            if (typeof a !== "object" || a === null) {
                changedPaths.add(__spreadArray([], currentPath, true));
                return;
            }
            // 배열 길이 변경
            if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
                changedPaths.add(__spreadArray([], currentPath, true));
            }
            // 객체/배열 속성 비교
            var allKeys = new Set(__spreadArray(__spreadArray([], Object.keys(a), true), Object.keys(b), true));
            for (var _i = 0, allKeys_1 = allKeys; _i < allKeys_1.length; _i++) {
                var key = allKeys_1[_i];
                var nextPath = __spreadArray(__spreadArray([], currentPath, true), [key], false);
                // 키가 한쪽에만 있는 경우
                if (!(key in a) || !(key in b)) {
                    changedPaths.add(nextPath);
                    continue;
                }
                // 재귀적으로 하위 속성 검사
                detectChanges(a[key], b[key], nextPath);
            }
        }
        detectChanges(oldValue, newValue);
        // 중복 경로 제거 (하위 경로가 있으면 상위 경로 제거)
        var optimizedPaths = new Set();
        var pathArray = Array.from(changedPaths);
        pathArray.sort(function (a, b) { return a.length - b.length; });
        for (var _i = 0, pathArray_1 = pathArray; _i < pathArray_1.length; _i++) {
            var path = pathArray_1[_i];
            // 이미 관련 경로가 추가되었는지 확인
            var hasRelatedPath = false;
            for (var _a = 0, optimizedPaths_1 = optimizedPaths; _a < optimizedPaths_1.length; _a++) {
                var existingPath = optimizedPaths_1[_a];
                if ((0, path_1.areRelatedPaths)(path, existingPath)) {
                    hasRelatedPath = true;
                    break;
                }
            }
            if (!hasRelatedPath) {
                optimizedPaths.add(path);
            }
        }
        return optimizedPaths;
    };
    return StateNode;
}());
exports.StateNode = StateNode;
/**
 * 원시 타입을 위한 상태 노드 구현
 */
var PrimitiveStateNode = /** @class */ (function () {
    function PrimitiveStateNode(value) {
        this.value = value;
        this.hash = String(value);
    }
    PrimitiveStateNode.prototype.get = function () {
        return this.value;
    };
    PrimitiveStateNode.prototype.getHash = function () {
        return this.hash;
    };
    PrimitiveStateNode.prototype.update = function (updater) {
        var newValue = updater(this.value);
        if (Object.is(this.value, newValue)) {
            return [this, new Set()];
        }
        return [new PrimitiveStateNode(newValue), new Set([[]])];
    };
    PrimitiveStateNode.prototype.getPath = function (_path) {
        throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot access path on primitive value");
    };
    PrimitiveStateNode.prototype.setPath = function (_path, _value) {
        throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot set path on primitive value");
    };
    return PrimitiveStateNode;
}());
exports.PrimitiveStateNode = PrimitiveStateNode;
/**
 * 상태 노드 팩토리 함수
 * 값 타입에 따라 적절한 상태 노드 구현체 반환
 */
function createStateNode(value) {
    if (typeof value === "object" && value !== null) {
        return new StateNode(value);
    }
    else {
        return new PrimitiveStateNode(value);
    }
}
