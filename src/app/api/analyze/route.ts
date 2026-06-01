import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction, engine = 'claude' } = await req.json();

    // Debug: log available env keys
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    console.log(`[API /analyze] engine=${engine}, hasAnthropicKey=${hasAnthropicKey}, hasOpenAIKey=${hasOpenAIKey}`);

    // Auto-fallback
    let activeEngine = engine;
    if (engine === 'claude' && !hasAnthropicKey && hasOpenAIKey) activeEngine = 'openai';
    if (engine === 'openai' && !hasOpenAIKey && hasAnthropicKey) activeEngine = 'claude';

    if (activeEngine === 'claude') {
      return await handleClaude(prompt, systemInstruction);
    }
    return await handleOpenAI(prompt, systemInstruction);
  } catch (error: any) {
    console.error('[API /analyze] Error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

async function handleClaude(prompt: string, systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
  }

  console.log('[API Claude] Starting... prompt:', prompt.length, 'chars, system:', systemInstruction.length, 'chars');

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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[API Claude] Error:', response.status, errorBody);
    return NextResponse.json({ error: `Claude API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  const data = await response.json();
  const content = data.content?.[0]?.type === 'text' ? data.content[0].text : null;

  if (!content) {
    return NextResponse.json({ error: 'No content received from Claude' }, { status: 500 });
  }

  console.log('[API Claude] Success, response length:', content.length);
  return NextResponse.json({ content });
}

async function handleOpenAI(prompt: string, systemInstruction: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
  }

  console.log('[API OpenAI] Starting...');

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
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[API OpenAI] Error:', response.status, errorBody);
    return NextResponse.json({ error: `OpenAI API error (${response.status}): ${errorBody}` }, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json({ error: 'No content received from OpenAI' }, { status: 500 });
  }

  console.log('[API OpenAI] Success');
  return NextResponse.json({ content });
}
