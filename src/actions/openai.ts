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

export async function generateAnalyzeResponse(prompt: string, systemInstruction?: string) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured on the server');
    }

    console.log('[Analyze Response] Starting OpenAI call...');

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
   - Bước 4: Phân tích 5 lớp: Core (bản chất mới) → Mechanism (cách vận hành) → Power (sức mạnh) → Shadow (lệch hướng) → Evolution (phát triển)
   - Bước 5: Sinh kịch bản 3 trạng thái (đúng hướng / lệch / trưởng thành)

4. TỶ TRỌNG: 80% logic phân tích năng lượng từ dữ liệu + 20% pattern tăng cường. KHÔNG ĐẢO NGƯỢC.

5. PHẢI ĐƯA VÍ DỤ THỰC TẾ CỤ THỂ (công việc, tài chính, mối quan hệ, gia đình) cho MỖI điểm phân tích. KHÔNG viết chung chung.

6. CẤM thuật ngữ tâm linh: 'năng lượng vũ trụ', 'tần số rung động', 'kiếp trước', 'linh hồn', 'chữa lành'. Thay bằng: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn', 'cống hiến'.

7. GIỌNG VĂN: Thực tế, sắc sảo, tâm lý học hành vi. KHÔNG mơ hồ, KHÔNG lý tưởng hóa.

8. FORMAT: HTML sạch (h3, h4, ul, li, p, strong). KHÔNG markdown.

9. MỖI phần h3 phải dài ít nhất 150-200 từ với diễn giải sâu.

10. PHẦN "BÀI HỌC NHÂN – DUYÊN – QUẢ" phải phân tích tổ hợp số KĨ LƯỠNG với ví dụ lệch hướng cụ thể (đào hoa, mạo hiểm tài chính, lệ thuộc cảm xúc...).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemInstruction || defaultSystem,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_completion_tokens: 16384,
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
