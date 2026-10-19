import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import { validatePromptInput } from './validateRequest';
import { relayStream } from './relayStream';
import { toErrorResponse } from './errors';

// 우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다.
const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function callGoogleModel(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  return (
    candidate?.content?.parts
      ?.map((part) => part.text)
      ?.join('') ?? ''
  );
}

async function callGoogle(prompt: string, apiKey: string): Promise<string> {
  return withModelFallback(GOOGLE_MODELS, (model) => callGoogleModel(prompt, apiKey, model));
}

type ParsedGenerateRequest =
  | { ok: true; prompt: string; provider: Provider; apiKey: string }
  | { ok: false; response: Response };

/** 일반/스트리밍 생성 엔드포인트가 공유하는 요청 검증. 실패하면 그대로 돌려줄 Response를 담는다. */
async function parseGenerateRequest(req: Request): Promise<ParsedGenerateRequest> {
  const { prompt, apiKey, provider = 'anthropic' } = (await req.json()) as {
    prompt: string;
    apiKey?: string;
    provider?: Provider;
  };

  const resolvedKey = resolveApiKey(provider, apiKey);

  if (!resolvedKey) {
    return {
      ok: false,
      response: Response.json(
        { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
        { status: 400, headers: CORS_HEADERS }
      ),
    };
  }

  const promptCheck = validatePromptInput(prompt);
  if (!promptCheck.valid) {
    return {
      ok: false,
      response: Response.json({ error: promptCheck.error }, { status: 400, headers: CORS_HEADERS }),
    };
  }

  return { ok: true, prompt, provider, apiKey: resolvedKey };
}

function errorResponse(err: unknown): Response {
  const { status, error } = toErrorResponse(err);
  return Response.json({ error }, { status, headers: CORS_HEADERS });
}

// 스트리밍 호출은 응답 본문을 읽기 전에 상태 코드만 검사해, 연결 실패는 모델 폴백이 처리하게 한다.
// 에러 메시지에는 상태 코드만 담는다. 요청 URL(Google 키 포함)은 넣지 않는다.
async function openAnthropicStream(prompt: string, apiKey: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  return response;
}

async function openGoogleStream(
  prompt: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  return response;
}

function openStream(provider: Provider, prompt: string, apiKey: string, signal: AbortSignal): Promise<Response> {
  return provider === 'google'
    ? withModelFallback(GOOGLE_MODELS, (model) => openGoogleStream(prompt, apiKey, model, signal))
    : openAnthropicStream(prompt, apiKey, signal);
}

const server = Bun.serve({
  // API_PORT로 덮어쓸 수 있다(워크트리 등에서 이미 떠 있는 서버와 겹칠 때). vite.config.ts의 프록시와 같은 값을 쓴다.
  port: Number(process.env.API_PORT) || 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const parsed = await parseGenerateRequest(req);
        if (!parsed.ok) return parsed.response;

        const text =
          parsed.provider === 'google'
            ? await callGoogle(parsed.prompt, parsed.apiKey)
            : await callAnthropic(parsed.prompt, parsed.apiKey);

        const code = ensureRenderCall(stripCodeFences(text));

        return Response.json({ code }, { headers: CORS_HEADERS });
      } catch (err) {
        return errorResponse(err);
      }
    }

    // 생성 중인 코드를 SSE로 흘려보낸다. 업스트림 연결이 열리기 전의 실패는 일반 JSON 에러로,
    // 스트리밍 도중의 실패는 `error` 이벤트로 알린다.
    if (req.method === 'POST' && url.pathname === '/api/generate/stream') {
      try {
        const parsed = await parseGenerateRequest(req);
        if (!parsed.ok) return parsed.response;

        const upstream = await openStream(parsed.provider, parsed.prompt, parsed.apiKey, req.signal);

        return new Response(relayStream(parsed.provider, upstream), {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          },
        });
      } catch (err) {
        return errorResponse(err);
      }
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);
