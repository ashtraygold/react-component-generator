import type { Provider } from '../src/types';
import { createSSEParser } from '../src/utils/sse';
import { stripCodeFences, ensureRenderCall } from './generator';
import { extractDelta } from './streamText';
import { toErrorResponse } from './errors';

// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.

/**
 * 업스트림(프로바이더) SSE를 읽어 `delta`/`done`/`error` 이벤트로 다시 내보낸다.
 * 최종 코드는 비스트리밍 경로와 같은 후처리(stripCodeFences, ensureRenderCall)를 거친다.
 */
export function relayStream(provider: Provider, upstream: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const parser = createSSEParser();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let raw = '';
      try {
        const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const data of parser.feed(decoder.decode(value, { stream: true }))) {
            const { text, truncated } = extractDelta(provider, data);
            if (text) {
              raw += text;
              send({ type: 'delta', text });
            }
            if (truncated) {
              throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
            }
          }
        }
        send({ type: 'done', code: ensureRenderCall(stripCodeFences(raw)) });
      } catch (err) {
        send({ type: 'error', error: toErrorResponse(err).error });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}
