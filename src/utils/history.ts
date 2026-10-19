export const MAX_HISTORY = 20;

/** 프롬프트를 맨 앞에 추가한다. 중복은 제거하고 최대 MAX_HISTORY개만 유지한다. */
export function addToHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, MAX_HISTORY);
}

/** localStorage에서 복원한 값을 프롬프트 히스토리로 변환한다. */
export function parseHistory(raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new Error('history must be an array');
  return raw.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY);
}
