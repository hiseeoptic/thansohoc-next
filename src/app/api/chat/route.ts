import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemInstruction, engine = 'claude' } = await req.json();

    // Auto-fallback
    let activeEngine = engine;
    if (engine === 'openai' && !process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY) {
      activeEngine = 'claude';
    } else if (engine === 'claude' && !process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY) {
      activeEngine = 'openai';
    }

    if (activeEngine === 'claude') {
      return await streamClaude(messages, systemInstruction);
    }
    return await streamOpenAI(messages, systemInstruction);
  } catch (error: any) {
    console.error('[API /chat] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

async function streamClaude(messages: ChatMessage[], systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  const claudeMessages = messages
    .filter((m: ChatMessage) => m.role !== 'system')
    .map((m: ChatMessage) => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemInstruction,
      messages: claudeMessages,
      temperature: 0.5,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json({ error: `Claude API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  return pipeSSEStream(response, 'claude');
}

async function streamOpenAI(messages: ChatMessage[], systemInstruction: string) {
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
        ...messages,
      ],
      temperature: 0.5,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json({ error: `OpenAI API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  return pipeSSEStream(response, 'openai');
}

function pipeSSEStream(response: Response, provider: 'claude' | 'openai') {
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
              let text: string | undefined;

              if (provider === 'claude') {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  text = event.delta.text;
                }
              } else {
                text = event.choices?.[0]?.delta?.content;
              }

              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      } catch (err: any) {
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
    },
  });
}
