import { validatePrompt } from '../src/utils/validatePrompt';

export type PromptInputValidation = { valid: true } | { valid: false; error: string };

/** /api/generate 요청의 prompt를 검사한다. 길이 제한은 클라이언트와 같은 validatePrompt를 재사용한다. */
export function validatePromptInput(prompt: unknown): PromptInputValidation {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { valid: false, error: '프롬프트를 입력해주세요.' };
  }
  return validatePrompt(prompt);
}
