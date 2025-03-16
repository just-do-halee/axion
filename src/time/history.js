"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeManager = void 0;
exports.getTimeAPI = getTimeAPI;
var snapshot_1 = require("./snapshot");
var clone_1 = require("../utils/clone");
var errors_1 = require("../utils/errors");
/**
 * 시간 이동 관리자
 */
var TimeManager = /** @class */ (function () {
    function TimeManager(atom) {
        this.atom = atom;
        this.past = [];
        this.future = [];
        this.limit = 100;
        // 초기 상태 기록
        this.recordState(atom.get());
    }
    /**
     * 현재 상태 기록
     */
    TimeManager.prototype.recordState = function (state) {
        // 스냅샷 생성
        var snapshot = (0, snapshot_1.createSnapshot)(state);
        // 마지막 스냅샷과 동일하면 무시
        if (this.past.length > 0 &&
            snapshot.id === this.past[this.past.length - 1].id) {
            return;
        }
        // 과거에 추가
        this.past.push(snapshot);
        // 미래 지우기 (새 분기 생성)
        this.future = [];
        // 이력 제한 적용
        if (this.past.length > this.limit) {
            this.past.shift();
        }
    };
    /**
     * 실행 취소
     */
    TimeManager.prototype.undo = function () {
        if (this.past.length <= 1) {
            return false;
        }
        // 현재 상태
        var current = this.past.pop();
        // 미래에 추가
        this.future.unshift(current);
        // 이전 상태로 이동
        var previous = this.past[this.past.length - 1];
        this.atom.set((0, clone_1.structuralClone)(previous.value));
        return true;
    };
    /**
     * 다시 실행
     */
    TimeManager.prototype.redo = function () {
        if (this.future.length === 0) {
            return false;
        }
        // 다음 상태
        var next = this.future.shift();
        // 과거에 추가
        this.past.push(next);
        // 다음 상태로 이동
        this.atom.set((0, clone_1.structuralClone)(next.value));
        return true;
    };
    /**
     * 특정 시점으로 이동
     */
    TimeManager.prototype.goto = function (id) {
        var _a, _b;
        // 과거에서 검색
        var pastIndex = this.past.findIndex(function (snapshot) { return snapshot.id === id; });
        if (pastIndex >= 0) {
            // 현재부터 목표까지의 상태를 미래로 이동
            var currentIndex = this.past.length - 1;
            if (pastIndex < currentIndex) {
                var movingStates = this.past.splice(pastIndex + 1, currentIndex - pastIndex);
                (_a = this.future).unshift.apply(_a, movingStates);
                // 목표 상태로 이동
                var targetState = this.past[this.past.length - 1];
                this.atom.set((0, clone_1.structuralClone)(targetState.value));
                return true;
            }
            return false; // 이미 해당 시점에 있음
        }
        // 미래에서 검색
        var futureIndex = this.future.findIndex(function (snapshot) { return snapshot.id === id; });
        if (futureIndex >= 0) {
            // 목표까지의 상태를 과거로 이동
            var movingStates = this.future.splice(0, futureIndex + 1);
            (_b = this.past).push.apply(_b, movingStates);
            // 목표 상태로 이동
            var targetState = this.past[this.past.length - 1];
            this.atom.set((0, clone_1.structuralClone)(targetState.value));
            return true;
        }
        return false; // 해당 ID를 찾을 수 없음
    };
    /**
     * 과거 스냅샷 가져오기
     */
    TimeManager.prototype.getPast = function () {
        return this.past;
    };
    /**
     * 미래 스냅샷 가져오기
     */
    TimeManager.prototype.getFuture = function () {
        return this.future;
    };
    /**
     * 모든 이력 지우기
     */
    TimeManager.prototype.clear = function () {
        // 현재 상태 유지
        var current = this.past[this.past.length - 1];
        this.past = current ? [current] : [];
        this.future = [];
    };
    /**
     * 이력 저장 제한 설정
     */
    TimeManager.prototype.setLimit = function (limit) {
        if (limit < 1) {
            throw (0, errors_1.createTimeError)(errors_1.ErrorCode.UNKNOWN, "History limit must be at least 1");
        }
        this.limit = limit;
        // 현재 이력에 제한 적용
        if (this.past.length > this.limit) {
            this.past = this.past.slice(-this.limit);
        }
    };
    Object.defineProperty(TimeManager.prototype, "api", {
        /**
         * 시간 API 가져오기
         */
        get: function () {
            return {
                undo: this.undo.bind(this),
                redo: this.redo.bind(this),
                goto: this.goto.bind(this),
                getPast: this.getPast.bind(this),
                getFuture: this.getFuture.bind(this),
                clear: this.clear.bind(this),
                setLimit: this.setLimit.bind(this),
            };
        },
        enumerable: false,
        configurable: true
    });
    return TimeManager;
}());
exports.TimeManager = TimeManager;
// 시간 관리자 레지스트리
var timeManagers = new WeakMap();
/**
 * 아톰에 대한 시간 API 가져오기
 */
function getTimeAPI(atom) {
    if (!timeManagers.has(atom)) {
        timeManagers.set(atom, new TimeManager(atom));
        // 상태 변경 구독
        atom.subscribe(function () {
            var manager = timeManagers.get(atom);
            if (manager) {
                manager.recordState(atom.get());
            }
        });
    }
    return timeManagers.get(atom).api;
}
