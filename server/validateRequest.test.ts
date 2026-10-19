import { describe, it, expect } from 'vitest';
import { validatePromptInput } from './validateRequest';

describe('validatePromptInput', () => {
  it('500자 이하의 프롬프트는 통과한다', () => {
    expect(validatePromptInput('가'.repeat(500))).toEqual({ valid: true });
  });

  it('501자부터는 길이 초과 에러를 반환한다', () => {
    expect(validatePromptInput('가'.repeat(501))).toEqual({
      valid: false,
      error: '프롬프트는 500자 이하로 입력해주세요. (현재 501자)',
    });
  });

  it('문자열이 아니면 거부한다', () => {
    expect(validatePromptInput(123).valid).toBe(false);
    expect(validatePromptInput(undefined).valid).toBe(false);
  });

  it('공백뿐인 프롬프트는 거부한다', () => {
    expect(validatePromptInput('   ')).toEqual({ valid: false, error: '프롬프트를 입력해주세요.' });
  });
});
