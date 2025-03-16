import { DeepReadonly, StateSnapshot } from "../utils/types";
import { computeHash } from "../utils/hash";
import { structuralClone } from "../utils/clone";

/**
 * 상태 스냅샷 생성
 */
export function createSnapshot<T>(value: T): StateSnapshot<T> {
  const timestamp = Date.now();
  const frozenValue = structuralClone(value) as DeepReadonly<T>;
  const id = computeHash(value);

  return {
    value: frozenValue,
    timestamp,
    id,
  };
}

/**
 * 스냅샷 비교
 */
export function areSnapshotsEqual<T>(
  a: StateSnapshot<T>,
  b: StateSnapshot<T>
): boolean {
  return a.id === b.id;
}

/**
 * 스냅샷 메타데이터 추출
 */
export function getSnapshotMeta<T>(
  snapshot: StateSnapshot<T>
): Omit<StateSnapshot<T>, "value"> {
  return {
    id: snapshot.id,
    timestamp: snapshot.timestamp,
  };
}

/**
 * 스냅샷 최적화
 * 메모리 관리를 위해 상위 maxCount 스냅샷만 유지
 */
export function limitSnapshots<T>(
  snapshots: StateSnapshot<T>[],
  maxCount: number
): StateSnapshot<T>[] {
  if (snapshots.length <= maxCount) {
    return snapshots;
  }

  // 최신 상태를 유지하기 위해 배열 끝에서부터 maxCount 항목을 유지
  return snapshots.slice(-maxCount);
}
