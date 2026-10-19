import type { Provider } from '../src/types';

interface StreamPayload {
  // Anthropic
  type?: string;
  delta?: { type?: string; text?: string };
  // Google
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

// 프로바이더별 스트리밍 청크(JSON)에서 텍스트 조각을 꺼내는 순수 함수.
// 파싱할 수 없거나 텍스트가 없는 이벤트는 빈 문자열로 취급한다.
export function extractDelta(provider: Provider, data: string): { text: string; truncated: boolean } {
  let payload: StreamPayload;
  try {
    payload = JSON.parse(data) as StreamPayload;
  } catch {
    return { text: '', truncated: false };
  }

  if (provider === 'anthropic') {
    const delta = payload?.type === 'content_block_delta' ? payload.delta : undefined;
    return { text: delta?.type === 'text_delta' ? (delta.text ?? '') : '', truncated: false };
  }

  const candidate = payload?.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? '').join('');
  return { text, truncated: candidate?.finishReason === 'MAX_TOKENS' };
}
