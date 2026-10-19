// 에러 분류는 메시지 문자열에 의존한다. `... API error: ${status}` 형식(index.ts)을 전제로 하므로
// 그 형식을 바꾸면 503/429 매핑이 조용히 깨진다.
export function toErrorResponse(err: unknown): { status: number; error: string } {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('503')) {
    return { status: 503, error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' };
  }
  if (message.includes('429')) {
    return { status: 429, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }
  return { status: 500, error: message };
}
