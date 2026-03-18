// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numbers, language, sheetMeanings } = body;

    // Kiểm tra key tồn tại (rất quan trọng)
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set in environment');
      return NextResponse.json({ error: 'API key chưa được cấu hình trên server' }, { status: 500 });
    }

    // Xây dựng prompt chi tiết hơn (dựa trên logic cũ của anh)
    const sheetContext = sheetMeanings
      ? numbers
          .map((num: number) => {
            const meaning = sheetMeanings.find((m: any) => m.number === num)?.meaning || 'Không có ý nghĩa';
            return `Số ${num}: ${meaning}`;
          })
          .join('\n')
      : 'Không có dữ liệu ý nghĩa từ sheet';

    const prompt = `
Bạn là chuyên gia Thần Số Học hành vi với hơn 30 năm kinh nghiệm. Phân tích liên kết giữa các số: ${numbers.join(', ')}.

Ngôn ngữ trả lời: ${language === 'vi' ? 'Tiếng Việt' : 'English'}

Ý nghĩa cơ bản từ dữ liệu:
${sheetContext}

**RULE ENGINE - STRICT MODE (bắt buộc tuân thủ):**
- Chỉ trả lời liên quan Thần Số Học, phát triển bản thân, sự nghiệp, tình cảm, gia đình.
- Tránh mê tín, tập trung tâm lý học hành vi, ví dụ thực tế (công việc, mối quan hệ, tài chính).
- Cấu trúc trả lời bắt buộc:
  1. Mối quan hệ tổng thể (Đồng hướng / Tương phản / Bổ sung / Trung tính / Lỗi)
  2. Điểm mạnh chung & điểm xung đột tiềm ẩn
  3. Lời khuyên thực tế (ít nhất 2-3 giải pháp, ưu tiên Giải pháp 1 quan trọng nhất)
  4. Tiềm năng phát triển & ứng dụng (tình yêu, công việc, gia đình...)
  5. Lưu ý tránh (những điều dễ sai theo năng lượng số)

Phân tích sâu, chi tiết, dùng ví dụ cụ thể từ đời sống. Không chung chung. Trả lời bằng HTML sạch (h3, p, ul, li, strong).
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Rẻ, nhanh, đủ mạnh cho phân tích
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5, // Giảm để nhất quán hơn
      max_tokens: 2000,
    });

    const aiContent = completion.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.';

    return NextResponse.json({ aiContent });
  } catch (error: any) {
    console.error('Analyze API error:', error.message || error);
    return NextResponse.json(
      { error: 'Lỗi phân tích: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
