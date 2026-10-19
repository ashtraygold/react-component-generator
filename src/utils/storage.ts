/** localStorage에서 값을 읽는다. 값이 없거나 깨져 있거나 접근이 막혀 있으면 fallback을 반환한다. */
export function loadStored<T>(key: string, fallback: T, parse?: (raw: unknown) => T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const raw: unknown = JSON.parse(stored);
    return parse ? parse(raw) : (raw as T);
  } catch {
    return fallback;
  }
}

/** localStorage에 JSON으로 저장한다. 사생활 보호 모드·용량 초과 등으로 실패해도 앱은 계속 동작한다. */
export function saveStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시한다. 상태는 메모리에서 계속 유지된다.
  }
}
