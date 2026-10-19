import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { parseComponents, addComponent } from '../utils/components';
import { createSSEParser } from '../utils/sse';
import { stripStreamingFences } from '../utils/streamFences';
import { usePersistentState } from './usePersistentState';

const COMPONENTS_KEY = 'rcg:components';
const INTERRUPTED_MESSAGE = '응답이 중단되었습니다. 다시 시도해주세요.';

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  /** 스트리밍 중인 컴포넌트. 완료되면 같은 id로 components에 추가되고 null이 된다. */
  pending: GeneratedComponent | null;
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<boolean>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = usePersistentState<GeneratedComponent[]>(
    COMPONENTS_KEY,
    [],
    parseComponents,
  );
  const [pending, setPending] = useState<GeneratedComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date();
    setPending({ id, prompt, code: '', createdAt });

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate component');
      }
      if (!res.body) throw new Error(INTERRUPTED_MESSAGE);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSSEParser();
      let raw = '';
      let finalCode: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const data of parser.feed(decoder.decode(value, { stream: true }))) {
          const event = JSON.parse(data) as StreamEvent;
          if (event.type === 'delta') {
            raw += event.text;
            const code = stripStreamingFences(raw);
            setPending((prev) => (prev ? { ...prev, code } : prev));
          } else if (event.type === 'done') {
            finalCode = event.code;
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }

      if (finalCode === null) throw new Error(INTERRUPTED_MESSAGE);

      setComponents((prev) => addComponent(prev, { id, prompt, code: finalCode, createdAt }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setPending(null);
      setIsLoading(false);
    }
  }, [setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, pending, isLoading, error, generate, removeComponent, clearAll };
}
