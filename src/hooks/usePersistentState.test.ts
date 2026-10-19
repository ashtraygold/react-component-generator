import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('저장된 값이 없으면 fallback으로 시작한다', () => {
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('저장된 값이 있으면 그 값으로 시작한다', () => {
    localStorage.setItem('k', JSON.stringify('saved'));
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    expect(result.current[0]).toBe('saved');
  });

  it('값을 바꾸면 localStorage에 저장한다', () => {
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    act(() => result.current[1]('changed'));
    expect(JSON.parse(localStorage.getItem('k')!)).toBe('changed');
  });

  it('새로 마운트하면 이전에 저장한 값을 복원한다', () => {
    const first = renderHook(() => usePersistentState('k', 'default'));
    act(() => first.result.current[1]('changed'));
    first.unmount();

    const second = renderHook(() => usePersistentState('k', 'default'));
    expect(second.result.current[0]).toBe('changed');
  });

  it('session을 지정하면 sessionStorage에 저장하고 복원한다', () => {
    const first = renderHook(() => usePersistentState('k', 'default', undefined, 'session'));
    act(() => first.result.current[1]('changed'));
    expect(localStorage.getItem('k')).toBeNull();
    first.unmount();

    const second = renderHook(() => usePersistentState('k', 'default', undefined, 'session'));
    expect(second.result.current[0]).toBe('changed');
  });

  describe('다른 탭과 동기화', () => {
    const fireStorageEvent = (key: string, newValue: string | null, storageArea: Storage) =>
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea }));

    it('다른 탭에서 같은 키가 바뀌면 상태를 갱신한다', () => {
      const { result } = renderHook(() => usePersistentState('k', 'default'));
      localStorage.setItem('k', JSON.stringify('from-other-tab'));
      act(() => fireStorageEvent('k', JSON.stringify('from-other-tab'), localStorage));
      expect(result.current[0]).toBe('from-other-tab');
    });

    it('다른 키의 변경은 무시한다', () => {
      const { result } = renderHook(() => usePersistentState('k', 'default'));
      localStorage.setItem('other', JSON.stringify('x'));
      act(() => fireStorageEvent('other', JSON.stringify('x'), localStorage));
      expect(result.current[0]).toBe('default');
    });
  });
});
