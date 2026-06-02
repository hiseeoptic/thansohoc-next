import { NextResponse } from 'next/server';

export async function GET() {
  const engines = [
    {
      id: 'openai',
      name: 'GPT-4.1 Mini',
      available: !!process.env.OPENAI_API_KEY,
      costLabel: '~2,900₫/bài',
      maxTokens: 32768,
      tier: 'standard',
    },
    {
      id: 'gemini',
      name: 'Gemini 2.5 Flash',
      available: !!process.env.GOOGLE_GEMINI_API_KEY,
      costLabel: '~4,200₫/bài',
      maxTokens: 65535,
      tier: 'standard',
    },
    {
      id: 'claude',
      name: 'Claude Sonnet 4',
      available: !!process.env.ANTHROPIC_API_KEY,
      costLabel: '~26,000₫/bài',
      maxTokens: 32768,
      tier: 'premium',
    },
  ];

  const defaultEngine = engines.find(e => e.available)?.id || null;

  return NextResponse.json({ engines, defaultEngine });
}
