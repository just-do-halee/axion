/**
 * 고성능 해싱 알고리즘
 * 머클 트리에서 효율적인 상태 비교를 위한 해시 함수
 */

// FNV-1a 파라미터
const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;

/**
 * 문자열의 FNV-1a 해시 계산
 * O(n) 시간 복잡도, n은 문자열 길이
 */
export function hashString(str: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0; // 부호 없는 32비트 정수로 변환
}

/**
 * Hash any object using a more direct approach
 * This is a simpler function that's useful for tests
 */
export function hashObject(obj: unknown): string {
  // Create a visited set to handle circular references
  const visited = new Set<unknown>();
  
  function hashValue(value: unknown): string {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (visited.has(value)) {
        return '[Circular]';
      }
      visited.add(value);
    }
    
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const type = typeof value;
    
    switch (type) {
      case 'number':
      case 'boolean':
      case 'symbol':
        return String(value);
      case 'string':
        return `"${value}"`;
      case 'object':
        if (Array.isArray(value)) {
          return `[${value.map(hashValue).join(',')}]`;
        }
        
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        if (value instanceof RegExp) {
          return value.toString();
        }
        
        if (value instanceof Map) {
          const entries: string[] = [];
          value.forEach((v, k) => {
            entries.push(`${hashValue(k)}=>${hashValue(v)}`);
          });
          return `Map{${entries.join(',')}}`;
        }
        
        if (value instanceof Set) {
          return `Set{${Array.from(value).map(hashValue).join(',')}}`;
        }
        
        // Regular object
        const keys = Object.keys(value).sort();
        const objHash = keys
          .map(key => `${key}:${hashValue((value as Record<string, unknown>)[key])}`)
          .join(',');
        
        return `{${objHash}}`;
      default:
        return `${type}:${String(value)}`;
    }
  }
  
  return hashValue(obj);
}

/**
 * 값의 해시 계산
 * 객체는 재귀적으로 처리되며 키 순서에 독립적
 */
export function computeHash(
  value: unknown, 
  visited: WeakMap<object, string> = new WeakMap()
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const type = typeof value;

  // Handle primitive types first
  switch (type) {
    case "number":
    case "boolean":
    case "symbol":
      return `${type}:${String(value)}`;
    case "string":
      return `string:${hashString(value as string)}`;
    case "function":
      return "function";
    case "object":
      // Handle circular references
      if (value !== null && typeof value === "object") {
        // Return cached hash if this object was already visited
        if (visited.has(value)) {
          return visited.get(value) || "[Circular]";
        }
        
        // Create a temporary hash for circular reference detection
        visited.set(value, "[Processing]");
        
        try {
          let result: string;
          
          if (Array.isArray(value)) {
            // Use a safer implementation that handles circular references
            const arrayHash = value.map(item => computeHash(item, visited)).join(",");
            result = `array:[${arrayHash}]`;
          } else if (value instanceof Date) {
            result = `date:${value.getTime()}`;
          } else if (value instanceof RegExp) {
            result = `regexp:${value.toString()}`;
          } else if (value instanceof Map || value instanceof Set) {
            // Not hashing maps and sets in detail to prevent potential issues
            result = value instanceof Map ? "map" : "set";
          } else {
            // Regular object - safely get keys and hash them
            const keys = Object.keys(value).sort();
            // Limit to maximum of 100 keys to prevent stack overflow
            const limitedKeys = keys.slice(0, 100);
            
            // Safely compute hash for each key-value pair
            const pairs = [];
            for (const key of limitedKeys) {
              try {
                const keyHash = computeHash(key, visited);
                const valueHash = computeHash((value as Record<string, unknown>)[key], visited);
                pairs.push(`${keyHash}:${valueHash}`);
              } catch (e) {
                pairs.push(`${key}:[Error]`);
              }
            }
            
            // Add indication if keys were limited
            const suffix = keys.length > 100 ? "...<truncated>" : "";
            result = `object:{${pairs.join(",")}${suffix}}`;
          }
          
          // Update the visited map with the actual hash
          visited.set(value, result);
          return result;
        } catch (e) {
          // Fallback to a simple representation in case of errors
          return `object:[Error:${String(e).substring(0, 50)}]`;
        }
      }
      
      // Fallback for null or other unhandled object types
      return "object";
    default:
      return `${type}:${String(value)}`;
  }
}

/**
 * 경로 해싱
 * 경로를 문자열로 변환하고 해시
 */
export function hashPath(path: Array<string | number | symbol>): string {
  const pathStr = path
    .map((segment) =>
      typeof segment === "symbol" ? segment.toString() : String(segment)
    )
    .join(".");

  return `path:${hashString(pathStr)}`;
}
