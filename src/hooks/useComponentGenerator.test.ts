import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

const STORAGE_KEY = 'rcg:components';
const saved = [
  { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: '2024-05-01T10:30:00.000Z' },
  { id: '2', prompt: '표', code: 'render(<table />)', createdAt: '2024-05-01T11:00:00.000Z' },
];

describe('useComponentGenerator 저장', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 컴포넌트 목록을 복원한다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components.map((c) => c.id)).toEqual(['1', '2']);
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('생성에 성공하면 목록을 localStorage에 저장한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'render(<b />)' }) }),
    );
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('새 컴포넌트', undefined, 'google'));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].prompt).toBe('새 컴포넌트');
    });
  });

  it('삭제하면 저장된 목록에서도 사라진다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useComponentGenerator());
    act(() => result.current.removeComponent('1'));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).map((c: { id: string }) => c.id)).toEqual(['2']);
  });

  it('전체 삭제하면 저장된 목록이 비워진다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    const { result } = renderHook(() => useComponentGenerator());
    act(() => result.current.clearAll());
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });
});
