// src/internals/memo.ts - 수정된 버전

/**
 * 메모이제이션 캐시 인터페이스
 * 타입 안전성 강화를 위해 제네릭 타입으로 수정
 */
interface MemoCache<TInput, TResult> {
  input: TInput;
  result: TResult;
  isEqual: (a: TInput, b: TInput) => boolean;
  valid: boolean;
}

/**
 * 메모이제이션 함수 생성
 *
 * 파생 계산과 같은 값비싼 계산의 결과를 캐싱하여 성능 최적화
 * 동일한 입력에 대해서는 이전 계산 결과를 재사용
 *
 * @param fn 메모이제이션할 함수
 * @param options 메모이제이션 옵션 (동등성 비교 함수 등)
 * @returns 메모이제이션된 함수
 */
export function createMemoized<TInput, TResult>(
  fn: (input: TInput) => TResult,
  options: {
    isEqual?: (a: TInput, b: TInput) => boolean;
  } = {}
): (input: TInput) => TResult {
  const { isEqual = Object.is } = options;

  // 타입 안전성을 위해 명시적 타입 지정
  let cache: MemoCache<TInput, TResult> | null = null;

  return (input: TInput) => {
    // 캐시가 없거나 입력이 다른 경우 또는 무효화된 경우
    if (!cache || !cache.valid || !isEqual(cache.input, input)) {
      // 새로운 결과 계산
      const result = fn(input);

      // 새 캐시 생성
      cache = {
        input,
        result,
        isEqual,
        valid: true,
      };

      return result;
    }

    // 캐시된 결과 반환
    return cache.result;
  };
}

/**
 * 캐시 무효화가 가능한 메모이제이션 함수 생성
 * 외부에서 캐시를 명시적으로 리셋해야 하는 경우에 사용
 */
export function createResettableMemoized<TInput, TResult>(
  fn: (input: TInput) => TResult,
  options: {
    isEqual?: (a: TInput, b: TInput) => boolean;
  } = {}
): {
  (input: TInput): TResult;
  reset: () => void;
} {
  const { isEqual = Object.is } = options;
  let cache: MemoCache<TInput, TResult> | null = null;

  // 기본 메모이제이션 함수
  const memoized = (input: TInput): TResult => {
    if (!cache || !cache.valid || !isEqual(cache.input, input)) {
      const result = fn(input);
      cache = {
        input,
        result,
        isEqual,
        valid: true,
      };
      return result;
    }
    return cache.result;
  };

  // 캐시 리셋 함수
  memoized.reset = () => {
    cache = null;
  };

  return memoized;
}

/**
 * 인자 없는 함수용 메모이제이션 헬퍼
 * 특별히 파생 상태의 계산 함수와 같이 인자가 없는 함수에 최적화됨
 */
export function createNoArgMemoized<TResult>(fn: () => TResult): () => TResult {
  let cache: { result: TResult; valid: boolean } | null = null;

  return () => {
    if (!cache || !cache.valid) {
      cache = {
        result: fn(),
        valid: true,
      };
    }
    return cache.result;
  };
}
