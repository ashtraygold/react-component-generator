import { describe, it, expect } from 'vitest';
import { parseApiKeys, parseProvider } from './apiKeys';

describe('parseApiKeys', () => {
  it('프로바이더별 키를 복원한다', () => {
    expect(parseApiKeys({ anthropic: 'sk-ant-1', google: 'AIza1' })).toEqual({
      anthropic: 'sk-ant-1',
      google: 'AIza1',
    });
  });

  it('없거나 문자열이 아닌 값은 빈 문자열로 채운다', () => {
    expect(parseApiKeys({ anthropic: 1 })).toEqual({ anthropic: '', google: '' });
  });

  it('객체가 아니면 예외를 던진다', () => {
    expect(() => parseApiKeys('x')).toThrow();
    expect(() => parseApiKeys(null)).toThrow();
  });
});

describe('parseProvider', () => {
  it('유효한 프로바이더를 그대로 반환한다', () => {
    expect(parseProvider('anthropic')).toBe('anthropic');
  });

  it('알 수 없는 값이면 예외를 던진다', () => {
    expect(() => parseProvider('openai')).toThrow();
  });
});
