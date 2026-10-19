import { describe, it, expect } from 'vitest';
import { addToHistory, parseHistory, MAX_HISTORY } from './history';

describe('addToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addToHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addToHistory(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it(`최대 ${MAX_HISTORY}개까지만 유지하고 오래된 것부터 버린다`, () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => `p${i}`);
    const result = addToHistory(full, 'new');
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0]).toBe('new');
    expect(result).not.toContain(`p${MAX_HISTORY - 1}`);
  });
});

describe('parseHistory', () => {
  it('문자열 항목만 남기고 최대 개수로 자른다', () => {
    expect(parseHistory(['a', 1, null, 'b'])).toEqual(['a', 'b']);
    expect(parseHistory(Array.from({ length: MAX_HISTORY + 5 }, (_, i) => `p${i}`))).toHaveLength(MAX_HISTORY);
  });

  it('배열이 아니면 예외를 던진다', () => {
    expect(() => parseHistory('a')).toThrow();
  });
});
