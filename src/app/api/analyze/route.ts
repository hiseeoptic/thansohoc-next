import { NextRequest, NextResponse } from 'next/server';

// Serverless + Streaming: Vercel cho phép stream tối đa 5 PHÚT
// (Edge chỉ có 30s — ngắn hơn). First byte phải đến trong 60s → OK vì Claude stream ngay.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction, engine = 'claude' } = await req.json();

    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    console.log(`[API /analyze] engine=${engine}, hasAnthropicKey=${hasAnthropicKey}, hasOpenAIKey=${hasOpenAIKey}, prompt=${prompt.length}chars, system=${systemInstruction.length}chars`);

    // Auto-fallback
    let activeEngine = engine;
    if (engine === 'claude' && !hasAnthropicKey && hasOpenAIKey) activeEngine = 'openai';
    if (engine === 'openai' && !hasOpenAIKey && hasAnthropicKey) activeEngine = 'claude';

    if (activeEngine === 'claude') {
      return await streamClaude(prompt, systemInstruction);
    }
    return await streamOpenAI(prompt, systemInstruction);
  } catch (error: any) {
    console.error('[API /analyze] Error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

// ========== Claude Streaming ==========
async function streamClaude(prompt: string, systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Claude Stream] Error:', response.status, errorBody);
    return NextResponse.json({ error: `Claude API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  // Pipe Claude's SSE stream → client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              // Claude SSE: content_block_delta has the text chunks
              if (event.type === 'content_block_delta' && event.delta?.text) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
              // Error from Claude
              if (event.type === 'error') {
                console.error('[Claude Stream] Stream error:', event.error);
                controller.enqueue(encoder.encode(`\n\n[ERROR: ${event.error?.message || 'Unknown stream error'}]`));
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      } catch (err: any) {
        console.error('[Claude Stream] Read error:', err.message);
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// ========== OpenAI Streaming ==========
async function streamOpenAI(prompt: string, systemInstruction: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_completion_tokens: 16384,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[OpenAI Stream] Error:', response.status, errorBody);
    return NextResponse.json({ error: `OpenAI API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              const text = event.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      } catch (err: any) {
        console.error('[OpenAI Stream] Read error:', err.message);
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
