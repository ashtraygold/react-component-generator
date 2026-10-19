import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

const STORAGE_KEY = 'rcg:components';
const saved = [
  { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: '2024-05-01T10:30:00.000Z' },
  { id: '2', prompt: '표', code: 'render(<table />)', createdAt: '2024-05-01T11:00:00.000Z' },
];

const encoder = new TextEncoder();
const sse = (event: object) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

/** 이벤트를 한꺼번에 흘려보내고 닫는 스트리밍 응답 */
function streamResponse(events: object[]) {
  return {
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        events.forEach((event) => controller.enqueue(sse(event)));
        controller.close();
      },
    }),
  };
}

/** 이벤트를 테스트가 원하는 시점에 보낼 수 있는 스트리밍 응답 */
function controlledStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: { ok: true, body },
    send: (event: object) => controller.enqueue(sse(event)),
    close: () => controller.close(),
  };
}

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
      vi.fn().mockResolvedValue(streamResponse([{ type: 'done', code: 'render(<b />)' }])),
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

describe('useComponentGenerator 스트리밍', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('스트리밍 엔드포인트로 요청한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([{ type: 'done', code: 'c' }]));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('p', 'key', 'google'));

    expect(fetchMock.mock.calls[0][0]).toBe('/api/generate/stream');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ prompt: 'p', apiKey: 'key', provider: 'google' });
  });

  it('생성이 시작되면 pending이 생기고 delta가 올 때마다 코드가 누적된다', async () => {
    const stream = controlledStream();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    let promise!: Promise<boolean>;
    act(() => {
      promise = result.current.generate('버튼', undefined, 'google');
    });
    await waitFor(() => expect(result.current.pending).toMatchObject({ prompt: '버튼', code: '' }));

    await act(async () => stream.send({ type: 'delta', text: 'const A' }));
    await waitFor(() => expect(result.current.pending?.code).toBe('const A'));

    await act(async () => stream.send({ type: 'delta', text: ' = 1;' }));
    await waitFor(() => expect(result.current.pending?.code).toBe('const A = 1;'));

    await act(async () => {
      stream.send({ type: 'done', code: 'const A = 1;\nrender(<A />);' });
      stream.close();
      await promise;
    });
  });

  it('스트리밍 중에는 코드펜스를 걷어내고 보여준다', async () => {
    const stream = controlledStream();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    let promise!: Promise<boolean>;
    act(() => {
      promise = result.current.generate('p', undefined, 'google');
    });
    await act(async () => stream.send({ type: 'delta', text: '```jsx\nconst A = 1;' }));
    await waitFor(() => expect(result.current.pending?.code).toBe('const A = 1;'));

    await act(async () => {
      stream.send({ type: 'done', code: 'c' });
      stream.close();
      await promise;
    });
  });

  it('done을 받으면 pending을 지우고 같은 id의 컴포넌트를 최종 코드로 추가한다', async () => {
    const stream = controlledStream();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    let promise!: Promise<boolean>;
    act(() => {
      promise = result.current.generate('p', undefined, 'google');
    });
    await waitFor(() => expect(result.current.pending).not.toBeNull());
    const pendingId = result.current.pending!.id;

    let ok: boolean | undefined;
    await act(async () => {
      stream.send({ type: 'delta', text: 'partial' });
      stream.send({ type: 'done', code: 'final code' });
      stream.close();
      ok = await promise;
    });

    expect(ok).toBe(true);
    expect(result.current.pending).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.components[0]).toMatchObject({ id: pendingId, code: 'final code' });
  });

  it('error 이벤트를 받으면 에러를 보여주고 false를 반환하며 pending을 지운다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([
          { type: 'delta', text: 'x' },
          { type: 'error', error: '생성된 코드가 너무 길어 잘렸습니다.' },
        ]),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.generate('p', undefined, 'google');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('생성된 코드가 너무 길어 잘렸습니다.');
    expect(result.current.pending).toBeNull();
    expect(result.current.components).toHaveLength(0);
  });

  it('HTTP 에러 응답이면 본문의 error 메시지를 보여주고 false를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: '요청이 너무 많습니다.' }) }),
    );
    const { result } = renderHook(() => useComponentGenerator());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.generate('p', undefined, 'google');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('요청이 너무 많습니다.');
    expect(result.current.pending).toBeNull();
  });

  it('done 없이 스트림이 끝나면 중단 에러로 처리한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(streamResponse([{ type: 'delta', text: 'partial' }])),
    );
    const { result } = renderHook(() => useComponentGenerator());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.generate('p', undefined, 'google');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('응답이 중단되었습니다. 다시 시도해주세요.');
    expect(result.current.components).toHaveLength(0);
  });
});
