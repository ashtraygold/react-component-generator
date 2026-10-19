/**
 * 스트리밍 중인 응답을 화면에 보여주기 위해 마크다운 코드펜스를 걷어낸다.
 * 최종 코드는 서버가 stripCodeFences로 정리하므로, 이 함수는 표시 전용이다.
 */
export function stripStreamingFences(text: string): string {
  const withoutOpening = text.replace(/^```[^\n]*(\n|$)/, '');
  return withoutOpening.replace(/\n?```\s*$/, '');
}
