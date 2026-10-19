import type { GeneratedComponent } from '../types';

/** localStorage에서 복원한 값을 GeneratedComponent[]로 변환한다. 형식이 맞지 않는 항목은 버린다. */
export function parseComponents(raw: unknown): GeneratedComponent[] {
  if (!Array.isArray(raw)) throw new Error('components must be an array');

  return raw.flatMap((item): GeneratedComponent[] => {
    if (typeof item !== 'object' || item === null) return [];
    const { id, prompt, code, createdAt } = item as Record<string, unknown>;
    if (typeof id !== 'string' || typeof prompt !== 'string' || typeof code !== 'string') return [];
    if (typeof createdAt !== 'string') return [];

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return [];
    return [{ id, prompt, code, createdAt: date }];
  });
}

export const MAX_COMPONENTS = 30;

/** 새 컴포넌트를 맨 앞에 추가한다. 저장소 용량을 넘기지 않도록 최대 MAX_COMPONENTS개만 유지한다. */
export function addComponent(list: GeneratedComponent[], component: GeneratedComponent): GeneratedComponent[] {
  return [component, ...list].slice(0, MAX_COMPONENTS);
}
