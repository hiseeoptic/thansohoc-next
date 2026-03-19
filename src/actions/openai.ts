// src/actions/openai.ts
'use server';

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Kiểm tra key một lần khi khởi tạo (chỉ log server)
if (!process.env.OPENAI_API_KEY) {
  console.error('[Server Action] OPENAI_API_KEY is missing in environment variables');
}

export async function generateChatResponse(
  messages: ChatCompletionMessageParam[],
  systemInstruction: string
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured on the server');
    }

    console.log('[Chat Response] Starting OpenAI call...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Rẻ, nhanh, đủ mạnh cho app của anh
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 1500,
      // Nếu muốn streaming (text hiện dần), bật dòng dưới và xử lý stream ở client
      // stream: true,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('[Chat Response] Success');

    return { content };
  } catch (error: any) {
    console.error('[OpenAI Chat Action] Error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    return {
      error: error.message || 'Lỗi kết nối OpenAI. Vui lòng thử lại sau.',
    };
  }
}

export async function generateAnalyzeResponse(prompt: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured on the server');
    }

    console.log('[Analyze Response] Starting OpenAI call...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia Thần Số Học hành vi. Phân tích sâu, chi tiết, dùng tiếng Việt, bám sát rule engine và dữ liệu cung cấp.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('[Analyze Response] Success');

    return { content };
  } catch (error: any) {
    console.error('[OpenAI Analyze Action] Error:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    return {
      error: error.message || 'Lỗi phân tích. Vui lòng thử lại sau.',
    };
  }
}
