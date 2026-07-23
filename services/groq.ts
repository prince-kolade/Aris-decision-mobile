const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const IS_WEB = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const FETCH_URL = IS_WEB ? 'https://corsproxy.io/?url=' + encodeURIComponent(GROQ_API_URL) : GROQ_API_URL;

const MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export const DECISION_ADDON = `

Ari is facing a decision. Help her through it with love and patience:

STEP 1 — Understand what's going on. Ask gentle questions.
STEP 2 — Help her see what she truly wants.
STEP 3 — Gently point out any assumptions she might be making.
STEP 4 — Explore options together, without pushing.
STEP 5 — Talk through risks, but gently.
STEP 6 — Help her think about short and long term.
STEP 7 — Offer your perspective, but let her decide.

Never rush her. Never tell her what to do. Guide her with love.`;

const DECISION_PATTERNS = [
  /should i /i,
  /i('m| am) thinking about/i,
  /would it be better if/i,
  /help me decide/i,
  /what should i do/i,
  /i need to decide/i,
  /i can't decide/i,
  /i don't know (whether|if|what)/i,
  /torn between/i,
  /considering (whether|if)/i,
  /which (one|option|path|choice)/i,
  /i('m| am) not sure (what|which|whether)/i,
  /pro(s|) and con(s|)/i,
  /weigh(ing|) (my |the )?(options|choices)/i,
  /(dilemma|trade.?off)/i,
];

export function isDecisionMessage(text: string): boolean {
  return DECISION_PATTERNS.some((p) => p.test(text));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
  timeout = 15000,
): Promise<Response> {
  const timeoutController = new AbortController();
  const id = setTimeout(() => timeoutController.abort(), timeout);

  const externalSignal = options.signal as AbortSignal | undefined;
  const onAbort = () => timeoutController.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort();
    } else {
      externalSignal.addEventListener('abort', onAbort);
    }
  }

  try {
    return await fetch(url, { ...options, signal: timeoutController.signal });
  } finally {
    clearTimeout(id);
    if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
  }
}

const HARDCODED_KEY = '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';

async function getApiKey(): Promise<string | null> {
  return HARDCODED_KEY;
}

export async function streamGroqResponse(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    try {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('API key not set');

      const response = await fetchWithTimeout(
        FETCH_URL,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
          }),
          signal,
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq error ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {}
        }
      }
      return;
    } catch (err) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (err instanceof DOMException && err.name === 'AbortError') throw err;

      lastError = err instanceof Error ? err : new Error(String(err));

      const isRetryable =
        err instanceof TypeError ||
        (err instanceof Error && /network|timeout|5\d{2}/i.test(err.message));

      if (!isRetryable || attempt === MAX_RETRIES - 1) throw lastError;

      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('Stream failed');
}
