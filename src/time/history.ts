import { Atom } from "../core/core-types";
import { StateSnapshot } from "../utils/types";
import { createSnapshot } from "./snapshot";
import { structuralClone } from "../utils/clone";
import { createTimeError, ErrorCode } from "../utils/errors";

/**
 * 시간 관리 API
 */
export interface TimeAPI<T> {
  /** 실행 취소 */
  undo(): boolean;

  /** 다시 실행 */
  redo(): boolean;

  /** 특정 시점으로 이동 */
  goto(id: string): boolean;

  /** 과거 스냅샷 가져오기 */
  getPast(): ReadonlyArray<StateSnapshot<T>>;

  /** 미래 스냅샷 가져오기 */
  getFuture(): ReadonlyArray<StateSnapshot<T>>;

  /** 모든 이력 지우기 */
  clear(): void;

  /** 이력 저장 제한 설정 */
  setLimit(limit: number): void;
}

/**
 * 시간 이동 관리자
 */
export class TimeManager<T> {
  private past: Array<StateSnapshot<T>> = [];
  private future: Array<StateSnapshot<T>> = [];
  private limit = 100;

  constructor(private readonly atom: Atom<T>) {
    // 초기 상태 기록
    this.recordState(atom.get() as T);
  }

  /**
   * 현재 상태 기록
   */
  recordState(state: T): void {
    // 스냅샷 생성
    const snapshot = createSnapshot(state);

    // 마지막 스냅샷과 동일하면 무시
    if (
      this.past.length > 0 &&
      snapshot.id === this.past[this.past.length - 1].id
    ) {
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
  }

  /**
   * 실행 취소
   */
  undo(): boolean {
    if (this.past.length <= 1) {
      return false;
    }

    // 현재 상태
    const current = this.past.pop()!;

    // 미래에 추가
    this.future.unshift(current);

    // 이전 상태로 이동
    const previous = this.past[this.past.length - 1];
    this.atom.set(structuralClone(previous.value as T));

    return true;
  }

  /**
   * 다시 실행
   */
  redo(): boolean {
    if (this.future.length === 0) {
      return false;
    }

    // 다음 상태
    const next = this.future.shift()!;

    // 과거에 추가
    this.past.push(next);

    // 다음 상태로 이동
    this.atom.set(structuralClone(next.value as T));

    return true;
  }

  /**
   * 특정 시점으로 이동
   */
  goto(id: string): boolean {
    // 과거에서 검색
    const pastIndex = this.past.findIndex((snapshot) => snapshot.id === id);
    if (pastIndex >= 0) {
      // 현재부터 목표까지의 상태를 미래로 이동
      const currentIndex = this.past.length - 1;

      if (pastIndex < currentIndex) {
        const movingStates = this.past.splice(
          pastIndex + 1,
          currentIndex - pastIndex
        );
        this.future.unshift(...movingStates);

        // 목표 상태로 이동
        const targetState = this.past[this.past.length - 1];
        this.atom.set(structuralClone(targetState.value as T));
        return true;
      }

      return false; // 이미 해당 시점에 있음
    }

    // 미래에서 검색
    const futureIndex = this.future.findIndex((snapshot) => snapshot.id === id);
    if (futureIndex >= 0) {
      // 목표까지의 상태를 과거로 이동
      const movingStates = this.future.splice(0, futureIndex + 1);
      this.past.push(...movingStates);

      // 목표 상태로 이동
      const targetState = this.past[this.past.length - 1];
      this.atom.set(structuralClone(targetState.value as T));
      return true;
    }

    return false; // 해당 ID를 찾을 수 없음
  }

  /**
   * 과거 스냅샷 가져오기
   */
  getPast(): ReadonlyArray<StateSnapshot<T>> {
    return this.past;
  }

  /**
   * 미래 스냅샷 가져오기
   */
  getFuture(): ReadonlyArray<StateSnapshot<T>> {
    return this.future;
  }

  /**
   * 모든 이력 지우기
   */
  clear(): void {
    // 현재 상태 유지
    const current = this.past[this.past.length - 1];

    this.past = current ? [current] : [];
    this.future = [];
  }

  /**
   * 이력 저장 제한 설정
   */
  setLimit(limit: number): void {
    if (limit < 1) {
      throw createTimeError(
        ErrorCode.UNKNOWN,
        "History limit must be at least 1"
      );
    }

    this.limit = limit;

    // 현재 이력에 제한 적용
    if (this.past.length > this.limit) {
      this.past = this.past.slice(-this.limit);
    }
  }

  /**
   * 시간 API 가져오기
   */
  get api(): TimeAPI<T> {
    return {
      undo: this.undo.bind(this),
      redo: this.redo.bind(this),
      goto: this.goto.bind(this),
      getPast: this.getPast.bind(this),
      getFuture: this.getFuture.bind(this),
      clear: this.clear.bind(this),
      setLimit: this.setLimit.bind(this),
    };
  }
}

// 시간 관리자 레지스트리
const timeManagers = new WeakMap<Atom<any>, TimeManager<any>>();

/**
 * 아톰에 대한 시간 API 가져오기
 */
export function getTimeAPI<T>(atom: Atom<T>): TimeAPI<T> {
  if (!timeManagers.has(atom)) {
    timeManagers.set(atom, new TimeManager(atom));

    // 상태 변경 구독
    atom.subscribe(() => {
      const manager = timeManagers.get(atom);
      if (manager) {
        manager.recordState(atom.get() as T);
      }
    });
  }

  return timeManagers.get(atom)!.api;
}
