import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStored, saveStored } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 값이 없으면 fallback을 반환한다', () => {
    expect(loadStored('k', 'default')).toBe('default');
  });

  it('저장한 값을 JSON으로 복원한다', () => {
    saveStored('k', { a: [1, 2] });
    expect(loadStored('k', null)).toEqual({ a: [1, 2] });
  });

  it('JSON이 깨져 있으면 fallback을 반환한다', () => {
    localStorage.setItem('k', '{broken');
    expect(loadStored('k', 'default')).toBe('default');
  });

  it('parse가 있으면 복원한 값을 parse 결과로 바꾼다', () => {
    saveStored('k', '2024-01-01T00:00:00.000Z');
    const result = loadStored<Date | null>('k', null, (raw) => new Date(raw as string));
    expect(result).toBeInstanceOf(Date);
  });

  it('parse가 예외를 던지면 fallback을 반환한다', () => {
    saveStored('k', 1);
    const parse = () => {
      throw new Error('invalid');
    };
    expect(loadStored('k', 'default', parse)).toBe('default');
  });

  it('localStorage 읽기가 실패해도 fallback을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadStored('k', 'default')).toBe('default');
  });

  it('localStorage 쓰기가 실패해도 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveStored('k', 1)).not.toThrow();
  });
});
