import React, { useState, useRef, useEffect } from 'react';
import { CalculationResult, SheetMeaning } from '@/types';
import { getMeaning } from '@/services/googleSheetService';
import { Send, X, Bot, User, ChevronUp, ChevronDown } from 'lucide-react';
import { generateChatResponse } from '@/actions/openai';
import { deepNumberKnowledge } from '@/utils/deepNumberKnowledge';
interface ChatbotProps {
  sharedResults: CalculationResult | null;
  sheetData: SheetMeaning[];
  onClose: () => void;
  language: 'vi' | 'en';
}

interface Message {
  role: 'user' | 'assistant'; // Đổi "ai" thành "assistant" để khớp OpenAI SDK
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ sharedResults, sheetData, onClose, language }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: language === 'vi' ? 'Xin chào! Tôi là trợ lý Thần Số Học AI. Tôi có thể giúp bạn giải đáp thắc mắc về các chỉ số của bạn hoặc định hướng công việc phù hợp. Bạn muốn hỏi gì?' : 'Hello! I am the Numerology AI Assistant. I can help you with questions about your indicators or career guidance. What would you like to ask?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) {
      const errorMsg = language === 'vi' ? 'Vui lòng nhập câu hỏi.' : 'Please enter a question.';
      const errorMessage: Message = { role: 'assistant', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // === XÂY DỰNG CONTEXT TỪ SHARED RESULTS + DEEP KNOWLEDGE ===
      let context = '';
      let deepContext = '';

      if (sharedResults) {
        // Context cơ bản từ Sheet
        context = `
=== THÔNG TIN CHỈ SỐ NGƯỜI DÙNG (BẮT BUỘC SỬ DỤNG) ===
- Đường Đời (Life Path): ${sharedResults.lifePath} - Ý nghĩa: ${getMeaning(sheetData, 'lifePath', sharedResults.lifePath, language)}
- Sứ Mệnh (Mission): ${sharedResults.missionNumber} - Ý nghĩa: ${getMeaning(sheetData, 'missionNumber', sharedResults.missionNumber, language)}
- Nội Tâm (Soul/Heart Desire): ${sharedResults.heartDesire} - Ý nghĩa: ${getMeaning(sheetData, 'heartDesire', sharedResults.heartDesire, language)}
- Nhân Cách (Personality): ${sharedResults.personalityNumber}
- Thái Độ (Attitude): ${sharedResults.attitudeNumber}
- Trưởng Thành (Maturity): ${sharedResults.maturityNumber}
- Trí Tuệ (Intelligence): ${sharedResults.intelligenceNumber}
- Năm cá nhân hiện tại: ${sharedResults.personalYear}

BẮT BUỘC: Sử dụng thông tin trên để phân tích. KHÔNG được hỏi lại chỉ số.
=== KẾT THÚC THÔNG TIN CHỈ SỐ ===`;

        // Inject deepNumberKnowledge cho TẤT CẢ các chỉ số
        const relevantNumbers = [
          sharedResults.lifePath,
          sharedResults.missionNumber,
          sharedResults.heartDesire,
          sharedResults.personalityNumber,
          sharedResults.attitudeNumber,
          sharedResults.maturityNumber,
          sharedResults.intelligenceNumber
        ];
        const uniqueNumbers = [...new Set(relevantNumbers)];

        deepContext = uniqueNumbers.map(num => {
          const profile = deepNumberKnowledge[num.toString()];
          if (!profile) return '';
          return `
=== SỐ ${num} — ${profile.name} ===
Thông điệp: ${profile.coreMessage || ''}
Từ khóa: ${profile.keywords.join(', ')}
Ưu điểm: ${profile.advantages}
Thách thức: ${profile.challenges}
Cân bằng: ${profile.balance}
Nghề nghiệp: ${profile.careerSuggestions}
=== KẾT THÚC SỐ ${num} ===`;
        }).filter(Boolean).join('\n');
      } else {
        context = language === 'vi'
          ? 'Người dùng chưa tra cứu chỉ số. Yêu cầu họ quay lại phần tra cứu trước.'
          : 'User has not queried indicators yet. Ask them to go back to the query section.';
      }

      // === SYSTEM INSTRUCTION - CẤU TRÚC RÕ RÀNG VỚI THỨ TỰ ƯU TIÊN ===
      const langDirective = language === 'en'
        ? '\n=== LANGUAGE DIRECTIVE ===\nYou MUST respond ENTIRELY in English. All analysis, solutions, and examples must be in English.\n=== END LANGUAGE DIRECTIVE ===\n'
        : '';

      const systemInstruction = `=== VAI TRÒ ===
Bạn là Chuyên gia Tâm lý học Hành vi và Thần Số Học ứng dụng với hơn 30 năm kinh nghiệm.
${langDirective}
=== QUY TẮC BẮT BUỘC (STRICT MODE - KHÔNG ĐƯỢC VI PHẠM) ===

**QT1 - PHẠM VI:** CHỈ trả lời về Thần Số Học, phát triển bản thân, sự nghiệp, mối quan hệ, ý nghĩa con số. Nếu câu hỏi KHÔNG liên quan → từ chối lịch sự: “${language === 'en' ? 'Sorry, I can only answer questions about Numerology and life guidance.' : 'Xin lỗi, tôi chỉ có thể giải đáp về Thần Số Học và định hướng cuộc sống.'}”

**QT2 - BÁM SÁT DỮ LIỆU:** Mọi phân tích PHẢI dựa trên dữ liệu chỉ số và kiến thức sâu được cung cấp bên dưới. PHẢI trích dẫn cụ thể: “Với Đường Đời số X, đặc điểm Y cho thấy...”, “Số Sứ Mệnh Z của bạn có ưu điểm là...”. TUYỆT ĐỐI KHÔNG viết chung chung.

**QT3 - PHÂN TÍCH TỔ HỢP:** Khi user hỏi, PHẢI phân tích sự TƯƠNG TÁC giữa các chỉ số (Đường Đời + Sứ Mệnh + Nội Tâm...), không chỉ mô tả từng số riêng lẻ. Chỉ rõ: bổ trợ hay xung đột? Tạo bản sắc mới gì?

**QT4 - GIẢI PHÁP CỤ THỂ:** Mọi câu trả lời PHẢI có:
- Tối thiểu 2-3 giải pháp xếp theo thứ tự ưu tiên
- Giải thích VÌ SAO phù hợp với đặc điểm số của họ
- Ví dụ thực tế cụ thể (công việc, tình huống đời sống)

**QT5 - HỎI NGƯỢC:** Nếu câu hỏi chưa đủ bối cảnh, hỏi ngược 1-2 câu trước khi tư vấn sâu:
- Nghề nghiệp → “Bạn muốn kinh doanh, làm thuê hay phát triển cá nhân?”
- Tình cảm → “Tình trạng hiện tại? Đang yêu, giận nhau, hay muốn tìm hiểu?”
- Con cái → “Con ở độ tuổi nào? Gặp vấn đề gì?”
- Sales → “Sản phẩm cụ thể là gì?”

**QT6 - PHONG CÁCH:** Giọng văn thực tế, sâu sắc, đồng cảm nhưng logic. KHÔNG mê tín. KHÔNG dùng: 'năng lượng vũ trụ', 'rung động', 'kiếp trước'. THAY bằng: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn'.

**QT7 - LỊCH SỬ:** Luôn xem lịch sử chat để tiếp nối, không lặp lại. Liên kết tự nhiên với nội dung trước đó.

=== FORMAT TRẢ LỜI ===
📊 PHÂN TÍCH THEO CHỈ SỐ
(Trích dẫn cụ thể từng số liên quan, phân tích tổ hợp)

💡 GIẢI PHÁP ƯU TIÊN
Giải pháp 1 (quan trọng nhất):
- Vì sao phù hợp với số X của bạn:
- Cách thực hiện cụ thể:

Giải pháp 2:
- Vì sao phù hợp:
- Cách thực hiện:

⚠️ LƯU Ý TRÁNH
(Những điều đặc điểm số này dễ mắc phải)

=== DỮ LIỆU CHỈ SỐ NGƯỜI DÙNG ===
${context}

=== KIẾN THỨC SÂU VỀ CÁC CON SỐ (BẮT BUỘC SỬ DỤNG) ===
${deepContext}

=== HƯỚNG DẪN SỬ DỤNG DỮ LIỆU ===
Khi trả lời, bạn PHẢI:
1. Trích dẫn CỤ THỂ từ "KIẾN THỨC SÂU" ở trên: ưu điểm, thách thức, chiến lược cân bằng, gợi ý nghề nghiệp
2. Viết rõ: "Với Đường Đời số X, ưu điểm của bạn là [trích từ dữ liệu]...", "Thách thức số Y là [trích]..."
3. Phân tích TỔ HỢP: "Khi kết hợp Đường Đời X (đặc điểm: ...) với Sứ Mệnh Y (đặc điểm: ...) → tạo ra..."
4. KHÔNG ĐƯỢC viết chung chung mà không dẫn chứng từ dữ liệu
=== KẾT THÚC HƯỚNG DẪN ===`;

      console.log('[Chatbot] System Instruction length:', systemInstruction.length);

      // Gửi messages KHÔNG trùng lặp context
      const result = await generateChatResponse(
        messages.concat(userMessage),
        systemInstruction
      );

      console.log('📥 [Chatbot] Kết quả Server Action:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.content) {
        throw new Error('Không nhận được nội dung từ AI');
      }

      const aiMessage: Message = { role: 'assistant', content: result.content };
      setMessages(prev => [...prev, aiMessage]);
      console.log('✅ [Chatbot] Đã thêm tin nhắn AI thành công');

    } catch (error: any) {
      console.error('❌ [Chatbot] Lỗi handleSend:', error);
      const errorMsg = language === 'vi' 
        ? `Lỗi kết nối AI: ${error.message || 'Vui lòng thử lại sau.'}` 
        : `AI connection error: ${error.message || 'Please try again later.'}`;
      const errorMessage: Message = { role: 'assistant', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      console.log('🔄 [Chatbot] isLoading reset');
    }
  };

  // Phần return giữ nguyên hoàn toàn (UI, indicators, guide, input...)
  return (
    <div className="flex flex-col h-[80vh]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-green-200">Chatbot Thần Số Học</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>

      {/* Phần hiển thị chỉ số tra cứu – giữ nguyên */}
      <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 border border-green-500/20 mb-4">
        <button 
          onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
          className="w-full flex justify-between items-center font-bold text-green-200 mb-2"
        >
          {language === 'vi' ? 'Chỉ Số Tra Cứu Của Bạn' : 'Your Lookup Indicators'}
          {isIndicatorsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isIndicatorsOpen && (
          <>
            {sharedResults ? (
              <ul className="space-y-1">
                <li><strong>{language === 'vi' ? 'Đường Đời (Life Path):' : 'Life Path:'}</strong> {sharedResults.lifePath}</li>
                <li><strong>{language === 'vi' ? 'Sứ Mệnh (Mission):' : 'Mission:'}</strong> {sharedResults.missionNumber}</li>
                <li><strong>{language === 'vi' ? 'Nội Tâm (Soul/Heart Desire):' : 'Soul/Heart Desire:'}</strong> {sharedResults.heartDesire}</li>
                <li><strong>{language === 'vi' ? 'Nhân Cách (Personality):' : 'Personality:'}</strong> {sharedResults.personalityNumber}</li>
                <li><strong>{language === 'vi' ? 'Thái Độ (Attitude):' : 'Attitude:'}</strong> {sharedResults.attitudeNumber}</li>
                <li><strong>{language === 'vi' ? 'Trưởng Thành (Maturity):' : 'Maturity:'}</strong> {sharedResults.maturityNumber}</li>
                <li><strong>{language === 'vi' ? 'Trí Tuệ (Intelligence):' : 'Intelligence:'}</strong> {sharedResults.intelligenceNumber}</li>
                <li><strong>{language === 'vi' ? 'Năm Cá Nhân:' : 'Personal Year:'}</strong> {sharedResults.personalYear}</li>
              </ul>
            ) : (
              <p>{language === 'vi' ? 'Bạn chưa tra cứu chỉ số. Hãy quay lại phần Tra Cứu để tính toán trước khi hỏi.' : 'You haven\'t looked up indicators yet. Please go back to the Query section to calculate first.'}</p>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-black/50 p-4 rounded-lg space-y-4 text-base leading-relaxed">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-4 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-900/50 text-right' : 'bg-green-900/50 text-left'}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="text-center">Đang suy nghĩ...</div>}
      </div>

      <div className="mt-4 flex gap-2 flex-col">
        <div className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-black/30 p-3 rounded-lg border border-white/10"
            placeholder={language === 'vi' ? "Hỏi về chỉ số của bạn..." : "Ask about your indicators..."}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="bg-green-600 p-3 rounded-lg"><Send size={16} /></button>
        </div>

        {/* Phần hướng dẫn đặt câu hỏi – giữ nguyên */}
        <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 border border-blue-500/20 mt-2">
          <button 
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex justify-between items-center font-bold text-blue-200 mb-2"
          >
            {language === 'vi' ? 'HƯỚNG DẪN ĐẶT CÂU HỎI' : 'QUESTION GUIDANCE'}
            {isGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isGuideOpen && (
            <div>
              - {language === 'vi' ? 'Chỉ rõ bộ số (Chủ đạo, Nội tâm, Sứ mệnh...).' : 'Specify the number set (Main, Inner, Mission...).'}<br/>
              - {language === 'vi' ? 'Bối cảnh: Nghề nghiệp? Tình yêu? Gia đình?' : 'Context: Career? Love? Family?'}<br/>
              - {language === 'vi' ? 'Tình trạng hiện tại và mục tiêu.' : 'Current status and goals.'}<br/>
              <p className="mt-2">{language === 'vi' ? 'Ví dụ:' : 'Examples:'}</p>
              - {language === 'vi' ? '“Số chủ đạo 1, nội tâm 2. Kinh doanh mỹ phẩm online, chiến lược nào?”' : '“Main number 1, inner 2. Online cosmetics business, what strategy?”'}<br/>
              - {language === 'vi' ? '“Số 5, người yêu số 2, đang giận. Hàn gắn thế nào?”' : '“Number 5, lover number 2, angry. How to reconcile?”'}<br/>
              - {language === 'vi' ? '“Khách hàng số 4, bán bất động sản, tư vấn hướng nào?”' : '“Customer number 4, selling real estate, what advice?”'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
