// src/core/stateNode.ts
import { computeHash } from "../utils/hash";
import { structuralClone, deepFreeze, setValueAtPath } from "../utils/clone";
import { Path, DeepReadonly } from "../utils/types";
import { areRelatedPaths } from "../utils/path";
import { createPathError, createStateError, ErrorCode } from "../utils/errors";

/**
 * 상태 노드 공통 인터페이스
 * 모든 상태 노드 구현체가 따라야 하는 계약
 */
export interface IStateNode<T> {
  get(): DeepReadonly<T>;
  getHash(): string;
  update(updater: (state: DeepReadonly<T>) => T): [IStateNode<T>, Set<Path>];
  getPath(path: Path): unknown;
  setPath(path: Path, value: unknown): [IStateNode<T>, Set<Path>];
}

/**
 * 객체 타입을 위한 상태 노드 구현
 */
export class StateNode<T extends object> implements IStateNode<T> {
  private readonly value: T;
  private readonly hash: string;

  constructor(value: T) {
    // 깊은 복제 후 동결하여 불변성 보장
    this.value = deepFreeze(structuralClone(value));
    this.hash = computeHash(this.value);
  }

  get(): DeepReadonly<T> {
    return this.value as DeepReadonly<T>;
  }

  getHash(): string {
    return this.hash;
  }

  update(updater: (state: DeepReadonly<T>) => T): [StateNode<T>, Set<Path>] {
    const newValue = updater(this.value as DeepReadonly<T>);

    // 해시로 빠르게 동등성 검사
    const newHash = computeHash(newValue);
    if (this.hash === newHash) {
      return [this, new Set()];
    }

    // 변경된 경로 계산
    const changedPaths = this.computeChangedPaths(this.value, newValue);

    // 새 노드 생성
    return [new StateNode(newValue), changedPaths];
  }

  getPath(path: Path): unknown {
    if (path.length === 0) {
      return this.value;
    }

    let current: any = this.value;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];

      // Check if current is null or undefined
      if (current === undefined || current === null) {
        throw new Error(
          `Cannot access path: ${path.slice(0, i + 1).join(".")} - parent is ${
            current === null ? "null" : "undefined"
          }`
        );
      }

      // Check if segment exists in current
      if (!(segment in current)) {
        throw new Error(
          `Cannot access path: ${path
            .slice(0, i + 1)
            .join(".")} - property '${String(segment)}' does not exist`
        );
      }

      current = current[segment];
    }

    return current;
  }

  setPath(path: Path, value: unknown): [StateNode<T>, Set<Path>] {
    if (path.length === 0) {
      if (typeof value !== "object" || value === null) {
        throw createPathError(
          ErrorCode.INVALID_PATH,
          path,
          `Cannot set a non-object value at root level`
        );
      }
      return this.update(() => value as T);
    }

    // 현재 경로 값 가져오기
    const currentValue = this.getPath(path);

    // 값이 동일하면 변경 없음
    if (computeHash(currentValue) === computeHash(value)) {
      return [this, new Set()];
    }

    // 새 상태 생성
    const newValue = setValueAtPath(this.value, path, value);

    // 변경된 경로 집합 생성
    const changedPaths = new Set<Path>([path]);

    return [new StateNode(newValue), changedPaths];
  }

  private computeChangedPaths(oldValue: T, newValue: unknown): Set<Path> {
    const changedPaths = new Set<Path>();

    // 재귀적으로 변경 감지
    function detectChanges(a: any, b: any, currentPath: Path = []): void {
      // 기본 비교로 빠르게 확인
      if (Object.is(a, b)) {
        return;
      }

      // 타입 불일치
      if (
        typeof a !== typeof b ||
        (a === null && b !== null) ||
        (a !== null && b === null)
      ) {
        changedPaths.add([...currentPath]);
        return;
      }

      // 객체가 아니면 값이 다른 것
      if (typeof a !== "object" || a === null) {
        changedPaths.add([...currentPath]);
        return;
      }

      // 배열 길이 변경
      if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
        changedPaths.add([...currentPath]);
      }

      // 객체/배열 속성 비교
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

      for (const key of allKeys) {
        const nextPath = [...currentPath, key];

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
    const optimizedPaths = new Set<Path>();

    const pathArray = Array.from(changedPaths);
    pathArray.sort((a, b) => a.length - b.length);

    for (const path of pathArray) {
      // 이미 관련 경로가 추가되었는지 확인
      let hasRelatedPath = false;

      for (const existingPath of optimizedPaths) {
        if (areRelatedPaths(path, existingPath)) {
          hasRelatedPath = true;
          break;
        }
      }

      if (!hasRelatedPath) {
        optimizedPaths.add(path);
      }
    }

    return optimizedPaths;
  }
}

/**
 * 원시 타입을 위한 상태 노드 구현
 */
export class PrimitiveStateNode<T> implements IStateNode<T> {
  private readonly value: T;
  private readonly hash: string;

  constructor(value: T) {
    this.value = value;
    this.hash = String(value);
  }

  get(): DeepReadonly<T> {
    return this.value as DeepReadonly<T>;
  }

  getHash(): string {
    return this.hash;
  }

  update(
    updater: (state: DeepReadonly<T>) => T
  ): [PrimitiveStateNode<T>, Set<Path>] {
    const newValue = updater(this.value as DeepReadonly<T>);

    if (Object.is(this.value, newValue)) {
      return [this, new Set()];
    }

    return [new PrimitiveStateNode(newValue), new Set([[]])];
  }

  getPath(_path: Path): unknown {
    throw createStateError(
      ErrorCode.INVALID_OPERATION,
      "Cannot access path on primitive value"
    );
  }

  setPath(_path: Path, _value: unknown): [PrimitiveStateNode<T>, Set<Path>] {
    throw createStateError(
      ErrorCode.INVALID_OPERATION,
      "Cannot set path on primitive value"
    );
  }
}

/**
 * 상태 노드 팩토리 함수
 * 값 타입에 따라 적절한 상태 노드 구현체 반환
 */
export function createStateNode<T>(value: T): IStateNode<T> {
  if (typeof value === "object" && value !== null) {
    return new StateNode(value as T & object) as unknown as IStateNode<T>;
  } else {
    return new PrimitiveStateNode(value);
  }
}
