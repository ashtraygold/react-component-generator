import { describe, it, expect } from 'vitest';
import { relayStream } from './relayStream';

const encoder = new TextEncoder();

function upstreamOf(chunks: string[], failAfter?: Error): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      if (failAfter) controller.error(failAfter);
      else controller.close();
    },
  });
  return new Response(body);
}

const anthropicEvent = (text: string) =>
  `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`;
const googleEvent = (text: string, finishReason?: string) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] })}\n\n`;

async function collect(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => JSON.parse(block.replace(/^data: /, '')) as { type: string; text?: string; code?: string; error?: string });
}

describe('relayStream', () => {
  it('조각마다 delta 이벤트를 내보내고 마지막에 done을 보낸다', async () => {
    const events = await collect(
      relayStream('anthropic', upstreamOf([anthropicEvent('const A = () => '), anthropicEvent('<div />;')])),
    );

    expect(events.slice(0, 2)).toEqual([
      { type: 'delta', text: 'const A = () => ' },
      { type: 'delta', text: '<div />;' },
    ]);
    expect(events[2].type).toBe('done');
  });

  it('done의 코드는 코드펜스를 걷어내고 render 호출을 보장한다', async () => {
    const events = await collect(
      relayStream('anthropic', upstreamOf([anthropicEvent('```jsx\nconst Card = () => <div />;\n```')])),
    );

    expect(events.at(-1)).toEqual({
      type: 'done',
      code: 'const Card = () => <div />;\n\nrender(<Card />);',
    });
  });

  it('이벤트가 청크 경계에서 끊겨 도착해도 이어 붙인다', async () => {
    const full = anthropicEvent('hello');
    const events = await collect(
      relayStream('anthropic', upstreamOf([full.slice(0, 20), full.slice(20)])),
    );

    expect(events[0]).toEqual({ type: 'delta', text: 'hello' });
  });

  it('Google 응답이 MAX_TOKENS로 잘리면 error 이벤트를 보내고 done은 보내지 않는다', async () => {
    const events = await collect(
      relayStream('google', upstreamOf([googleEvent('const A'), googleEvent(' = 1', 'MAX_TOKENS')])),
    );

    expect(events.at(-1)).toEqual({
      type: 'error',
      error: '생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.',
    });
    expect(events.some((e) => e.type === 'done')).toBe(false);
  });

  it('업스트림 읽기가 중간에 실패하면 error 이벤트를 보낸다', async () => {
    const events = await collect(
      relayStream('anthropic', upstreamOf([anthropicEvent('x')], new Error('Claude API error: 503'))),
    );

    expect(events.at(-1)).toEqual({
      type: 'error',
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });
});
