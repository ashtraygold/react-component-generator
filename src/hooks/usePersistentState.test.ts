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
});
