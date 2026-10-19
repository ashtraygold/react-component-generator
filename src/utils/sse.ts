/**
 * Server-Sent Events 텍스트를 청크 단위로 받아 완성된 이벤트의 data만 꺼낸다.
 * 청크는 줄 중간에서 끊길 수 있으므로 미완성 줄은 다음 feed까지 보관한다.
 */
export function createSSEParser(): { feed: (chunk: string) => string[] } {
  let buffer = '';
  let dataLines: string[] = [];

  return {
    feed(chunk) {
      buffer += chunk;
      const lines = buffer.split(/\r\n|\n|\r/);
      buffer = lines.pop() ?? '';

      const events: string[] = [];
      for (const line of lines) {
        if (line === '') {
          if (dataLines.length > 0) events.push(dataLines.join('\n'));
          dataLines = [];
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        // event:, id:, retry:, 주석(:)은 사용하지 않는다.
      }
      return events;
    },
  };
}
