import { describe, it, expect } from 'vitest';
import { validatePrompt, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePrompt', () => {
  it('최대 길이는 500자다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });

  it('500자 이하면 유효하다', () => {
    expect(validatePrompt('가'.repeat(500))).toEqual({ valid: true, length: 500 });
  });

  it('501자 이상이면 길이 초과 에러를 반환한다', () => {
    const result = validatePrompt('가'.repeat(501));

    expect(result).toEqual({
      valid: false,
      length: 501,
      error: '프롬프트는 500자 이하로 입력해주세요. (현재 501자)',
    });
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    expect(validatePrompt(`  ${'가'.repeat(500)}  `)).toEqual({ valid: true, length: 500 });
  });

  it('이모지 같은 서로게이트 쌍 문자는 한 글자로 센다', () => {
    expect(validatePrompt('😀'.repeat(500))).toEqual({ valid: true, length: 500 });
    expect(validatePrompt('😀'.repeat(501)).valid).toBe(false);
  });
});
