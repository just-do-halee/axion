/**
 * Deep clone implementation with circular reference handling
 */
export function deepClone<T>(obj: T, visited = new WeakMap<object, any>()): T {
  // Handle primitive types and null/undefined
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }
  
  // Handle circular references
  if (visited.has(obj as object)) {
    return visited.get(obj as object);
  }
  
  // Handle special object types
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }
  
  if (obj instanceof Map) {
    const mapClone = new Map();
    visited.set(obj as object, mapClone);
    
    obj.forEach((value, key) => {
      mapClone.set(
        typeof key === "object" && key !== null ? deepClone(key, visited) : key,
        deepClone(value, visited)
      );
    });
    
    return mapClone as unknown as T;
  }
  
  if (obj instanceof Set) {
    const setClone = new Set();
    visited.set(obj as object, setClone);
    
    obj.forEach(value => {
      setClone.add(deepClone(value, visited));
    });
    
    return setClone as unknown as T;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    const copy = [] as unknown as T;
    visited.set(obj as object, copy);
    
    (obj as unknown as Array<any>).forEach((item, index) => {
      (copy as unknown as Array<any>)[index] = deepClone(item, visited);
    });
    
    return copy;
  }
  
  // Handle plain objects
  const copy = Object.create(Object.getPrototypeOf(obj));
  visited.set(obj as object, copy);
  
  Object.keys(obj as object).forEach(key => {
    copy[key] = deepClone((obj as any)[key], visited);
  });
  
  return copy;
}

/**
 * 구조적 공유를 활용한 깊은 복제
 * 변경된 경로만 새 객체로 생성하여 메모리 사용 최적화
 */
export function structuralClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  // 원시 타입은 그대로 반환
  if (typeof value !== "object") {
    return value;
  }

  // 배열 처리 - 얕은 복사를 수행
  if (Array.isArray(value)) {
    // Deep clone array elements for better immutability
    return value.map(item => 
      item !== null && typeof item === 'object' 
        ? structuralClone(item) 
        : item
    ) as unknown as T;
  }

  // 객체 처리 (Date, Map, Set 등 특수 객체는 별도 처리)
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof Map) {
    return new Map(value) as unknown as T;
  }

  if (value instanceof Set) {
    return new Set(value) as unknown as T;
  }

  // 일반 객체 - 객체의 각 속성에 대해 재귀적으로 클론
  const cloned = { ...value } as Record<string, unknown>;
  
  // Iterate through all properties
  Object.keys(cloned).forEach(key => {
    const prop = cloned[key];
    // Recursively clone object properties
    if (prop !== null && typeof prop === 'object') {
      cloned[key] = structuralClone(prop);
    }
  });
  
  return cloned as unknown as T;
}

/**
 * 깊은 동결 - 상태 불변성 강제
 */
export function deepFreeze<T>(obj: T): T {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj !== "object" ||
    Object.isFrozen(obj)
  ) {
    return obj;
  }

  // 객체 동결
  Object.freeze(obj);

  // 속성 재귀적 동결
  const propNames = Object.getOwnPropertyNames(obj);

  for (const name of propNames) {
    const value = (obj as any)[name];

    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }

  return obj;
}

/**
 * 경로 값 설정 - 구조적 공유 활용
 * This function creates a new object with the value at the specified path updated.
 * @param obj The source object to update
 * @param path The path to the value to update
 * @param value The new value to set
 * @returns A new object with the updated value
 */
export function setValueAtPath<T extends object>(
  obj: T,
  path: Array<string | number | symbol>,
  value: unknown
): T {
  // Handle empty path case - replace the entire object
  if (path.length === 0) {
    return structuralClone(value as T);
  }

  // Clone the root object to avoid mutating the original
  const result = structuralClone(obj);
  let current: any = result;

  // Navigate to the parent of the target path
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    const nextSegment = path[i + 1];
    
    // If the next segment doesn't exist, create appropriate container
    if (current[segment] === undefined) {
      // Create an array if the next segment is a number, otherwise an object
      const isNextNumeric = typeof nextSegment === 'string' && /^\d+$/.test(nextSegment as string);
      current[segment] = isNextNumeric || typeof nextSegment === 'number' ? [] : {};
    } else {
      // Clone the next level to maintain immutability
      current[segment] = structuralClone(current[segment]);
    }
    
    // Move to the next level
    current = current[segment];
  }

  // Get the last segment of the path
  const lastSegment = path[path.length - 1];
  
  // Handle array push case - if the last segment is an array length
  if (Array.isArray(current) && 
      typeof lastSegment === 'string' && 
      /^\d+$/.test(lastSegment) && 
      parseInt(lastSegment, 10) === current.length) {
    // Add the new value to the array
    current.push(structuralClone(value));
  } else {
    // Set the value at the last segment
    current[lastSegment] = structuralClone(value);
  }

  return result;
}

/**
 * 경로 값 가져오기
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
