// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, context, language } = await req.json();

    // Xây dựng system prompt (dựa trên ngôn ngữ và context từ sharedResults)
    const systemPrompt = `
Bạn là trợ lý Thần Số Học chuyên sâu, trả lời bằng tiếng ${language === 'vi' ? 'Việt' : 'Anh'}.
Context thông tin chỉ số của người dùng:
${context || 'Không có thông tin cụ thể'}

Hãy trả lời chính xác, sâu sắc, mang tính hướng dẫn và truyền cảm hứng. Không lan man.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',          // rẻ + nhanh, hoặc đổi thành 'gpt-4o' nếu muốn chất lượng cao hơn
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiReply = completion.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ content: aiReply });
  } catch (error: any) {
    console.error('OpenAI error:', error);
    return NextResponse.json(
      { error: 'Lỗi kết nối với OpenAI: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}