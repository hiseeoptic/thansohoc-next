// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { numbers, language, sheetMeanings } = await req.json();

    // Tạo prompt chi tiết cho phân tích liên kết (dựa trên logic cũ của bạn)
    const prompt = `
Phân tích mối liên kết Thần số học giữa các số: ${numbers.join(', ')}.

Ngôn ngữ trả lời: ${language === 'vi' ? 'Tiếng Việt' : 'English'}

Ý nghĩa cơ bản từ Google Sheet (dùng để tham khảo):
${sheetMeanings ? JSON.stringify(sheetMeanings, null, 2) : 'Không có dữ liệu sheet'}

Cấu trúc trả lời:
1. Mối quan hệ tổng thể (Đồng hướng / Tương phản / Bổ sung / Trung tính)
2. Điểm mạnh & thách thức
3. Lời khuyên thực tế
4. Tiềm năng phát triển chung
5. Gợi ý ứng dụng (tình yêu, công việc, gia đình...)

Trả lời sâu sắc, truyền cảm hứng, không chung chung.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.65,
      max_tokens: 1800,
    });

    return NextResponse.json({
      aiContent: completion.choices[0]?.message?.content || '',
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}