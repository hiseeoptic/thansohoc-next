// src/actions/openai.ts
'use server';

// === AI Engine Type ===
export type AIEngine = 'openai' | 'claude' | 'gemini';

export async function getAvailableEngines(): Promise<AIEngine[]> {
  const engines: AIEngine[] = [];
  if (process.env.OPENAI_API_KEY) engines.push('openai');
  if (process.env.GOOGLE_GEMINI_API_KEY) engines.push('gemini');
  if (process.env.ANTHROPIC_API_KEY) engines.push('claude');
  return engines;
}
