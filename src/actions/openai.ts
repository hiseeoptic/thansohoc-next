// src/actions/openai.ts
'use server';

// === AI Engine Type ===
export type AIEngine = 'openai' | 'claude';

// ============================================================
// Kiểm tra engine nào available (gọi từ client để auto-detect)
// ============================================================
export async function getAvailableEngines(): Promise<AIEngine[]> {
  const engines: AIEngine[] = [];
  if (process.env.OPENAI_API_KEY) engines.push('openai');
  if (process.env.ANTHROPIC_API_KEY) engines.push('claude');
  return engines;
}
