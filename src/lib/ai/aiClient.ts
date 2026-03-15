const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAIEndpoint(endpoint: string, payload: object) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const statusCode = data.statusCode || response.status;

        // Rate limit error — retry with exponential backoff
        if (statusCode === 429 && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`Rate limit hit (429). Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          continue;
        }

        // Provide a user-friendly message for 429 after retries exhausted
        if (statusCode === 429) {
          throw new Error(
            'The AI service is currently rate-limited. Please wait a moment and try again, or check your OpenAI API quota at platform.openai.com.'
          );
        }

        console.error('API Route Error:', {
          error: data.error,
          details: data.details,
        });
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      // If it's our own thrown error (not a fetch/network error), rethrow immediately
      if (
        error instanceof Error &&
        (error.message.includes('rate-limited') || error.message.includes('Request failed'))
      ) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Network/fetch errors — retry
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }

      console.error('API request error:', error);
      throw lastError;
    }
  }

  throw lastError || new Error('Request failed after maximum retries');
}
