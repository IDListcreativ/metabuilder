import { callAIEndpoint } from './aiClient';

const ENDPOINT = '/api/ai/chat-completion';

export function parseAIError(error: unknown): { message: string; isRateLimit: boolean; retryAfter?: number } {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    const retryMatch = msg.match(/retry after (\d+)/i);
    return {
      message: 'Rate limit reached. OpenAI is temporarily throttling requests. Please wait a moment and try again.',
      isRateLimit: true,
      retryAfter: retryMatch ? parseInt(retryMatch[1]) : 30,
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api key')) {
    return { message: 'Invalid or missing OpenAI API key. Please check your OPENAI_API_KEY environment variable.', isRateLimit: false };
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return { message: 'Access denied. Your OpenAI API key does not have permission for this model.', isRateLimit: false };
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    return { message: 'OpenAI service is temporarily unavailable. Please try again in a few seconds.', isRateLimit: false };
  }
  if (lower.includes('context length') || lower.includes('maximum context') || lower.includes('token')) {
    return { message: 'The conversation is too long for this model. Try starting a new conversation or use a model with a larger context window.', isRateLimit: false };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return { message: 'Network error. Please check your internet connection and try again.', isRateLimit: false };
  }
  return { message: msg || 'An unexpected error occurred. Please try again.', isRateLimit: false };
}

export async function getChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  parameters: object = {}
) {
  return callAIEndpoint(ENDPOINT, {
    provider,
    model,
    messages,
    stream: false,
    parameters,
  });
}

export async function getStreamingChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  parameters: object = {}
) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        messages,
        stream: true,
        parameters: {
          ...parameters,
          stream_options: { include_usage: true },
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const rawMsg = data.error || data.details || `HTTP error: ${response.status}`;
      const parsed = parseAIError(rawMsg);
      throw new Error(parsed.message);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk' && data.chunk) {
              onChunk(data.chunk);
            } else if (data.type === 'done') onComplete();
            else if (data.type === 'error') {
              const parsed = parseAIError(data.error || data.details || '');
              onError(new Error(parsed.message));
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    const parsed = parseAIError(error);
    onError(new Error(parsed.message));
  }
}
