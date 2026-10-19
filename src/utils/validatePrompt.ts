export const MAX_PROMPT_LENGTH = 500;

export type PromptValidation = { valid: true } | { valid: false; error: string };

/** 프롬프트 길이가 제한 이내인지 검사한다. 앞뒤 공백은 제외하고, 이모지는 한 글자로 센다. */
export function validatePrompt(prompt: string): PromptValidation {
  const length = [...prompt.trim()].length;

  if (length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자 이하로 입력해주세요. (현재 ${length}자)`,
    };
  }
  return { valid: true };
}
