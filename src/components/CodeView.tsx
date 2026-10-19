import { useState, useEffect, useRef } from 'react';

interface CodeViewProps {
  code: string;
  /** 코드가 아직 생성되는 중이면 상태를 표시하고 최신 줄이 보이도록 따라 내려간다. */
  streaming?: boolean;
}

export function CodeView({ code, streaming = false }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (streaming && blockRef.current) {
      blockRef.current.scrollTop = blockRef.current.scrollHeight;
    }
  }, [code, streaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-panel">
      <div className="panel-header">
        <h3>코드</h3>
        {streaming && (
          <span role="status" className="streaming-status">
            <span className="streaming-dot" aria-hidden="true" />
            코드 생성 중...
          </span>
        )}
        <button className="btn-copy" onClick={handleCopy} disabled={streaming}>
          {copied ? '복사됨!' : '복사'}
        </button>
      </div>
      <pre ref={blockRef} className={`code-block${streaming ? ' code-block--streaming' : ''}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
