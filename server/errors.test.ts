import { describe, it, expect } from 'vitest';
import { toErrorResponse } from './errors';

describe('toErrorResponse', () => {
  it('503이 담긴 에러는 과부하 안내와 503으로 바꾼다', () => {
    expect(toErrorResponse(new Error('Gemini API error: 503'))).toEqual({
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('429가 담긴 에러는 요청 과다 안내와 429로 바꾼다', () => {
    expect(toErrorResponse(new Error('Claude API error: 429'))).toEqual({
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('그 외 에러는 메시지를 그대로 500으로 반환한다', () => {
    expect(toErrorResponse(new Error('Claude API error: 401'))).toEqual({
      status: 500,
      error: 'Claude API error: 401',
    });
  });

  it('Error가 아니면 Unknown error를 반환한다', () => {
    expect(toErrorResponse('boom')).toEqual({ status: 500, error: 'Unknown error' });
  });
});
