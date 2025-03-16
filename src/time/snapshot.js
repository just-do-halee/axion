"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnapshot = createSnapshot;
exports.areSnapshotsEqual = areSnapshotsEqual;
exports.getSnapshotMeta = getSnapshotMeta;
exports.limitSnapshots = limitSnapshots;
var hash_1 = require("../utils/hash");
var clone_1 = require("../utils/clone");
/**
 * 상태 스냅샷 생성
 */
function createSnapshot(value) {
    var timestamp = Date.now();
    var frozenValue = (0, clone_1.structuralClone)(value);
    var id = (0, hash_1.computeHash)(value);
    return {
        value: frozenValue,
        timestamp: timestamp,
        id: id,
    };
}
/**
 * 스냅샷 비교
 */
function areSnapshotsEqual(a, b) {
    return a.id === b.id;
}
/**
 * 스냅샷 메타데이터 추출
 */
function getSnapshotMeta(snapshot) {
    return {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
    };
}
/**
 * 스냅샷 최적화
 * 메모리 관리를 위해 상위 maxCount 스냅샷만 유지
 */
function limitSnapshots(snapshots, maxCount) {
    if (snapshots.length <= maxCount) {
        return snapshots;
    }
    // 최신 상태를 유지하기 위해 배열 끝에서부터 maxCount 항목을 유지
    return snapshots.slice(-maxCount);
}
