import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

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
      return await handleClaude(messages, systemInstruction);
    }
    return await handleOpenAI(messages, systemInstruction);
  } catch (error: any) {
    console.error('[API /chat] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

async function handleClaude(messages: ChatMessage[], systemInstruction: string) {
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
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[API Claude Chat] Error:', response.status, errorBody);
    return NextResponse.json({ error: `Claude API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  const data = await response.json();
  const content = data.content?.[0]?.type === 'text' ? data.content[0].text : null;

  if (!content) {
    return NextResponse.json({ error: 'No content received from Claude' }, { status: 500 });
  }

  return NextResponse.json({ content });
}

async function handleOpenAI(messages: ChatMessage[], systemInstruction: string) {
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
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[API OpenAI Chat] Error:', response.status, errorBody);
    return NextResponse.json({ error: `OpenAI API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: 'No content received from OpenAI' }, { status: 500 });
  }

  return NextResponse.json({ content });
}
