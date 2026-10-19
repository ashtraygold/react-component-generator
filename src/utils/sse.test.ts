import { describe, it, expect } from 'vitest';
import { createSSEParser } from './sse';

describe('createSSEParser', () => {
  it('빈 줄로 끝난 이벤트의 data를 반환한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: {"a":1}\n\n')).toEqual(['{"a":1}']);
  });

  it('한 번에 여러 이벤트가 들어오면 순서대로 모두 반환한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: one\n\ndata: two\n\n')).toEqual(['one', 'two']);
  });

  it('청크가 줄 중간에서 끊겨도 이어 붙여 해석한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: hel')).toEqual([]);
    expect(parser.feed('lo\n')).toEqual([]);
    expect(parser.feed('\n')).toEqual(['hello']);
  });

  it('CRLF 줄바꿈도 처리한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: x\r\n\r\n')).toEqual(['x']);
  });

  it('여러 줄 data는 개행으로 합친다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: a\ndata: b\n\n')).toEqual(['a\nb']);
  });

  it('event:, id: 줄과 주석(:)은 무시한다', () => {
    const parser = createSSEParser();
    expect(parser.feed(': ping\nevent: message\nid: 1\ndata: x\n\n')).toEqual(['x']);
  });

  it('data가 없는 이벤트는 반환하지 않는다', () => {
    const parser = createSSEParser();
    expect(parser.feed(': keep-alive\n\n')).toEqual([]);
  });
});
