import { describe, it, expect } from 'vitest';
import { extractDelta } from './streamText';

describe('extractDelta - anthropic', () => {
  it('content_block_delta의 text_delta에서 텍스트를 꺼낸다', () => {
    const data = JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'const a' },
    });
    expect(extractDelta('anthropic', data)).toEqual({ text: 'const a', truncated: false });
  });

  it('텍스트가 없는 이벤트(message_start 등)는 빈 문자열이다', () => {
    const data = JSON.stringify({ type: 'message_start', message: {} });
    expect(extractDelta('anthropic', data)).toEqual({ text: '', truncated: false });
  });

  it('JSON이 아닌 data는 무시한다', () => {
    expect(extractDelta('anthropic', '[DONE]')).toEqual({ text: '', truncated: false });
  });
});

describe('extractDelta - google', () => {
  it('candidates의 parts 텍스트를 이어 붙인다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'foo' }, { text: 'bar' }] } }],
    });
    expect(extractDelta('google', data)).toEqual({ text: 'foobar', truncated: false });
  });

  it('finishReason이 MAX_TOKENS면 잘렸다고 표시한다', () => {
    const data = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(extractDelta('google', data)).toEqual({ text: 'x', truncated: true });
  });

  it('candidates가 없는 청크는 빈 문자열이다', () => {
    expect(extractDelta('google', JSON.stringify({ usageMetadata: {} }))).toEqual({
      text: '',
      truncated: false,
    });
  });
});
