import { useState, useEffect, useRef } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import { addToHistory, parseHistory } from './utils/history';
import { removeStored } from './utils/storage';
import { EMPTY_API_KEYS, parseApiKeys, parseProvider } from './utils/apiKeys';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKeys, setApiKeys] = usePersistentState(
    'rcg:apiKeys',
    EMPTY_API_KEYS,
    parseApiKeys,
    'session',
  );
  const [provider, setProvider] = usePersistentState<Provider>('rcg:provider', 'google', parseProvider);
  const [history, setHistory] = usePersistentState<string[]>('rcg:history', [], parseHistory);
  const [showKey, setShowKey] = useState(false);
  const apiKey = apiKeys[provider];
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, pending, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();
  // 스트리밍 중인 컴포넌트를 맨 앞에 둔다. 완료되면 같은 id로 components 맨 앞에 들어오므로
  // 카드가 다시 만들어지지 않고 같은 인스턴스에서 탭만 미리보기로 전환된다.
  const displayed = pending ? [pending, ...components] : components;
  const pendingId = pending?.id;
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (pendingId) resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [pendingId]);

  useEffect(() => {
    // API 키를 localStorage에 저장하던 이전 버전의 잔여 값을 지운다.
    removeStored('rcg:apiKeys');
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = async (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    const succeeded = await generate(prompt, apiKey || undefined, provider);
    if (succeeded) {
      setHistory((prev) => addToHistory(prev, prompt));
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">RC</span>
            <span className="brand-name">React Component Generator</span>
          </div>
          <dl className="top-nav-status" aria-label="현재 작업 상태">
            <div>
              <dt>Provider</dt>
              <dd>{activeProvider}</dd>
            </div>
            <div>
              <dt>Components</dt>
              <dd>{components.length}</dd>
            </div>
          </dl>
        </div>
      </header>

    <div className="app">
      <nav className="breadcrumbs" aria-label="현재 위치">
        <ol>
          <li>홈</li>
          <li aria-current="page">컴포넌트 생성기</li>
        </ol>
      </nav>

      <div className="page-header">
        <h1>프롬프트로 만드는 UI 워크벤치</h1>
        <p>요청을 입력하고, 생성된 React 컴포넌트를 바로 미리보고 코드로 확인합니다.</p>
      </div>

      <main className="workspace">
        <section className="composer-panel" aria-label="컴포넌트 생성">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} history={history} />
        </section>

        <aside className="settings-panel" aria-label="실행 설정">
          <div className="settings-header">
            <h2>실행 설정</h2>
          </div>
          <div className="provider-select">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="api-key-input">
            <label htmlFor="api-key">
              API Key
            </label>
            <div className="api-key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={
                  hasEnvKey
                    ? '서버 키 사용 중 (직접 입력으로 덮어쓰기 가능)'
                    : PROVIDER_CONFIG[provider].placeholder
                }
              />
              <button
                className="btn-toggle-key"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
              {hasEnvKey
                ? apiKey
                  ? '직접 입력한 키가 .env 키보다 우선합니다. 이 탭을 닫으면 지워집니다.'
                  : '.env 키가 연결되어 있습니다.'
                : '직접 입력하거나 서버 환경변수를 설정하세요. 입력한 키는 이 탭을 닫으면 지워집니다.'}
            </p>
          </div>
        </aside>
      </main>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      <section className="results-section" ref={resultsRef}>
        {displayed.length > 0 && (
          <div className="results-header">
            <h2>
              생성된 컴포넌트 <span className="count">({displayed.length})</span>
            </h2>
            <button className="btn-clear" onClick={clearAll} disabled={isLoading}>
              전체 삭제
            </button>
          </div>
        )}

        {displayed.length === 0 && (
          <div className="empty-state">
            <h2>생성된 컴포넌트가 없습니다</h2>
            <p>위 입력창에 요청을 작성하고 컴포넌트 생성을 선택하세요.</p>
          </div>
        )}

        <div className="results-grid">
          {displayed.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
              streaming={component.id === pendingId}
            />
          ))}
        </div>
      </section>
    </div>
    </>
  );
}

export default App;
