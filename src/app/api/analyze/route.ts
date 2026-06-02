import { NextRequest, NextResponse } from 'next/server';

// 300s = 5 phút (gói Vercel Pro). Sonnet viết tiếng Việt chậm nên cần nhiều thời gian.
// Gói Hobby bị giới hạn 60s → Sonnet sẽ bị cắt, nên dùng GPT/Gemini (nhanh hơn) trên Hobby.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction, engine = 'auto' } = await req.json();

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
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured. Please switch engine.' }, { status: 400 });
    }
    if (activeEngine === 'openai' && !hasOpenAIKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured. Please switch engine.' }, { status: 400 });
    }
    if (activeEngine === 'gemini' && !hasGeminiKey) {
      return NextResponse.json({ error: 'GOOGLE_GEMINI_API_KEY is not configured. Please switch engine.' }, { status: 400 });
    }

    console.log(`[API /analyze] requested=${engine}, active=${activeEngine}, keys: claude=${hasAnthropicKey}, openai=${hasOpenAIKey}, gemini=${hasGeminiKey}`);

    if (activeEngine === 'claude') return await streamClaude(prompt, systemInstruction, activeEngine);
    if (activeEngine === 'gemini') return await streamGemini(prompt, systemInstruction, activeEngine);
    return await streamOpenAI(prompt, systemInstruction, activeEngine);
  } catch (error: any) {
    console.error('[API /analyze] Error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

function makeStreamResponse(stream: ReadableStream, engineUsed: string) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
      'X-Engine-Used': engineUsed,
    },
  });
}

// ========== Claude Streaming ==========
async function streamClaude(prompt: string, systemInstruction: string, engineLabel: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32768,
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
              if (event.type === 'content_block_delta' && event.delta?.text) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
              if (event.type === 'error') {
                controller.enqueue(encoder.encode(`\n\n[ERROR: ${event.error?.message || 'Unknown'}]`));
              }
            } catch {}
          }
        }
        // Stream kết thúc TỰ NHIÊN (Claude viết xong, không bị timeout) → gửi marker
        controller.enqueue(encoder.encode('<!--PART_OK-->'));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return makeStreamResponse(stream, engineLabel);
}

// ========== OpenAI Streaming ==========
async function streamOpenAI(prompt: string, systemInstruction: string, engineLabel: string) {
  const apiKey = process.env.OPENAI_API_KEY!;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_completion_tokens: 32768,
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
              if (text) controller.enqueue(encoder.encode(text));
            } catch {}
          }
        }
        controller.enqueue(encoder.encode('<!--PART_OK-->'));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return makeStreamResponse(stream, engineLabel);
}

// ========== Gemini Streaming ==========
async function streamGemini(prompt: string, systemInstruction: string, engineLabel: string) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 65535,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Gemini Stream] Error:', response.status, errorBody);
    return NextResponse.json({ error: `Gemini API error (${response.status}): ${errorBody}` }, { status: response.status });
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
              const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {}
          }
        }
        controller.enqueue(encoder.encode('<!--PART_OK-->'));
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[ERROR: ${err.message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return makeStreamResponse(stream, engineLabel);
}
