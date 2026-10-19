import type { Provider } from '../types';

export const EMPTY_API_KEYS: Record<Provider, string> = { anthropic: '', google: '' };

const PROVIDERS = Object.keys(EMPTY_API_KEYS) as Provider[];

/** localStorage에서 복원한 값을 프로바이더별 API 키로 변환한다. 문자열이 아닌 값은 빈 문자열로 채운다. */
export function parseApiKeys(raw: unknown): Record<Provider, string> {
  if (typeof raw !== 'object' || raw === null) throw new Error('api keys must be an object');
  const source = raw as Record<string, unknown>;
  return {
    anthropic: typeof source.anthropic === 'string' ? source.anthropic : '',
    google: typeof source.google === 'string' ? source.google : '',
  };
}

export function parseProvider(raw: unknown): Provider {
  if (PROVIDERS.includes(raw as Provider)) return raw as Provider;
  throw new Error('unknown provider');
}
