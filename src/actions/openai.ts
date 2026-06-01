// src/actions/openai.ts
'use server';

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// === AI Engine Type ===
export type AIEngine = 'openai' | 'claude';

// === OpenAI Client ===
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Log khi khởi tạo
if (!process.env.OPENAI_API_KEY) {
  console.warn('[Server] OPENAI_API_KEY is missing');
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[Server] ANTHROPIC_API_KEY is missing');
}

// ============================================================
// Chat Response (Chatbot) — hỗ trợ cả 2 engine
// ============================================================
export async function generateChatResponse(
  messages: ChatCompletionMessageParam[],
  systemInstruction: string,
  engine: AIEngine = 'openai'
) {
  try {
    if (engine === 'claude') {
      return await claudeChat(messages, systemInstruction);
    }
    return await openaiChat(messages, systemInstruction);
  } catch (error: any) {
    console.error(`[${engine} Chat] Error:`, error.message);
    return { error: error.message || 'Lỗi kết nối AI. Vui lòng thử lại sau.' };
  }
}

// ============================================================
// Analyze Response (ConnectionTool) — hỗ trợ cả 2 engine
// ============================================================
export async function generateAnalyzeResponse(
  prompt: string,
  systemInstruction?: string,
  engine: AIEngine = 'openai'
) {
  const defaultSystem = `Bạn là chuyên gia Tâm lý học Hành vi (Behavioral Psychologist) và Cố vấn Chiến lược Nhân sự với hơn 30 năm kinh nghiệm nghiên cứu số học ứng dụng.

=== QUY TẮC BẮT BUỘC ===
1. PHÂN TÍCH THEO BẢN CHẤT NĂNG LƯỢNG, KHÔNG đọc lại hay paraphrase dữ liệu.
2. SỬ DỤNG DỮ LIỆU "KIẾN THỨC SÂU" (keywords, advantages, challenges, balance) LÀM NỀN TẢNG.
3. KHI PHÂN TÍCH TỔ HỢP: Nhận diện → Phân loại quan hệ → Tạo trục năng lượng → Phân tích 5 lớp → 3 kịch bản.
4. TỶ TRỌNG: 80% logic phân tích + 20% pattern tăng cường.
5. ĐƯA VÍ DỤ THỰC TẾ CỤ THỂ cho MỖI điểm.
6. CẤM thuật ngữ tâm linh. Thay bằng: 'động lực tâm lý', 'xu hướng hành vi'.
7. GIỌNG VĂN: Thực tế, sắc sảo, tâm lý học hành vi.
8. FORMAT: HTML sạch (h3, h4, ul, li, p, strong). KHÔNG markdown.`;

  try {
    if (engine === 'claude') {
      return await claudeAnalyze(prompt, systemInstruction || defaultSystem);
    }
    return await openaiAnalyze(prompt, systemInstruction || defaultSystem);
  } catch (error: any) {
    console.error(`[${engine} Analyze] Error:`, error.message);
    return { error: error.message || 'Lỗi phân tích. Vui lòng thử lại sau.' };
  }
}

// ============================================================
// OpenAI implementations
// ============================================================
async function openaiChat(messages: ChatCompletionMessageParam[], systemInstruction: string) {
  if (!openai) throw new Error('OPENAI_API_KEY is not configured');

  console.log('[OpenAI Chat] Starting...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemInstruction },
      ...messages,
    ],
    temperature: 0.5,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No content received from OpenAI');

  console.log('[OpenAI Chat] Success');
  return { content };
}

async function openaiAnalyze(prompt: string, systemInstruction: string) {
  if (!openai) throw new Error('OPENAI_API_KEY is not configured');

  console.log('[OpenAI Analyze] Starting...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_completion_tokens: 16384,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No content received from OpenAI');

  console.log('[OpenAI Analyze] Success');
  return { content };
}

// ============================================================
// Claude implementations (dùng fetch trực tiếp — tương thích Vercel)
// ============================================================
async function claudeChat(messages: ChatCompletionMessageParam[], systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  console.log('[Claude Chat] Starting...');

  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
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
    console.error('[Claude Chat] API Error:', response.status, errorBody);
    throw new Error(`Claude API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.type === 'text' ? data.content[0].text : null;
  if (!content) throw new Error('No content received from Claude');

  console.log('[Claude Chat] Success');
  return { content };
}

async function claudeAnalyze(prompt: string, systemInstruction: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  console.log('[Claude Analyze] Starting...');

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
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Claude Analyze] API Error:', response.status, errorBody);
    throw new Error(`Claude API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.type === 'text' ? data.content[0].text : null;
  if (!content) throw new Error('No content received from Claude');

  console.log('[Claude Analyze] Success');
  return { content };
}

// ============================================================
// Kiểm tra engine nào available
// ============================================================
export async function getAvailableEngines(): Promise<AIEngine[]> {
  const engines: AIEngine[] = [];
  if (process.env.OPENAI_API_KEY) engines.push('openai');
  if (process.env.ANTHROPIC_API_KEY) engines.push('claude');
  return engines;
}
