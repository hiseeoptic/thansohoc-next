import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemInstruction, engine = 'auto' } = await req.json();

    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const hasGeminiKey = !!process.env.GOOGLE_GEMINI_API_KEY;

    let activeEngine = engine;

    if (engine === 'auto') {
      if (hasOpenAIKey) activeEngine = 'openai';
      else if (hasGeminiKey) activeEngine = 'gemini';
      else if (hasAnthropicKey) activeEngine = 'claude';
      else return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    if (activeEngine === 'claude' && !hasAnthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 400 });
    }
    if (activeEngine === 'openai' && !hasOpenAIKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 400 });
    }
    if (activeEngine === 'gemini' && !hasGeminiKey) {
      return NextResponse.json({ error: 'GOOGLE_GEMINI_API_KEY is not configured' }, { status: 400 });
    }

    if (activeEngine === 'claude') return await streamClaude(messages, systemInstruction);
    if (activeEngine === 'gemini') return await streamGemini(messages, systemInstruction);
    return await streamOpenAI(messages, systemInstruction);
  } catch (error: any) {
    console.error('[API /chat] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

function pipeSSEStream(response: Response, provider: 'claude' | 'openai' | 'gemini') {
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
                if (event.type === 'content_block_delta' && event.delta?.text) text = event.delta.text;
              } else if (provider === 'gemini') {
                text = event.candidates?.[0]?.content?.parts?.[0]?.text;
              } else {
                text = event.choices?.[0]?.delta?.content;
              }
              if (text) controller.enqueue(encoder.encode(text));
            } catch {}
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
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

async function streamClaude(messages: ChatMessage[], systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
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
      max_tokens: 16384,
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
  const apiKey = process.env.OPENAI_API_KEY!;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'system', content: systemInstruction }, ...messages],
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

async function streamGemini(messages: ChatMessage[], systemInstruction: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;
  const geminiContents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.5 },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json({ error: `Gemini API error (${response.status}): ${errorBody}` }, { status: response.status });
  }
  return pipeSSEStream(response, 'gemini');
}
