// src/actions/openai.ts
'use server';

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// === AI Engine Type ===
export type AIEngine = 'openai' | 'claude';

// === OpenAI Client ===
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// === Claude Client ===
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
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

=== QUY TẮC BẮT BUỘC (KHÔNG ĐƯỢC VI PHẠM) ===

1. BẠN PHẢI PHÂN TÍCH THEO BẢN CHẤT NĂNG LƯỢNG CỦA TỪNG SỐ, KHÔNG ĐƯỢC ĐỌC LẠI HAY PARAPHRASE DỮ LIỆU.
   - ĐÚNG: "Số 3 mang năng lượng biểu đạt + cảm xúc, số 5 mang năng lượng tự do + trải nghiệm → khi kết hợp tạo ra xu hướng lan tỏa mạnh nhưng thiếu chiều sâu"
   - SAI: "Người mang số 3 thường sáng tạo, người mang số 5 thường thích tự do" (đây là đọc lại, không phải phân tích)

2. PHẢI SỬ DỤNG DỮ LIỆU "KIẾN THỨC SÂU" VỀ TỪNG SỐ (keywords, advantages, challenges, balance) LÀM NỀN TẢNG phân tích. Trích dẫn cụ thể: "Theo đặc điểm của số X là...", "Số Y cho thấy..."

3. KHI PHÂN TÍCH TỔ HỢP SỐ:
   - Bước 1: Nhận diện năng lượng lõi của TỪNG số (dựa trên dữ liệu cung cấp)
   - Bước 2: Phân loại mối quan hệ (đồng hướng / bổ trợ / tương phản)
   - Bước 3: Tạo trục năng lượng kết hợp (VD: "Ổn định ↔ Tự do")
   - Bước 4: Phân tích 5 lớp: Core → Mechanism → Power → Shadow → Evolution
   - Bước 5: Sinh kịch bản 3 trạng thái (đúng hướng / lệch / trưởng thành)

4. TỶ TRỌNG: 80% logic phân tích năng lượng từ dữ liệu + 20% pattern tăng cường.

5. PHẢI ĐƯA VÍ DỤ THỰC TẾ CỤ THỂ cho MỖI điểm phân tích.

6. CẤM thuật ngữ tâm linh. Thay bằng: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn'.

7. GIỌNG VĂN: Thực tế, sắc sảo, tâm lý học hành vi.

8. FORMAT: HTML sạch (h3, h4, ul, li, p, strong). KHÔNG markdown.

9. MỖI phần h3 phải dài ít nhất 150-200 từ.

10. PHẦN "BÀI HỌC NHÂN – DUYÊN – QUẢ" phải phân tích tổ hợp số KĨ LƯỠNG.`;

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
// Claude implementations
// ============================================================
async function claudeChat(messages: ChatCompletionMessageParam[], systemInstruction: string) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not configured');

  console.log('[Claude Chat] Starting...');

  // Convert OpenAI message format to Claude format
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemInstruction,
    messages: claudeMessages,
    temperature: 0.5,
  });

  const content = response.content[0]?.type === 'text' ? response.content[0].text : null;
  if (!content) throw new Error('No content received from Claude');

  console.log('[Claude Chat] Success');
  return { content };
}

async function claudeAnalyze(prompt: string, systemInstruction: string) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not configured');

  console.log('[Claude Analyze] Starting...');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    system: systemInstruction,
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
  });

  const content = response.content[0]?.type === 'text' ? response.content[0].text : null;
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
