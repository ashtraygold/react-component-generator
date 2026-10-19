import { describe, it, expect } from 'vitest';
import { parseComponents } from './components';

const valid = { id: '1', prompt: 'p', code: 'c', createdAt: '2024-05-01T10:30:00.000Z' };

describe('parseComponents', () => {
  it('createdAt 문자열을 Date로 복원한다', () => {
    const [component] = parseComponents([valid]);
    expect(component.createdAt).toBeInstanceOf(Date);
    expect(component.createdAt.toISOString()).toBe(valid.createdAt);
  });

  it('배열이 아니면 예외를 던진다', () => {
    expect(() => parseComponents({})).toThrow();
  });

  it('필드가 빠졌거나 잘못된 항목은 걸러낸다', () => {
    const result = parseComponents([valid, { id: '2' }, null, { ...valid, id: '3', createdAt: 'nope' }]);
    expect(result.map((c) => c.id)).toEqual(['1']);
  });
});
