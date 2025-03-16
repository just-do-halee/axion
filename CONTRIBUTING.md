# Axion 개발자 매뉴얼

1. [소개](#1-소개)
2. [이론적 기반](#2-이론적-기반)
3. [아키텍처 개요](#3-아키텍처-개요)
4. [핵심 모듈](#4-핵심-모듈)
5. [API 참조](#5-api-참조)
6. [고급 개념](#6-고급-개념)
7. [확장 가이드](#7-확장-가이드)
8. [기여 가이드](#8-기여-가이드)
9. [성능 최적화](#9-성능-최적화)
10. [예제 및 패턴](#10-예제-및-패턴)

---

## 1. 소개

### 1.1 Axion란?

Axion은 수학적으로 증명된 원리를 기반으로 설계된 현대적 상태 관리 라이브러리입니다. 복잡한 상태 관리를 단순화하고, 예측 가능하며, 성능이 뛰어난 솔루션을 제공합니다. 이 라이브러리는 다음과 같은 핵심 가치를 중심으로 설계되었습니다:

- **수학적 엄밀성**: 모든 기능이 형식적 증명에 기반
- **성능 최적화**: 증분 계산과 최소 업데이트
- **개발자 경험**: 직관적 API와 강력한 타입 안전성
- **확장성**: 간결한 코어와 플러그인 아키텍처

### 1.2 핵심 특징

- **단일 원천 진실**: 예측 가능한 상태 관리
- **자동 의존성 추적**: 선언적 파생 상태
- **경로 기반 접근**: 깊게 중첩된 객체의 효율적 업데이트
- **트랜잭션**: 원자적 상태 변경
- **시간 여행**: 내장된 실행 취소/다시 실행 기능
- **타입 안전성**: 완전한 TypeScript 지원
- **프레임워크 독립적**: React, Vue 또는 바닐라 JS에서 사용 가능

### 1.3 디자인 원칙

1. **단순성**: 불필요한 복잡성 제거
2. **일관성**: 예측 가능한 API 패턴
3. **분리의 원칙**: 명확한 관심사 분리
4. **불변성**: 모든 상태 변경은 불변적(immutable)
5. **제로 오버헤드 추상화**: 성능 저하 없는 편리한 API

### 1.4 Axion vs 다른 라이브러리

| 특징              | Axion            | Redux       | MobX          | Zustand   | Jotai/Recoil |
| ----------------- | ---------------- | ----------- | ------------- | --------- | ------------ |
| **기반 패러다임** | DILC 수학 모델   | Flux        | 관찰 가능성   | Flux + 훅 | 원자적 상태  |
| **상태 접근**     | 경로 기반        | 선택자      | 프록시        | 선택자    | 선택자       |
| **변경 감지**     | 정밀한 경로 추적 | 얕은 비교   | 프록시        | 얕은 비교 | 원자 의존성  |
| **불변성**        | 필수             | 필수        | 선택적        | 필수      | 필수         |
| **파생 상태**     | 자동 의존성      | 수동        | 자동          | 수동      | 자동         |
| **TypeScript**    | 고급 유형 추론   | 기본        | 기본          | 중급      | 중급         |
| **번들 크기**     | 약 8KB           | ~16KB       | ~22KB         | ~3KB      | ~7KB         |
| **최적화**        | 경로 기반 차등   | 선택자 메모 | 세분화된 관찰 | 선택자    | 원자 차원    |

## 2. 이론적 기반

### 2.1 DILC 모델 소개

DILC(Directed Incremental Lattice Category)는 Axion의 핵심 이론적 기반입니다. 이 수학적 모델은 상태 관리를 형식화하기 위해 다음 수학 분야를 통합합니다:

- **카테고리 이론**: 상태 변환 및 합성
- **격자 이론**: 상태 관계 및 의존성 구조화
- **증분 계산 이론**: 효율적인 재계산
- **방향 그래프 이론**: 의존성 흐름 모델링

### 2.2 수학적 이론

#### 2.2.1 머클 트리 상태 모델

Axion는 상태를 해시 기반 머클 트리로 모델링합니다. 각 노드는 해시 값을 가지며, 이를 통해 변경 감지와 효율적인 비교가 가능합니다.

```
       hash(root)
       /        \
  hash(A)      hash(B)
  /    \       /    \
h(A1)  h(A2)  h(B1)  h(B2)
```

#### 2.2.2 카테고리적 렌즈

Axion는 상태의 일부에 접근하고 업데이트하기 위해 '렌즈'라는 대수적 구조를 사용합니다:

```
Lens<S, A> = (get: S → A, set: S × A → S)
```

렌즈는 다음 법칙을 만족합니다:

- GetSet: `get(set(s, a)) = a`
- SetGet: `set(s, get(s)) = s`
- SetSet: `set(set(s, a), b) = set(s, b)`

#### 2.2.3 의존성 그래프

Axion는 상태 간의 의존성을 유향 비순환 그래프(DAG)로, 의존성 공간을 완전 격자(complete lattice)로 모델링합니다.

```
G = (V, E)
- V: 상태 참조 집합
- E: 의존성 관계 집합 (방향성 있음)
```

#### 2.2.4 증분 델타 계산

상태 변화는 최소 델타 세트로 표현됩니다:

```
Δ(s, s') = { (p, v') | p ∈ paths(s), v' = s'[p] ≠ s[p] }
```

- `Δ(s, s)` = ∅ (자기 자신과의 델타는 없음)
- `Δ(s1, s3)` ⊆ `Δ(s1, s2)` ∪ `Δ(s2, s3)` (델타 삼각 부등식)

### 2.3 실용적 의미

이러한 수학적 기반이 실제로 의미하는 바:

1. **증명 가능한 일관성**: 상태 업데이트의
   무결성 보장
2. **최적 성능**: 정확히 필요한 계산만 수행
3. **디버깅 용이성**: 상태 변화의 명확한 추적
4. **유지보수성**: 추론하기 쉬운 코드

## 3. 아키텍처 개요

### 3.1 시스템 구성 요소

Axion는 다음 핵심 구성 요소로 이루어져 있습니다:

```
┌───────────────────────────────────────────────────────────┐
│                     사용자 인터페이스 계층                    │
└───────────┬───────────────────────────────┬───────────────┘
            │                               │
┌───────────▼───────────┐       ┌───────────▼───────────┐
│       API 계층         │◄─────►│       통합 계층        │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
┌───────────▼───────────────────────────────▼───────────┐
│                     DILC 코어 프레임워크                 │
├─────────────┬─────────────┬─────────────┬─────────────┤
│  상태 엔진   │  증분 엔진  │  변환 엔진  │ 의존성 엔진 │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

1. **DILC 코어 프레임워크**: 상태 관리의 수학적 기반
2. **API 계층**: 개발자 인터페이스
3. **통합 계층**: 프레임워크별 바인딩
4. **사용자 인터페이스 계층**: 뷰 및 렌더링

### 3.2 데이터 흐름

Axion의 데이터 흐름은 단방향입니다:

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ 상태   │───►│ 변환   │───►│ 새 상태 │───►│ 구독자  │
└────────┘    └────────┘    └────────┘    └────────┘
                                │
                                ▼
                           ┌────────┐
                           │재계산   │
                           │(필요시) │
                           └────────┘
```

1. 상태 변환이 적용됨
2. 변경된 경로 추적
3. 영향받는 파생 상태 재계산
4. 구독자에게 알림

### 3.3 핵심 추상화

```
┌─────────────┐
│  Atom<T>    │ - 상태의 기본 단위
└──────┬──────┘
       │
┌──────▼──────┐
│PathOperator<T>│ - 경로 접근 연산자
└──────┬──────┘
       │
┌──────▼──────┐
│ Transform<T> │ - 상태 변환 대수
└──────┬──────┘
       │
┌──────▼──────┐
│ Derived<T>  │ - 파생 상태
└─────────────┘
```

## 4. 핵심 모듈

### 4.1 상태 모듈 (`core/`)

상태 모듈은 Axion의 중심이며, 다음 구성 요소를 포함합니다:

#### 4.1.1 `state.ts`

상태 아톰과 기본 상태 API를 구현합니다.

**책임**:

- 상태 생성 및 관리
- 구독 관리
- 불변성 보장

**주요 클래스/함수**:

- `createAtom<T>`: 상태 아톰 생성
- `Atom<T>` 인터페이스: 상태 조작 API

#### 4.1.2 `stateNode.ts`

상태의 내부 구조를 구현합니다.

**책임**:

- 해시 기반 불변 상태 저장
- 변경 감지 및 델타 계산
- 경로 기반 접근 및 업데이트

**주요 클래스/함수**:

- `StateNode<T>`: 내부 상태 구조
- `update`, `getPath`, `setPath`: 핵심 상태 연산

#### 4.1.3 `path.ts`

경로 기반 상태 접근을 구현합니다.

**책임**:

- 상태의 특정 부분에 대한 타입 안전한 접근
- 경로 연산자 제공

**주요 클래스/함수**:

- `PathNode<T, P>`: 타입 안전한 경로 접근자
- `at`, `get`, `set`, `update`: 경로 조작

### 4.2 의존성 추적 모듈 (`internals/`)

#### 4.2.1 `dependency.ts`

의존성 추적 시스템을 구현합니다.

**책임**:

- 의존성 자동 추적
- 순환 의존성 감지 및 방지
- 의존성 그래프 유지

**주요 클래스/함수**:

- `DependencyTracker`: 의존성 수집기
- `startTracking`, `stopTracking`: 추적 제어
- `detectCycle`: 순환 의존성 감지

#### 4.2.2 `memo.ts`

메모이제이션 시스템을 구현합니다.

**책임**:

- 계산 결과 캐싱
- 캐시 무효화 관리
- 성능 최적화

**주요 클래스/함수**:

- `createMemoized`: 메모이제이션 함수 생성
- `createKeyedMemoized`: 키 기반 메모이제이션
- `createScopedMemoized`: 스코프 기반 메모이제이션

#### 4.2.3 `batch.ts`

상태 업데이트 배치 처리를 구현합니다.

**책임**:

- 여러 업데이트를 단일 변경으로 그룹화
- 불필요한 리렌더링 방지

**주요 클래스/함수**:

- `executeBatch`: 배치 내에서 함수 실행
- `isBatching`: 현재 배치 상태 확인
- `scheduleBatchedEffect`: 효과 예약

### 4.3 파생 상태 모듈 (`core/`)

#### 4.3.1 `derive.ts`

파생 상태 시스템을 구현합니다.

**책임**:

- 자동 의존성 추적 기반 파생 상태
- 증분 재계산
- 최적화된 구독

**주요 클래스/함수**:

- `createDerived`: 파생 상태 생성
- 내부 의존성 추적 및 재계산 로직

### 4.4 효과 모듈 (`core/`)

#### 4.4.1 `effect.ts`

반응형 효과 시스템을 구현합니다.

**책임**:

- 상태 변경에 반응하는 사이드 이펙트
- 정리 함수 관리
- 효과 활성화/비활성화

**주요 클래스/함수**:

- `createEffect`: 효과 생성
- 내부 효과 추적 및 실행 로직

### 4.5 시간 모듈 (`time/`)

#### 4.5.1 `history.ts`

시간 여행 기능을 구현합니다.

**책임**:

- 상태 이력 관리
- 실행 취소/다시 실행 지원

**주요 클래스/함수**:

- `TimeManager`: 이력 관리자
- `getTimeAPI`: 시간 API 제공

#### 4.5.2 `snapshot.ts`

상태 스냅샷을 관리합니다.

**책임**:

- 상태 스냅샷 생성 및 비교
- 스냅샷 직렬화/역직렬화
- 스냅샷 압축

**주요 클래스/함수**:

- `createSnapshot`: 스냅샷 생성
- `compressSnapshots`: 스냅샷 최적화

### 4.6 유틸리티 모듈 (`utils/`)

#### 4.6.1 `types.ts`

타입 정의를 제공합니다.

**책임**:

- 타입 안전성을 위한 타입 정의
- 타입 유틸리티 제공

**주요 타입**:

- `DeepReadonly<T>`: 깊은 읽기 전용 타입
- `Path`, `PathValue`: 경로 관련 타입
- 기타 유틸리티 타입

#### 4.6.2 `hash.ts`

해싱 기능을 구현합니다.

**책임**:

- 값 해싱
- 머클 트리를 위한 해시 계산

**주요 함수**:

- `computeHash`: 객체 해시 계산
- `hashPath`: 경로 해싱

#### 4.6.3 `clone.ts`

객체 복제 및 구조적 공유를 구현합니다.

**책임**:

- 불변 데이터 구조 지원
- 최적화된 객체 복사

**주요 함수**:

- `structuralClone`: 구조적 공유를 활용한 복제
- `deepFreeze`: 객체 불변성 강제
- `setValueAtPath`: 경로에 값 설정

#### 4.6.4 `path.ts`

경로 처리 기능을 구현합니다.

**책임**:

- 경로 문자열 변환
- 경로 관계 연산

**주요 함수**:

- `stringToPath`: 문자열을 경로로 변환
- `pathToString`: 경로를 문자열로 변환
- `areRelatedPaths`: 경로 관계 확인

## 5. API 참조

### 5.1 핵심 API

#### 5.1.1 `axion<T>(initialState: T, options?: Options<T>): Atom<T>`

상태 아톰을 생성합니다.

**파라미터**:

- `initialState: T` - 초기 상태 값
- `options?: Options<T>` - 선택적 옵션
  - `name?: string` - 디버깅용 이름
  - `equals?: (a: T, b: T) => boolean` - 값 비교 함수
  - `devtools?: boolean` - 디버깅 도구 활성화

**반환값**:

- `Atom<T>` - 상태 아톰

**예제**:

```typescript
// 기본 사용법
const counter = axion({ count: 0 });

// 옵션 사용
const user = axion(
  { name: "John", age: 30 },
  { name: "userState", devtools: true }
);
```

#### 5.1.2 `Atom<T>` 인터페이스

상태 아톰의 인터페이스입니다.

**속성 및 메서드**:

- `get(): DeepReadonly<T>` - 현재 상태 값 가져오기
- `set(newState: T): void` - 새 상태로 설정
- `update(updater: (state: DeepReadonly<T>) => T): void` - 함수로 상태 업데이트
- `at<K extends keyof T>(key: K): PathNode<T, [K]>` - 경로 접근자 가져오기
- `subscribe(handler: () => void): () => void` - 변경 구독
- `getPath(path: Path): unknown` - 내부용, 경로로 값 가져오기
- `setPath(path: Path, value: unknown): void` - 내부용, 경로에 값 설정

**예제**:

```typescript
// 상태 가져오기
const value = counter.get();

// 상태 설정
counter.set({ count: 5 });

// 함수로 업데이트
counter.update((state) => ({ count: state.count + 1 }));

// 경로 접근자 사용
const countPath = counter.at("count");

// 변경 구독
const unsubscribe = counter.subscribe(() => {
  console.log("State changed:", counter.get());
});

// 구독 취소
unsubscribe();
```

#### 5.1.3 `PathNode<T, P>` 인터페이스

경로 접근자 인터페이스입니다.

**메서드**:

- `get(): PathValue<T, P>` - 경로의 값 가져오기
- `set(value: PathValue<T, P>): void` - 경로의 값 설정
- `update(updater: (current: PathValue<T, P>) => PathValue<T, P>): void` - 함수로 경로 값 업데이트
- `at<K extends keyof PathValue<T, P>>(key: K): PathNode<T, [...P, K]>` - 하위 경로 접근자 가져오기
- `subscribe(handler: () => void): () => void` - 특정 경로 변경 구독

**예제**:

```typescript
const user = axion({
  name: "John",
  profile: {
    age: 30,
    email: "john@example.com",
  },
});

// 경로로 값 가져오기
const name = user.at("name").get();

// 경로에 값 설정
user.at("name").set("Jane");

// 중첩 경로 접근
const age = user.at("profile").at("age").get();

// 함수로 경로 값 업데이트
user
  .at("profile")
  .at("age")
  .update((age) => age + 1);

// 경로 변경 구독
const unsubscribe = user.at("name").subscribe(() => {
  console.log("Name changed:", user.at("name").get());
});
```

### 5.2 파생 상태 API

#### 5.2.1 `axion.derive<T>(compute: () => T, options?: { equals?: (a: T, b: T) => boolean, name?: string }): Atom<T>`

파생 상태를 생성합니다.

**파라미터**:

- `compute: () => T` - 계산 함수
- `options?: Object` - 선택적 옵션
  - `equals?: (a: T, b: T) => boolean` - 값 비교 함수
  - `name?: string` - 디버깅용 이름

**반환값**:

- `Atom<T>` - 파생 상태 아톰

**예제**:

```typescript
// 기본 파생 상태
const counter = axion({ count: 0 });
const doubled = axion.derive(() => counter.get().count * 2);

// 복합 파생 상태
const formState = axion({
  firstName: "John",
  lastName: "Doe",
});

const fullName = axion.derive(() => {
  const state = formState.get();
  return `${state.firstName} ${state.lastName}`;
});

// 커스텀 비교 함수
const list = axion({ items: [1, 2, 3] });
const itemArray = axion.derive(() => [...list.get().items], {
  equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
});
```

### 5.3 효과 API

#### 5.3.1 `axion.effect<T = void>(effectFn: (state: DeepReadonly<T>) => void | (() => void)): () => void`

반응형 효과를 생성합니다.

**파라미터**:

- `effectFn: (state: DeepReadonly<T>) => void | (() => void)` - 효과 함수 (선택적으로 정리 함수 반환)

**반환값**:

- `() => void` - 효과 정리 함수

**예제**:

```typescript
// 기본 효과
const counter = axion({ count: 0 });
const cleanup = axion.effect(() => {
  console.log("Count:", counter.get().count);
});

// 정리 함수가 있는 효과
const isOnline = axion({ value: true });
const cleanup = axion.effect(() => {
  const online = isOnline.get().value;
  console.log(`Status: ${online ? "Online" : "Offline"}`);

  // 정리 함수 반환
  return () => {
    console.log("Cleaning up...");
  };
});

// 효과 정리
cleanup();
```

### 5.4 트랜잭션 API

#### 5.4.1 `axion.tx<T>(callback: () => T): T`

원자적 트랜잭션을 실행합니다.

**파라미터**:

- `callback: () => T` - 트랜잭션 내에서 실행할 콜백

**반환값**:

- `T` - 콜백의 반환값

**예제**:

```typescript
// 기본 트랜잭션
const user = axion({
  name: "John",
  email: "john@example.com",
  lastUpdated: null,
});

axion.tx(() => {
  user.at("name").set("Jane");
  user.at("email").set("jane@example.com");
  user.at("lastUpdated").set(new Date().toISOString());
});

// 중첩 트랜잭션
axion.tx(() => {
  user.at("name").set("Alice");

  axion.tx(() => {
    user.at("email").set("alice@example.com");
  });

  user.at("lastUpdated").set(new Date().toISOString());
});
```

### 5.5 시간 여행 API

#### 5.5.1 `axion.getTimeAPI<T>(atom: Atom<T>): TimeAPI<T>`

시간 여행 API를 제공합니다.

**파라미터**:

- `atom: Atom<T>` - 대상 아톰

**반환값**:

- `TimeAPI<T>` - 시간 여행 API

#### 5.5.2 `TimeAPI<T>` 인터페이스

시간 여행 기능을 제공하는 인터페이스입니다.

**메서드**:

- `undo(): boolean` - 변경 실행 취소
- `redo(): boolean` - 변경 다시 실행
- `goto(id: string): boolean` - 특정 시점으로 이동
- `getPast(): ReadonlyArray<StateSnapshot<T>>` - 과거 스냅샷 가져오기
- `getFuture(): ReadonlyArray<StateSnapshot<T>>` - 미래 스냅샷 가져오기
- `clear(): void` - 이력 지우기
- `setLimit(limit: number): void` - 이력 제한 설정

**예제**:

```typescript
// 시간 여행 API 가져오기
const counter = axion({ count: 0 });
const timeAPI = axion.getTimeAPI(counter);

// 상태 변경
counter.at("count").set(1);
counter.at("count").set(2);
counter.at("count").set(3);

// 실행 취소
timeAPI.undo(); // count = 2
timeAPI.undo(); // count = 1

// 다시 실행
timeAPI.redo(); // count = 2

// 과거 스냅샷 가져오기
const snapshots = timeAPI.getPast();

// 특정 시점으로 이동
timeAPI.goto(snapshots[0].id);

// 이력 제한 설정
timeAPI.setLimit(10);

// 이력 지우기
timeAPI.clear();
```

### 5.6 디버깅 API

#### 5.6.1 `axion.devtools`

디버깅 도구를 제공합니다.

**메서드**:

- `createDevtools(options?: DevtoolsOptions): Devtools` - 디버깅 도구 인스턴스 생성
- `getDevtools(): Devtools | null` - 현재 디버깅 도구 인스턴스 가져오기
- `registerWithDevtools<T>(atom: Atom<T>, name: string): Atom<T>` - 아톰을 디버깅 도구에 등록

**예제**:

```typescript
// 디버깅 도구 초기화
const devtools = axion.devtools({
  name: "MyApp",
  maxEvents: 100,
  logToConsole: true,
});

// 아톰 등록
const counter = axion({ count: 0 });
axion.registerWithDevtools(counter, "counter");

// 이벤트 구독
devtools.subscribe((event) => {
  console.log("Devtools event:", event);
});

// 현재 상태 스냅샷 가져오기
const snapshot = devtools.getStateSnapshot();
```

### 5.7 오류 처리 API

#### 5.7.1 `axion.setErrorHandler`

글로벌 오류 핸들러를 설정합니다.

**파라미터**:

- `handler: (error: AxionError) => void` - 오류 핸들러

**예제**:

```typescript
// 글로벌 오류 핸들러 설정
axion.setErrorHandler((error) => {
  console.error(`[${error.code}] ${error.message}`);

  // 분석 서비스에 오류 보고
  analyticsService.reportError(error);
});
```

### 5.8 프레임워크 통합 API

#### 5.8.1 React

```typescript
import { useAxion } from "axion-state/react";

// 아톰 사용
function Counter() {
  const counter = axion({ count: 0 });
  const [state, setState] = useAxion(counter);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => setState((s) => ({ count: s.count + 1 }))}>
        Increment
      </button>
    </div>
  );
}

// 경로 접근자 사용
function UserProfile() {
  const user = axion({
    name: "John",
    profile: { age: 30 },
  });

  const name = useAxion(user.at("name"));
  const age = useAxion(user.at("profile").at("age"));

  return (
    <div>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
    </div>
  );
}
```

#### 5.8.2 Vue

```typescript
import { useAxion, useAxionComputed } from "axion-state/vue";

// Vue Composition API에서 사용
export default {
  setup() {
    const counter = axion({ count: 0 });

    // 반응형 상태
    const state = useAxion(counter);

    // 계산된 속성
    const doubled = useAxionComputed(() => state.value.count * 2);

    // 메서드
    const increment = () => {
      counter.update((s) => ({ count: s.count + 1 }));
    };

    return {
      state,
      doubled,
      increment,
    };
  },
};
```

## 6. 고급 개념

### 6.1 순환 의존성 탐지

Axion는 파생 상태와 효과 사이의 순환 의존성을 자동으로 감지하고 방지합니다.

#### 작동 방식

1. **계산 스택 추적**: 파생 계산이 시작될 때 현재 아톰 ID를 스택에 추가
2. **의존성 확인**: 의존성 추가 시 스택에 이미 있는지 확인
3. **사이클 감지**: 동일한 아톰 ID가 발견되면 순환 의존성 오류 발생

```typescript
// 순환 의존성 예시
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);

// 순환 의존성 - 오류 발생!
const c = axion.derive(() => {
  const valueB = b.get();
  a.set({ value: valueB + 1 }); // a가 b에 의존하고, b는 a에 의존
  return valueB + 3;
});
```

### 6.2 메모이제이션 전략

Axion는 여러 수준의 메모이제이션을 사용하여 성능을 최적화합니다.

#### 6.2.1 단일 캐시 메모이제이션

가장 흔한 경우를 위한 최적화된 메모이제이션 전략입니다.

```typescript
// 내부 구현
function memoize<T>(fn: () => T): () => T {
  let cache: T | undefined;
  let isInitialized = false;

  return () => {
    if (!isInitialized) {
      cache = fn();
      isInitialized = true;
    }
    return cache;
  };
}
```

#### 6.2.2 LRU 캐시 메모이제이션

여러 입력 값에 대한 결과를 캐싱합니다.

```typescript
// 내부 구현
function memoizeWithLRU<K, V>(fn: (key: K) => V, maxSize = 10): (key: K) => V {
  const cache = new Map<string, { key: K; value: V }>();
  const keyOrder: K[] = [];

  return (key: K) => {
    // 캐시 확인 및 관리 로직
    // ...
  };
}
```

### 6.3 트랜잭션 중첩

Axion는 중첩된 트랜잭션을 자연스럽게 지원합니다.

#### 작동 방식

1. 트랜잭션이 시작되면 깊이 카운터 증가
2. 중첩된 트랜잭션은 카운터만 증가시킴
3. 마지막 트랜잭션이 완료될 때만 변경 사항 적용 및 알림

```typescript
// 내부 구현
let batchDepth = 0;

function executeBatch<T>(callback: () => T): T {
  batchDepth++;
  try {
    return callback();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPendingEffects();
    }
  }
}
```

### 6.4 델타 압축

변경 사항을 최적화하기 위한 델타 압축 전략입니다.

#### 작동 방식

1. 변경된 모든 경로 수집
2. 상위 경로가 있으면 하위 경로 제거
3. 최소한의 델타 집합 계산

```typescript
// 내부 구현
function optimizePaths(paths: Path[]): Path[] {
  const result = new Set<Path>();

  paths.sort((a, b) => a.length - b.length);

  for (const path of paths) {
    let hasParent = false;

    for (const existing of result) {
      if (isSubPath(existing, path)) {
        hasParent = true;
        break;
      }
    }

    if (!hasParent) {
      result.add(path);
    }
  }

  return Array.from(result);
}
```

### 6.5 시간 복잡도 분석

주요 연산의 시간 복잡도:

| 연산                  | 복잡도   | 설명             |
| --------------------- | -------- | ---------------- |
| `atom.get()`          | O(1)     | 상수 시간 접근   |
| `atom.set(value)`     | O(n)     | n은 상태 크기    |
| `pathNode.get()`      | O(log d) | d는 경로 깊이    |
| `pathNode.set(value)` | O(log d) | 경로 깊이에 비례 |
| 파생 계산             | O(c)     | c는 계산 복잡도  |
| 델타 계산             | O(Δ)     | Δ는 변경 크기    |
| 변경 감지             | O(log n) | 해시 기반 감지   |
| 의존성 추적           | O(k)     | k는 의존성 수    |

### 6.6 커스텀 비교 함수

특별한 동등성 비교가 필요한 경우:

```typescript
// 배열에 대한 깊은 비교
const list = axion(
  { items: [1, 2, 3] },
  {
    equals: (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;

      if (Array.isArray(a.items) && Array.isArray(b.items)) {
        if (a.items.length !== b.items.length) return false;
        return a.items.every((v, i) => v === b.items[i]);
      }

      return false;
    },
  }
);

// 파생 상태에도 적용 가능
const filteredItems = axion.derive(
  () => list.get().items.filter((x) => x % 2 === 0),
  {
    equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  }
);
```

## 7. 확장 가이드

### 7.1 커스텀 아톰 구현

Axion 코어를 확장하여 특별한 요구 사항에 맞는 아톰을 구현할 수 있습니다.

```typescript
import { createAtom, Atom } from "axion-state";

// 로컬 스토리지 지원 아톰
function createPersistentAtom<T>(key: string, initialState: T): Atom<T> {
  // 로컬 스토리지에서 초기 상태 로드
  const savedState = localStorage.getItem(key);
  const state = savedState ? JSON.parse(savedState) : initialState;

  // 기본 아톰 생성
  const atom = createAtom(state);

  // 원래 get/set 함수 저장
  const originalSet = atom.set;

  // set 함수 오버라이드
  atom.set = function (newState: T): void {
    // 기본 구현 호출
    originalSet.call(atom, newState);

    // 로컬 스토리지에 저장
    localStorage.setItem(key, JSON.stringify(newState));
  };

  return atom;
}

// 사용 예
const persistentCounter = createPersistentAtom("counter", { count: 0 });
```

### 7.2 미들웨어 구현

Axion의 동작을 커스터마이즈하는 미들웨어를 구현할 수 있습니다.

```typescript
import { createAtom, Atom } from "axion-state";

// 로깅 미들웨어
function withLogging<T>(name: string): (atom: Atom<T>) => Atom<T> {
  return (atom) => {
    // 원래 메서드 저장
    const originalGet = atom.get;
    const originalSet = atom.set;
    const originalUpdate = atom.update;

    // 메서드 오버라이드
    atom.get = function () {
      const result = originalGet.call(atom);
      console.log(`[${name}] Get:`, result);
      return result;
    };

    atom.set = function (newState: T) {
      console.log(`[${name}] Set:`, newState);
      originalSet.call(atom, newState);
    };

    atom.update = function (updater) {
      console.log(`[${name}] Update`);
      originalUpdate.call(atom, updater);
    };

    return atom;
  };
}

// 사용 예
const counter = withLogging("counter")(createAtom({ count: 0 }));
```

### 7.3 커스텀 변환자

특별한 상태 변환을 위한 변환자를 구현할 수 있습니다.

```typescript
import { createTransformer, Transformer } from "axion-state/core";

// 불변 업데이트 함수 타입
type Updater<T> = (state: T) => T;

// Immer 스타일 변환자
function createImmerTransformer<T>(
  producer: (draft: T) => void
): Transformer<T> {
  return createTransformer(
    ["*"], // 모든 경로에 영향
    (state) => {
      // immer 라이브러리 사용
      const [nextState, patches] = produce(state, producer, true);

      // 변경된 경로 추출
      const paths = patches.map((patch) =>
        patch.path.split("/").filter(Boolean)
      );

      return [nextState, new Set(paths)];
    }
  );
}

// 사용 예
const updateUser = createImmerTransformer((draft) => {
  draft.name = "Jane";
  draft.profile.age += 1;
});

// 적용
store.apply(updateUser);
```

### 7.4 플러그인 개발

Axion 생태계를 확장하는 플러그인을 개발할 수 있습니다.

```typescript
// 상태 영속성 플러그인
export function persistPlugin<T>(
  key: string,
  options: {
    storage?: Storage;
    serialize?: (state: T) => string;
    deserialize?: (data: string) => T;
  } = {}
) {
  const {
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  return {
    // 아톰 확장
    extendAtom(atom: Atom<T>): Atom<T> {
      // 로컬 스토리지에서 초기 데이터 로드
      const savedData = storage.getItem(key);
      if (savedData) {
        try {
          const state = deserialize(savedData);
          atom.set(state);
        } catch (e) {
          console.error("Failed to deserialize state:", e);
        }
      }

      // 변경 사항 구독 및 저장
      atom.subscribe(() => {
        try {
          const serialized = serialize(atom.get());
          storage.setItem(key, serialized);
        } catch (e) {
          console.error("Failed to serialize state:", e);
        }
      });

      return atom;
    },

    // 메서드 추가
    methods: {
      clearPersistedState() {
        storage.removeItem(key);
      },

      getPersistedState(): T | null {
        const data = storage.getItem(key);
        return data ? deserialize(data) : null;
      },
    },
  };
}

// 사용 예
const persist = persistPlugin("counter");
const counter = persist.extendAtom(axion({ count: 0 }));

// 플러그인이 추가한 메서드 사용
persist.methods.clearPersistedState();
```

## 8. 기여 가이드

### 8.1 개발 환경 설정

```bash
# 저장소 복제
git clone https://github.com/axion-state/axion.git
cd axion

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 테스트 실행
npm test

# 빌드
npm run build
```

### 8.2 코드 스타일

Axion는 다음 코딩 표준을 준수합니다:

- TypeScript 타입 안전성
- 함수형 프로그래밍 원칙
- 불변성 우선
- 명확한 네이밍
- 철저한 문서화

```typescript
/**
 * 특정 경로의 값을 가져옵니다.
 *
 * @param obj - 소스 객체
 * @param path - 접근할 경로
 * @returns 경로에 있는 값, 또는 경로가 존재하지 않으면 undefined
 *
 * @example
 * getValueAtPath({ a: { b: 1 } }, ['a', 'b']) // 1
 */
export function getValueAtPath<T>(
  obj: T,
  path: Array<string | number | symbol>
): unknown {
  if (path.length === 0) {
    return obj;
  }

  let current: any = obj;

  for (const segment of path) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}
```

### 8.3 테스트 가이드

모든 기능에는 다음 테스트가 포함되어야 합니다:

1. **단위 테스트**: 개별 함수 및 모듈 검증
2. **통합 테스트**: 여러 모듈 간 상호 작용 검증
3. **성능 테스트**: 시간 및 메모리 사용량 확인

```typescript
// 단위 테스트 예시
describe("getValueAtPath", () => {
  test("empty path returns the object itself", () => {
    const obj = { a: 1 };
    expect(getValueAtPath(obj, [])).toBe(obj);
  });

  test("gets value at simple path", () => {
    const obj = { a: 1, b: 2 };
    expect(getValueAtPath(obj, ["a"])).toBe(1);
    expect(getValueAtPath(obj, ["b"])).toBe(2);
  });

  test("gets value at nested path", () => {
    const obj = { a: { b: { c: 3 } } };
    expect(getValueAtPath(obj, ["a", "b", "c"])).toBe(3);
  });

  test("returns undefined for non-existent path", () => {
    const obj = { a: 1 };
    expect(getValueAtPath(obj, ["b"])).toBeUndefined();
    expect(getValueAtPath(obj, ["a", "b"])).toBeUndefined();
  });

  test("handles arrays", () => {
    const obj = { a: [1, 2, 3] };
    expect(getValueAtPath(obj, ["a", 1])).toBe(2);
  });

  test("handles null and undefined", () => {
    const obj = { a: null, b: undefined };
    expect(getValueAtPath(obj, ["a", "prop"])).toBeUndefined();
    expect(getValueAtPath(obj, ["b", "prop"])).toBeUndefined();
  });
});
```

### 8.4 문서화 표준

코드 문서화에는 다음이 포함되어야 합니다:

1. 함수 또는 클래스의 목적
2. 매개변수 및 반환 값 설명
3. 예외 및 에지 케이스
4. 사용 예시
5. 관련 함수 또는 모듈에 대한 참조

```typescript
/**
 * 여러 상태 변경을 단일 트랜잭션으로 실행합니다.
 *
 * 트랜잭션 내의 모든 변경 사항은 트랜잭션이 완료된 후에만
 * 구독자에게 단일 업데이트로 알림됩니다. 트랜잭션은 중첩될 수 있으며,
 * 최상위 트랜잭션이 완료될 때만 알림이 전송됩니다.
 *
 * @typeParam T - 콜백 반환 값의 타입
 * @param callback - 트랜잭션 내에서 실행할 함수
 * @returns 콜백의 반환 값
 *
 * @example
 * axion.tx(() => {
 *   user.at('name').set('Jane');
 *   user.at('email').set('jane@example.com');
 * });
 *
 * @see {@link isBatching} 현재 트랜잭션 상태 확인
 * @see {@link executeBatch} 내부 배치 처리 구현
 */
export function transaction<T>(callback: () => T): T {
  return executeBatch(callback);
}
```

### 8.5 풀 리퀘스트 프로세스

1. **이슈 생성**: 작업을 시작하기 전에 이슈 생성
2. **브랜치 생성**: 기능 또는 버그 수정을 위한 브랜치 생성
3. **코드 작성**: 코딩 표준을 준수하며 코드 작성
4. **테스트**: 새 코드에 대한 테스트 작성
5. **풀 리퀘스트**: 변경 사항 설명 및 검토 요청
6. **코드 리뷰**: 피드백 수렴 및 필요시 수정
7. **병합**: 승인 후 코드 병합

## 9. 성능 최적화

### 9.1 메모리 사용 최적화

#### 9.1.1 구조적 공유

Axion는 불변성을 유지하면서 메모리 사용을 최적화하기 위해 구조적 공유를 사용합니다.

```
// 변경 전 상태
{
  a: {
    b: { value: 1 },
    c: { value: 2 }
  }
}

// a.b.value를 3으로 변경 후
// (회색 노드는 원래 객체와 공유)
{
  a: {
    b: { value: 3 },  // 새 객체
    c: { value: 2 }   // 원래 객체와 공유
  }
}
```

**구현**:

```typescript
function setValueAtPath<T extends object>(
  obj: T,
  path: Path,
  value: unknown
): T {
  if (path.length === 0) {
    return structuralClone(value as T);
  }

  const result = structuralClone(obj);
  let current: any = result;

  // 마지막 세그먼트 전까지 경로 탐색
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];

    if (current[segment] === undefined) {
      current[segment] = typeof path[i + 1] === "number" ? [] : {};
    } else {
      // 구조적 공유를 위해 복제
      current[segment] = structuralClone(current[segment]);
    }

    current = current[segment];
  }

  // 마지막 세그먼트에 값 설정
  const lastSegment = path[path.length - 1];
  current[lastSegment] = structuralClone(value);

  return result;
}
```

#### 9.1.2 메모리 누수 방지

구독 및 의존성 관리에서 메모리 누수를 방지하기 위한 전략입니다.

**약한 참조 사용**:

```typescript
// 약한 맵을 사용하여 가비지 컬렉션 허용
const derivedStates = new WeakMap<object, Set<Atom<any>>>();

// 아톰이 사용되지 않으면 관련 파생 상태도 정리될 수 있음
```

**명시적 구독 해제**:

```typescript
// 모든 구독은 해제 함수 반환
const unsubscribe = counter.subscribe(() => {
  console.log("State changed");
});

// 구독 해제
unsubscribe();
```

### 9.2 계산 최적화

#### 9.2.1 최소 재계산

Axion는 정밀한 의존성 추적을 통해 필요한 계산만 수행합니다.

**예시**:

```typescript
// 사용자 상태
const user = axion({
  name: "John",
  profile: {
    age: 30,
    email: "john@example.com",
  },
});

// 파생 상태 1 - 이름에만 의존
const greeting = axion.derive(() => `Hello, ${user.get().name}!`);

// 파생 상태 2 - 나이에만 의존
const isAdult = axion.derive(() => user.get().profile.age >= 18);

// 이름만 변경 - greeting만 재계산됨
user.at("name").set("Jane");

// 나이만 변경 - isAdult만 재계산됨
user.at("profile").at("age").set(25);
```

#### 9.2.2 경로 기반 세분화

경로 기반 접근으로 더 정밀한 의존성 추적이 가능합니다.

```typescript
// 경로 기반 접근 - 더 정밀한 의존성 추적
const userName = axion.derive(() => user.at("name").get());
const userAge = axion.derive(() => user.at("profile").at("age").get());

// 프로필 이메일만 변경 - 어떤 파생 상태도 재계산하지 않음
user.at("profile").at("email").set("jane@example.com");
```

### 9.3 렌더링 최적화

#### 9.3.1 세분화된 구독

렌더링 최적화를 위한 세분화된 구독 전략입니다.

**React 예시**:

```tsx
// 상태 세분화
const userState = axion({
  name: "John",
  profile: { age: 30 },
});

// UserNameDisplay - name 변경에만 반응
function UserNameDisplay() {
  const name = useAxion(userState.at("name"));
  return <h2>{name}</h2>;
}

// UserAgeDisplay - age 변경에만 반응
function UserAgeDisplay() {
  const age = useAxion(userState.at("profile").at("age"));
  return <p>Age: {age}</p>;
}

// 이름 변경 시 UserNameDisplay만 리렌더링됨
// 나이 변경 시 UserAgeDisplay만 리렌더링됨
```

#### 9.3.2 비동기 업데이트 배치

렌더링을 배치로 처리하여 성능을 향상시킵니다.

**미크로태스크 기반 배치**:

```typescript
// 배치 처리 시스템 (내부 구현)
function scheduleBatchedEffect(effect: () => void): void {
  pendingEffects.add(effect);

  if (!isBatching()) {
    // 마이크로태스크로 예약 (다음 이벤트 루프에서 실행)
    queueMicrotask(runPendingEffects);
  }
}
```

### 9.4 네트워크 요청 최적화

#### 9.4.1 디바운싱과 스로틀링

```typescript
import { axion } from "axion-state";

// 디바운싱 헬퍼
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// 사용 예시
const searchState = axion({ query: "" });

// 디바운스된 검색 효과
axion.effect(() => {
  const query = searchState.get().query;

  // 디바운스된 API 호출
  const performSearch = debounce((q: string) => {
    if (q.length > 2) {
      api.search(q).then((results) => {
        // 결과 처리
      });
    }
  }, 300);

  performSearch(query);
});
```

#### 9.4.2 요청 캐싱 및 중복 제거

```typescript
// 요청 캐싱 헬퍼
const requestCache = new Map<string, Promise<any>>();

async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheDuration = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;

  // 진행 중인 요청 확인
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as Promise<T>;
  }

  // 새 요청 시작
  const promise = fetch(url, options)
    .then((res) => res.json())
    .finally(() => {
      // 캐시 만료 설정
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, cacheDuration);
    });

  // 캐시에 저장
  requestCache.set(cacheKey, promise);

  return promise as Promise<T>;
}
```

## 10. 예제 및 패턴

### 10.1 기본 패턴

#### 10.1.1 투두 리스트

```typescript
// 상태 정의
const todosState = axion({
  items: [] as Array<{ id: string; text: string; completed: boolean }>,
  filter: "all" as "all" | "active" | "completed",
});

// 파생 상태
const filteredTodos = axion.derive(() => {
  const { items, filter } = todosState.get();

  switch (filter) {
    case "active":
      return items.filter((item) => !item.completed);
    case "completed":
      return items.filter((item) => item.completed);
    default:
      return items;
  }
});

// 액션
const actions = {
  addTodo(text: string) {
    todosState.update((state) => ({
      ...state,
      items: [
        ...state.items,
        { id: Date.now().toString(), text, completed: false },
      ],
    }));
  },

  toggleTodo(id: string) {
    todosState.update((state) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  },

  setFilter(filter: "all" | "active" | "completed") {
    todosState.at("filter").set(filter);
  },
};

// React 컴포넌트
function TodoList() {
  const todos = useAxion(filteredTodos);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => actions.toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}
```

#### 10.1.2 사용자 프로필

```typescript
// 상태 정의
const userProfile = axion({
  loading: false,
  error: null as string | null,
  data: null as {
    id: string;
    name: string;
    email: string;
    avatar: string;
  } | null,
});

// 파생 상태
const isLoggedIn = axion.derive(() => !!userProfile.get().data);

// 액션
const userActions = {
  async fetchProfile(userId: string) {
    // 로딩 시작
    userProfile.update((state) => ({ ...state, loading: true, error: null }));

    try {
      // API 호출
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();

      // 성공 시 데이터 업데이트
      userProfile.update((state) => ({
        ...state,
        loading: false,
        data,
      }));
    } catch (err) {
      // 오류 처리
      userProfile.update((state) => ({
        ...state,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  },

  logout() {
    userProfile.update((state) => ({
      ...state,
      data: null,
    }));
  },
};

// 효과 - 로그인 상태 변화에 반응
const cleanup = axion.effect(() => {
  const loggedIn = isLoggedIn.get();

  if (loggedIn) {
    console.log("User logged in");
  } else {
    console.log("User logged out");
  }
});
```

### 10.2 고급 패턴

#### 10.2.1 유한 상태 기계

```typescript
// 상태 머신 정의
type State = "idle" | "loading" | "success" | "error";
type Event = "FETCH" | "RESOLVE" | "REJECT" | "RESET";

interface MachineState<T> {
  state: State;
  data: T | null;
  error: Error | null;
}

// 상태 머신 생성 함수
function createStateMachine<T>(initialData: T | null = null) {
  // 초기 상태
  const state = axion<MachineState<T>>({
    state: "idle",
    data: initialData,
    error: null,
  });

  // 상태 전이 구현
  function transition(event: Event, payload?: any) {
    axion.tx(() => {
      switch (event) {
        case "FETCH":
          if (state.get().state !== "loading") {
            state.at("state").set("loading");
          }
          break;

        case "RESOLVE":
          if (state.get().state === "loading") {
            state.at("state").set("success");
            state.at("data").set(payload);
            state.at("error").set(null);
          }
          break;

        case "REJECT":
          if (state.get().state === "loading") {
            state.at("state").set("error");
            state.at("error").set(payload);
          }
          break;

        case "RESET":
          state.at("state").set("idle");
          state.at("data").set(initialData);
          state.at("error").set(null);
          break;
      }
    });
  }

  // 비동기 액션 생성
  function createAsyncAction<R>(promiseFn: () => Promise<R>): () => Promise<R> {
    return async () => {
      transition("FETCH");

      try {
        const result = await promiseFn();
        transition("RESOLVE", result);
        return result;
      } catch (error) {
        transition("REJECT", error);
        throw error;
      }
    };
  }

  return {
    state,
    transition,
    createAsyncAction,
    reset: () => transition("RESET"),
  };
}

// 사용 예
const userMachine = createStateMachine(null);

const fetchUser = userMachine.createAsyncAction(async () => {
  const response = await fetch("/api/user");
  return response.json();
});

// 상태에 반응
axion.effect(() => {
  const { state: currentState, data, error } = userMachine.state.get();

  switch (currentState) {
    case "loading":
      showLoadingSpinner();
      break;
    case "success":
      hideLoadingSpinner();
      displayUser(data);
      break;
    case "error":
      hideLoadingSpinner();
      showError(error);
      break;
  }
});

// 사용자 불러오기
fetchUser().catch(console.error);
```

#### 10.2.2 폼 상태 관리

```typescript
// 폼 상태 및 유효성 검사
function createForm<T extends Record<string, any>>(initialValues: T) {
  // 폼 상태
  const formState = axion({
    values: initialValues,
    touched: {} as Record<keyof T, boolean>,
    errors: {} as Record<keyof T, string | null>,
    isSubmitting: false,
    isValid: true
  });

  // 필드별 유효성 검사 규칙
  const validators = new Map
    keyof T,
    (value: any, allValues: T) => string | null
  >();

  // 유효성 검사 함수 등록
  function setValidator<K extends keyof T>(
    field: K,
    validator: (value: T[K], allValues: T) => string | null
  ) {
    validators.set(field, validator);

    // 현재 값에 대해 유효성 검사 실행
    const currentValue = formState.get().values[field];
    const error = validator(currentValue, formState.get().values);

    formState.update(state => ({
      ...state,
      errors: {
        ...state.errors,
        [field]: error
      },
      isValid: !error && Object.values(state.errors).every(e => !e)
    }));
  }

  // 값 변경 핸들러
  function handleChange<K extends keyof T>(field: K, value: T[K]) {
    formState.update(state => {
      // 새 값
      const newValues = {
        ...state.values,
        [field]: value
      };

      // 유효성 검사
      const validator = validators.get(field);
      const error = validator ? validator(value, newValues) : null;

      // 필드 터치 표시
      const touched = {
        ...state.touched,
        [field]: true
      };

      // 오류 업데이트
      const errors = {
        ...state.errors,
        [field]: error
      };

      // 전체 유효성 확인
      const isValid = Object.values(errors).every(e => !e);

      return {
        ...state,
        values: newValues,
        touched,
        errors,
        isValid
      };
    });
  }

  // 제출 핸들러
  async function handleSubmit(
    onSubmit: (values: T) => Promise<void> | void
  ) {
    // 모든 필드가 터치되었다고 표시
    const allTouched = Object.keys(formState.get().values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>
    );

    formState.update(state => ({
      ...state,
      touched: allTouched,
      isSubmitting: true
    }));

    // 유효성 검사
    if (!formState.get().isValid) {
      formState.at('isSubmitting').set(false);
      return;
    }

    try {
      await onSubmit(formState.get().values);

      formState.at('isSubmitting').set(false);
    } catch (error) {
      formState.update(state => ({
        ...state,
        isSubmitting: false
      }));

      throw error;
    }
  }

  // 폼 초기화
  function resetForm() {
    formState.set({
      values: initialValues,
      touched: {} as Record<keyof T, boolean>,
      errors: {} as Record<keyof T, string | null>,
      isSubmitting: false,
      isValid: true
    });
  }

  return {
    formState,
    setValidator,
    handleChange,
    handleSubmit,
    resetForm
  };
}

// 사용 예시
const loginForm = createForm({
  email: '',
  password: ''
});

// 유효성 검사 규칙 설정
loginForm.setValidator('email', email => {
  if (!email) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(email)) return 'Invalid email format';
  return null;
});

loginForm.setValidator('password', password => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
});

// React 컴포넌트
function LoginForm() {
  const { values, errors, touched, isSubmitting } = useAxion(loginForm.formState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    loginForm.handleSubmit(async values => {
      await api.login(values.email, values.password);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          value={values.email}
          onChange={e => loginForm.handleChange('email', e.target.value)}
        />
        {touched.email && errors.email && (
          <div className="error">{errors.email}</div>
        )}
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          value={values.password}
          onChange={e => loginForm.handleChange('password', e.target.value)}
        />
        {touched.password && errors.password && (
          <div className="error">{errors.password}</div>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

### 10.3 안티패턴

#### 10.3.1 순환 의존성

**잘못된 패턴**:

```typescript
// 상호 의존적인 파생 상태
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);

// 생성 시점에 순환 의존성 생성
// a → b → a
const c = axion.derive(() => {
  const valueB = b.get();
  a.set({ value: valueB + 1 }); // 여기서 a에 의존하는 순환 생성
  return valueB;
});
```

**올바른 패턴**:

```typescript
// 단방향 의존성 유지
const a = axion({ value: 1 });
const b = axion.derive(() => a.get().value * 2);
const c = axion.derive(() => b.get() + 1);

// 액션으로 분리
function updateAFromB() {
  const valueB = b.get();
  a.set({ value: valueB + 1 });
}
```

#### 10.3.2 과도한 세분화

**잘못된 패턴**:

```typescript
// 지나치게 세분화된 상태
const firstName = axion({ value: "John" });
const lastName = axion({ value: "Doe" });
const age = axion({ value: 30 });
const email = axion({ value: "john@example.com" });

// 이런 상태들은 함께 변경되는 경우가 많음
```

**올바른 패턴**:

```typescript
// 응집력 있는 상태 그룹화
const user = axion({
  firstName: "John",
  lastName: "Doe",
  age: 30,
  email: "john@example.com",
});

// 필요한 경우 렌즈로 분리 접근
const firstName = user.at("firstName");
```

#### 10.3.3 상태 변경 내 비동기 작업

**잘못된 패턴**:

```typescript
// 상태 업데이트 내부에서 직접 비동기 작업
function fetchAndUpdateUser() {
  users.update(async (state) => {
    // 상태 업데이트 내에서 비동기 작업 수행 - 잘못된 방식!
    const response = await fetch("/api/user");
    const data = await response.json();
    return { ...state, user: data };
  });
}
```

**올바른 패턴**:

```typescript
// 비동기 작업 분리
async function fetchAndUpdateUser() {
  try {
    users.at("loading").set(true);

    const response = await fetch("/api/user");
    const data = await response.json();

    users.update((state) => ({
      ...state,
      loading: false,
      user: data,
      error: null,
    }));
  } catch (error) {
    users.update((state) => ({
      ...state,
      loading: false,
      error: String(error),
    }));
  }
}
```

#### 10.3.4 파생 상태에서의 부작용

**잘못된 패턴**:

```typescript
// 파생 상태 내에서 부작용 발생
const notifications = axion.derive(() => {
  const count = unreadMessages.get().length;

  if (count > 0) {
    // 파생 계산 내에서 부작용 - 잘못된 방식!
    document.title = `(${count}) New Messages`;
    playNotificationSound();
  }

  return count;
});
```

**올바른 패턴**:

```typescript
// 파생 상태는 순수하게 유지
const unreadCount = axion.derive(() => unreadMessages.get().length);

// 부작용은 효과로 분리
axion.effect(() => {
  const count = unreadCount.get();

  if (count > 0) {
    document.title = `(${count}) New Messages`;
    playNotificationSound();
  } else {
    document.title = "Messages";
  }
});
```
