import { describe, it, expect } from 'vitest';
import { parseComponents, addComponent, MAX_COMPONENTS } from './components';

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

describe('addComponent', () => {
  const make = (id: string) => ({ id, prompt: 'p', code: 'c', createdAt: new Date() });

  it('새 컴포넌트를 맨 앞에 추가한다', () => {
    expect(addComponent([make('a')], make('b')).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it(`최대 ${MAX_COMPONENTS}개까지만 유지하고 오래된 것부터 버린다`, () => {
    const full = Array.from({ length: MAX_COMPONENTS }, (_, i) => make(`c${i}`));
    const result = addComponent(full, make('new'));
    expect(result).toHaveLength(MAX_COMPONENTS);
    expect(result[0].id).toBe('new');
    expect(result.map((c) => c.id)).not.toContain(`c${MAX_COMPONENTS - 1}`);
  });
});
