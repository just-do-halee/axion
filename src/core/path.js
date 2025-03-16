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
exports.PathNode = void 0;
/**
 * 경로 노드 - 상태의 특정 경로에 대한 접근자
 * 타입 안전한 경로 접근 제공
 */
var PathNode = /** @class */ (function () {
    function PathNode(atom, path) {
        this.atom = atom;
        this.path = path;
    }
    /**
     * 경로 값 가져오기
     */
    PathNode.prototype.get = function () {
        return this.atom.getPath(this.path);
    };
    /**
     * 경로 값 설정하기
     */
    PathNode.prototype.set = function (value) {
        this.atom.setPath(this.path, value);
    };
    /**
     * 경로 값 업데이트하기
     */
    PathNode.prototype.update = function (updater) {
        var currentValue = this.get();
        this.set(updater(currentValue));
    };
    /**
     * 하위 경로 접근하기
     */
    PathNode.prototype.at = function (key) {
        return new PathNode(this.atom, __spreadArray(__spreadArray([], this.path, true), [key], false));
    };
    /**
     * 경로 변경 구독하기
     */
    PathNode.prototype.subscribe = function (handler) {
        return this.atom.subscribePath(this.path, handler);
    };
    return PathNode;
}());
exports.PathNode = PathNode;
