import { executeBatch } from "../internals/batch";

/**
 * 트랜잭션 실행
 * 여러 상태 변경을 원자적으로 처리
 */
export function transaction<T>(callback: () => T): T {
  return executeBatch(callback);
}
