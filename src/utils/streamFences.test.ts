import { describe, it, expect } from 'vitest';
import { stripStreamingFences } from './streamFences';

describe('stripStreamingFences', () => {
  it('코드펜스가 없으면 그대로 둔다', () => {
    expect(stripStreamingFences('const a = 1;')).toBe('const a = 1;');
  });

  it('맨 앞의 여는 코드펜스 줄을 제거한다', () => {
    expect(stripStreamingFences('```jsx\nconst a = 1;')).toBe('const a = 1;');
  });

  it('여는 펜스가 아직 줄바꿈 없이 도착 중이면 빈 문자열로 둔다', () => {
    expect(stripStreamingFences('```js')).toBe('');
  });

  it('맨 끝의 닫는 코드펜스를 제거한다', () => {
    expect(stripStreamingFences('```jsx\nconst a = 1;\n```')).toBe('const a = 1;');
  });
});
