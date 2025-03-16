"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAtom = createAtom;
// src/core/atom.ts
var stateNode_1 = require("./stateNode");
var path_1 = require("./path");
var dependency_1 = require("../internals/dependency");
var notify_1 = require("../internals/notify");
var registry_1 = require("../internals/registry");
var errors_1 = require("../utils/errors");
/**
 * 상태 아톰 생성
 * 모든 상태 관리의 기본 단위
 *
 * @param initialState 초기 상태 값
 * @param options 아톰 생성 옵션
 * @returns 상태 아톰
 */
function createAtom(initialState, options) {
    if (options === void 0) { options = {}; }
    // 옵션 추출
    var name = options.name, equals = options.equals, _a = options.devtools, devtools = _a === void 0 ? false : _a;
    // 내부 상태 노드
    var stateNode = (0, stateNode_1.createStateNode)(initialState);
    // 고유 식별자 - 이름 옵션 활용
    var id = Symbol(name || "axion.atom");
    // 구독자 리스트
    var subscribers = new Set();
    // 경로별 구독자
    var pathSubscribers = new Map();
    // 경로 노드 활성화 여부 확인
    var supportsPathAccess = typeof initialState === "object" && initialState !== null;
    // 개발자 도구 통합 (활성화된 경우)
    if (devtools) {
        try {
            // 개발자 도구 기능은 미래 확장을 위한 자리 표시자
            console.log("Atom created with name: ".concat(name || id.toString()));
            // 실제 구현은 devtools 모듈과 통합할 수 있음
        }
        catch (error) {
            console.warn("DevTools integration failed:", error);
        }
    }
    // 아톰 구현
    var atom = {
        id: id,
        get: function () {
            // 의존성 추적 중이면 의존성 등록
            if ((0, dependency_1.isTracking)()) {
                (0, dependency_1.trackDependency)(id, []);
            }
            return stateNode.get();
        },
        set: function (newState) {
            var _a = stateNode.update(function () { return newState; }), newNode = _a[0], changedPaths = _a[1];
            // 값이 변경되지 않은 경우 업데이트 스킵 (사용자 정의 equals 함수 사용)
            if (equals &&
                !changedPaths.size &&
                equals(stateNode.get(), newState)) {
                return;
            }
            if (changedPaths.size > 0) {
                stateNode = newNode;
                (0, notify_1.notifyStateChange)(id, changedPaths, subscribers, pathSubscribers);
                // 개발자 도구 업데이트 (활성화된 경우)
                if (devtools) {
                    console.log("Atom updated: ".concat(name || id.toString()), {
                        newValue: newState,
                        changedPaths: Array.from(changedPaths),
                    });
                }
            }
        },
        update: function (updater) {
            try {
                var currentState = stateNode.get();
                var newState_1 = updater(currentState);
                // 값이 변경되지 않은 경우 업데이트 스킵 (사용자 정의 equals 함수 사용)
                if (equals && equals(currentState, newState_1)) {
                    return;
                }
                var _a = stateNode.update(function () { return newState_1; }), newNode = _a[0], changedPaths = _a[1];
                if (changedPaths.size > 0) {
                    stateNode = newNode;
                    (0, notify_1.notifyStateChange)(id, changedPaths, subscribers, pathSubscribers);
                    // 개발자 도구 업데이트 (활성화된 경우)
                    if (devtools) {
                        console.log("Atom updated: ".concat(name || id.toString()), {
                            prevValue: currentState,
                            newValue: newState_1,
                            changedPaths: Array.from(changedPaths),
                        });
                    }
                }
            }
            catch (error) {
                (0, errors_1.handleError)((0, errors_1.createStateError)(errors_1.ErrorCode.UNKNOWN, "Error updating atom: ".concat(String(error)), id, error));
            }
        },
        at: function (key) {
            if (typeof this.get() !== "object" || this.get() === null) {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot use 'at' on primitive values");
            }
            return new path_1.PathNode(this, [key]);
        },
        // In atom.ts, modify the getPath method:
        getPath: function (path) {
            if (!supportsPathAccess) {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot access path on primitive values");
            }
            // Track dependency if we're tracking
            if ((0, dependency_1.isTracking)()) {
                (0, dependency_1.trackDependency)(id, path);
            }
            try {
                return stateNode.getPath(path);
            }
            catch (error) {
                var pathError = (0, errors_1.createPathError)(errors_1.ErrorCode.INVALID_PATH, path, "Error getting path: ".concat(String(error)), error);
                (0, errors_1.handleError)(pathError);
                throw pathError; // This line is added to re-throw the error after handling
            }
        },
        setPath: function (path, value) {
            if (!supportsPathAccess) {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot set path on primitive values");
            }
            try {
                var _a = stateNode.setPath(path, value), newNode = _a[0], changedPaths = _a[1];
                if (changedPaths.size > 0) {
                    stateNode = newNode;
                    (0, notify_1.notifyStateChange)(id, changedPaths, subscribers, pathSubscribers);
                    // 개발자 도구 업데이트 (활성화된 경우)
                    if (devtools) {
                        console.log("Atom path updated: ".concat(name || id.toString()), {
                            path: path,
                            value: value,
                            changedPaths: Array.from(changedPaths),
                        });
                    }
                }
            }
            catch (error) {
                (0, errors_1.handleError)((0, errors_1.createPathError)(errors_1.ErrorCode.INVALID_PATH, path, "Error setting path: ".concat(String(error)), error));
            }
        },
        subscribe: function (handler) {
            if (typeof handler !== "function") {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.SUBSCRIPTION_ERROR, "Subscriber must be a function");
            }
            subscribers.add(handler);
            // 개발자 도구 알림 (활성화된 경우)
            if (devtools) {
                console.log("Subscription added: ".concat(name || id.toString()));
            }
            return function () {
                subscribers.delete(handler);
                // 개발자 도구 알림 (활성화된 경우)
                if (devtools) {
                    console.log("Subscription removed: ".concat(name || id.toString()));
                }
            };
        },
        subscribePath: function (path, handler) {
            if (!supportsPathAccess) {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.INVALID_OPERATION, "Cannot subscribe to path on primitive values");
            }
            if (typeof handler !== "function") {
                throw (0, errors_1.createStateError)(errors_1.ErrorCode.SUBSCRIPTION_ERROR, "Subscriber must be a function");
            }
            var pathKey = path.join(".");
            if (!pathSubscribers.has(pathKey)) {
                pathSubscribers.set(pathKey, new Set());
            }
            pathSubscribers.get(pathKey).add(handler);
            // 개발자 도구 알림 (활성화된 경우)
            if (devtools) {
                console.log("Path subscription added: ".concat(name || id.toString()), {
                    path: path,
                });
            }
            return function () {
                var handlers = pathSubscribers.get(pathKey);
                if (handlers) {
                    handlers.delete(handler);
                    if (handlers.size === 0) {
                        pathSubscribers.delete(pathKey);
                    }
                    // 개발자 도구 알림 (활성화된 경우)
                    if (devtools) {
                        console.log("Path subscription removed: ".concat(name || id.toString()), {
                            path: path,
                        });
                    }
                }
            };
        },
    };
    // 글로벌 레지스트리에 등록
    (0, registry_1.registerAtom)(id, atom);
    return atom;
}
