'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateChatResponse(messages: any[], systemInstruction: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages,
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });
    return { content: completion.choices[0]?.message?.content || 'Không nhận được phản hồi.' };
  } catch (error: any) {
    console.error('OpenAI Chat error:', error);
    return { error: error.message || 'Lỗi kết nối OpenAI' };
  }
}

export async function generateAnalyzeResponse(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia Thần Số Học hành vi. Phân tích sâu, chi tiết, dùng tiếng Việt, bám sát rule engine.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 2500,
    });
    return { content: completion.choices[0]?.message?.content || 'Không nhận được phân tích.' };
  } catch (error: any) {
    console.error('OpenAI Analyze error:', error);
    return { error: error.message || 'Lỗi phân tích' };
  }
}
