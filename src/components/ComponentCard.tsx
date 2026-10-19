import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
  /** 코드가 스트리밍으로 생성되는 중이다. 코드 탭을 보여주고, 끝나면 미리보기 탭으로 전환한다. */
  streaming?: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  onRemove,
  onRegenerate,
  isLoading,
  streaming = false,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>(streaming ? 'code' : 'preview');
  const [wasStreaming, setWasStreaming] = useState(streaming);
  const [previewKey, setPreviewKey] = useState(0);

  // 스트리밍 시작/종료 시점에 탭을 자동 전환한다. 렌더 중 상태 보정 패턴이라 effect가 필요 없다.
  if (streaming !== wasStreaming) {
    setWasStreaming(streaming);
    setActiveTab(streaming ? 'code' : 'preview');
  }

  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`component-card${streaming ? ' component-card--streaming' : ''}`}>
      <div className="card-header">
        <div className="card-title-group">
          <span>{createdAt}</span>
          <p className="card-prompt">{component.prompt}</p>
        </div>
        <div className="card-actions">
          <button
            className="btn-refresh"
            onClick={() => setPreviewKey((k) => k + 1)}
            title="미리보기 새로고침"
            aria-label="미리보기 새로고침"
            disabled={streaming}
          >
            ↻
          </button>
          <button
            className="btn-regenerate"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '재생성'}
          </button>
          <button
            className="btn-remove"
            onClick={() => onRemove(component.id)}
            disabled={streaming}
          >
            삭제
          </button>
        </div>
      </div>
      <div className="card-tabs">
        <button
          className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('preview')}
          disabled={streaming}
        >
          미리보기
        </button>
        <button
          className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          코드
        </button>
      </div>
      <div className="card-content">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView code={component.code} streaming={streaming} />
        )}
      </div>
    </div>
  );
}
