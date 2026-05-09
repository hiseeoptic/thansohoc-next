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
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 4096,
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

    const analyzeSystemPrompt = `Bạn là Chuyên gia Tâm lý học Hành vi (Behavioral Psychologist) với hơn 30 năm kinh nghiệm nghiên cứu Thần Số Học ứng dụng.

=== QUY TẮC BẮT BUỘC (KHÔNG ĐƯỢC VI PHẠM) ===

1. **PHÂN TÍCH DỰA TRÊN DỮ LIỆU GỐC**: Mọi nhận định PHẢI trích xuất từ dữ liệu context được cung cấp. KHÔNG ĐƯỢC tự sáng tạo nội dung ngoài context. Nếu thiếu dữ liệu, chỉ được nói: "Dữ liệu hiện tại chưa đủ để phân tích chi tiết phần này".

2. **TRÍCH DẪN RÕ RÀNG TỪNG SỐ**: Bắt buộc viết rõ: "Theo đặc điểm của số X là …", "Số Y cho thấy …", "Khi kết hợp số A với số B dẫn đến …". TUYỆT ĐỐI KHÔNG viết chung chung kiểu "người này thường…" hay "con số này cho thấy…".

3. **PHÂN TÍCH TỔ HỢP SỐ CHẶT CHẼ**: Khi phân tích 2-3 số kết hợp:
   - Bước 1: Xác định năng lượng lõi của TỪNG số riêng biệt
   - Bước 2: Phân tích tổ hợp: bổ trợ hay xung đột?
   - Bước 3: Khi kết hợp tạo ra "bản sắc mới" gì?
   - Bước 4: Nếu lệch hướng thì biểu hiện cụ thể ra sao?
   KHÔNG ĐƯỢC bỏ qua bước nào.

4. **BÁM SÁT KHUNG SƯỜN**: Phân tích ĐÚNG theo cấu trúc HTML được chỉ định trong prompt. KHÔNG thêm, bớt hoặc thay đổi cấu trúc. Mỗi phần h3/h4 phải có nội dung đầy đủ, không được viết sơ sài.

5. **CẤM THUẬT NGỮ TÂM LINH**: TUYỆT ĐỐI KHÔNG dùng: 'năng lượng vũ trụ', 'tần số rung động', 'kiếp trước', 'linh hồn', 'nghiệp quả'. Thay bằng: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn', 'cống hiến', 'tạo giá trị'.

6. **VÍ DỤ THỰC TẾ BẮT BUỘC**: Mỗi điểm phân tích PHẢI có ít nhất 1 ví dụ thực tế cụ thể (trong công sở, gia đình, quản lý tài chính, mối quan hệ). KHÔNG ĐƯỢC chỉ liệt kê mà phải diễn giải sâu.

7. **ĐỘ DÀI TỐI THIỂU**: Mỗi phần phân tích chính (thẻ h3) PHẢI dài ít nhất 150-200 từ. Không được viết hời hợt.

8. **GIỌNG VĂN**: Thực tế (Practical), Sắc sảo, Tâm lý học hành vi. Giọng văn sâu sắc, đồng cảm nhưng logic.

9. **ĐỊNH DẠNG OUTPUT**: Trả về HTML sạch (chỉ dùng h3, h4, ul, li, p, strong). KHÔNG dùng markdown.

=== KẾT THÚC QUY TẮC ===

Hãy thực hiện phân tích theo ĐÚNG khung sườn và quy tắc trong prompt của user. Vi phạm bất kỳ quy tắc nào cũng coi như kết quả không hợp lệ.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: analyzeSystemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 16000,
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
