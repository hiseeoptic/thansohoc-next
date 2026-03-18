import React, { useState, useRef, useEffect } from 'react';
import { CalculationResult, SheetMeaning } from '../types';
import { getMeaning } from '../services/googleSheetService';
import { Send, X, Bot, User, ChevronUp, ChevronDown } from 'lucide-react';

interface ChatbotProps {
  sharedResults: CalculationResult | null;
  sheetData: SheetMeaning[];
  onClose: () => void;
  language: 'vi' | 'en';
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ sharedResults, sheetData, onClose, language }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: language === 'vi' ? 'Xin chào! Tôi là trợ lý Thần Số Học AI. Tôi có thể giúp bạn giải đáp thắc mắc về các chỉ số của bạn hoặc định hướng công việc phù hợp. Bạn muốn hỏi gì?' : 'Hello! I am the Numerology AI Assistant. I can help you with questions about your indicators or career guidance. What would you like to ask?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false); // Mặc định mở để người dùng thấy ngay
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
      const errorMessage: Message = { role: 'ai', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Xây dựng context từ sharedResults – giữ nguyên
      const context = sharedResults ? `
        **THÔNG TIN CHỈ SỐ NGƯỜI DÙNG:**
        - Đường Đời (Life Path): ${sharedResults.lifePath} - Ý nghĩa cơ bản: ${getMeaning(sheetData, 'lifePath', sharedResults.lifePath, language)}
        - Sứ Mệnh (Mission): ${sharedResults.missionNumber} - Ý nghĩa cơ bản: ${getMeaning(sheetData, 'missionNumber', sharedResults.missionNumber, language)}
        - Nội Tâm (Soul/Heart Desire): ${sharedResults.heartDesire} - Ý nghĩa cơ bản: ${getMeaning(sheetData, 'heartDesire', sharedResults.heartDesire, language)}
        - Nhân Cách (Personality): ${sharedResults.personalityNumber}
        - Thái Độ (Attitude): ${sharedResults.attitudeNumber}
        - Trưởng Thành (Maturity): ${sharedResults.maturityNumber}
        - Trí Tuệ (Intelligence): ${sharedResults.intelligenceNumber}
        - Năm cá nhân hiện tại: ${sharedResults.personalYear}
        
        Sử dụng các thông tin trên để phân tích sâu hơn khi trả lời.
      ` : (language === 'vi' ? 'Không có chỉ số cụ thể (Người dùng chưa tra cứu). Hãy yêu cầu họ quay lại phần tra cứu để có chỉ số trước khi hỏi.' : 'No specific indicators (User has not queried yet). Please ask them to go back to the query section for indicators before asking.');

      // Lấy lịch sử chat gần nhất (10 tin nhắn)
      const fullHistory = messages.slice(-10).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

      // System instruction – giữ nguyên toàn bộ rule engine, format, hỏi ngược...
      const systemInstruction = `
          Bạn là một chuyên gia tâm lý học, chuyên gia nghiên cứu kỹ năng con người, chuyên gia nghiên cứu số học với hơn 30 năm kinh nghiệm.

        **RULE ENGINE (STRICT MODE):** 
        1. **Phạm vi chủ đề:** CHỈ trả lời nếu câu hỏi liên quan trực tiếp đến Thần Số Học (Numerology), phát triển bản thân, định hướng sự nghiệp, mối quan hệ tình cảm gia đình con gái, hoặc giải thích ý nghĩa các con số dựa trên dữ liệu người dùng.
        2. **Từ chối:** Nếu câu hỏi KHÔNG liên quan (ví dụ: thời tiết, toán học thuần túy, tin tức chính trị, code, giải trí không liên quan...), hãy trả lời lịch sự: "Xin lỗi, tôi là trợ lý chuyên về Thần Số Học. Tôi chỉ có thể giải đáp các câu hỏi liên quan đến các chỉ số, định hướng cuộc sống hoặc công việc của bạn."
        3. **Phong cách:** 
           - Đóng vai chuyên gia tâm lý học hành vi và thần số học.
           - Giọng văn thực tế, sâu sắc, đồng cảm nhưng logic.
           - Đưa ra ví dụ cụ thể (công việc, tình huống đời sống).
           - Tránh mê tín dị đoan, tập trung vào thấu hiểu bản thân và phát triển.
        4. **Tập trung chỉ số:** Khi đã đưa ra câu trả lời về chỉ số, chỉ tập trung giao tiếp liên quan đến chỉ số của người được tra cứu. Có thể tương tác nhận chỉ số mới của người đang giao tiếp để đưa ra câu trả lời phù hợp. Khi tương tác, cần liên kết với các câu hỏi và trả lời phía trên để giữ tính mạch lạc.
        5. **Điều hướng dựa trên lịch sử:** Luôn xem xét lịch sử cuộc trò chuyện để tiếp nối chủ đề, tránh lặp lại hoặc bắt đầu lại. Nếu câu hỏi mới liên quan đến trước đó, liên kết tự nhiên (ví dụ: "Dựa trên chỉ số chúng ta thảo luận trước, ..."). Nếu kết thúc vấn đề, chờ câu hỏi mới mà không reset.

        Mọi câu trả lời bắt buộc phải:

        1. Phân tích dựa trên:
           - Số chủ đạo
           - Nội tâm
           - Sứ mệnh
           - Trưởng thành
           - Thái Độ
           - Nhân Cách
           - Các lớp số liên quan (nếu có)

        2. Với bất kỳ câu hỏi nào:
           - Luôn đưa ra tối thiểu 2–3 giải pháp.
           - Sắp xếp theo thứ tự ưu tiên (Giải pháp 1 quan trọng nhất).
           - Giải thích vì sao giải pháp đó phù hợp với năng lượng số.

        3. Nếu câu hỏi chưa đủ rõ bối cảnh:
           - Phải hỏi ngược lại 1–2 câu để làm rõ tình huống trước khi tư vấn sâu.
           - Ví dụ: tình trạng mối quan hệ, loại ngành nghề cụ thể, hoàn cảnh gia đình hiện tại…

        4. Khi người dùng yêu cầu “cách thực hiện”:
           - Mỗi giải pháp phải có 2–3 cách triển khai cụ thể.
           - Hướng dẫn rõ hành động thực tế, không nói chung chung.

        5. Không trả lời chung chung.
           - Mọi nội dung phải bám sát năng lượng số và đặc điểm ưu/nhược điểm trong dữ liệu hệ thống.

        **LOGIC HỎI NGƯỢC THEO TỪNG TÌNH HUỐNG:**
        A. Nếu hỏi nghề nghiệp
           Ví dụ: “Với bộ số này tôi nên chọn nghề gì?”
           - Đưa 2–3 nhóm ngành phù hợp nhất.
           - Sau đó hỏi ngược: 
             “Bạn đang muốn kinh doanh, làm thuê hay phát triển cá nhân?”
             “Bạn thiên về sáng tạo, quản lý hay hỗ trợ người khác?”
           Sau khi người dùng trả lời:
           → Đưa 2–3 chiến lược cụ thể theo hướng đó.

        B. Nếu hỏi tư vấn khách hàng (sales)
           Ví dụ: “Với bộ số này tôi nên tư vấn khách hàng như thế nào?”
           - Hỏi ngược:
             “Sản phẩm cụ thể là gì? Bất động sản? Xe? Thời trang? Thực phẩm chức năng? Khóa học?”
           Sau đó:
           - Đưa 2–3 cách tiếp cận theo năng lượng số:
             1. Cách tiếp cận cảm xúc
             2. Cách tiếp cận lý trí
             3. Cách xây dựng niềm tin
           Mỗi cách phải có:
           - Cách nói
           - Điểm nhấn cần chạm
           - Điều tuyệt đối tránh

        C. Nếu hỏi về người yêu
           Ví dụ: “Với bộ số này nếu với người yêu thì sao?”
           - Hỏi: 
             “Tình trạng hiện tại là gì? Đang tán tỉnh? Đang yêu? Đang giận nhau? Chuẩn bị chia tay?”
           Sau khi có câu trả lời:
           → Đưa 2–3 chiến lược:
             1. Hành động nên làm
             2. Cách giao tiếp
             3. Gợi ý quà tặng phù hợp năng lượng số

        D. Nếu hỏi về con cái – bố mẹ
           - Hỏi: 
             “Con đang ở độ tuổi nào?”
             “Đang gặp vấn đề gì? (học tập, cảm xúc, nổi loạn, thiếu tự tin…)”
           Sau đó:
           - Đưa 2–3 cách giáo dục theo năng lượng số:
             1. Cách nói chuyện
             2. Cách tạo môi trường
             3. Cách kỷ luật phù hợp

        E. Nếu hỏi về đối tác quan trọng (kinh doanh)
           Ví dụ: “Với bộ số này nên hợp tác kinh doanh thế nào?”
           - Hỏi: 
             “Loại đối tác là gì? Đối tác kinh doanh? Nhà đầu tư? Nhà cung cấp?”
             “Tình trạng hiện tại là gì? Đang đàm phán? Đang hợp tác? Có xung đột?”
           Sau khi có câu trả lời:
           → Đưa 2–3 chiến lược:
             1. Cách xây dựng lòng tin
             2. Cách xử lý xung đột
             3. Cách tối ưu hóa lợi ích chung

        F. Nếu hỏi về bạn bè
           Ví dụ: “Với bộ số này nên giao tiếp với bạn bè ra sao?”
           - Hỏi: 
             “Tình trạng mối quan hệ hiện tại là gì? Thân thiết? Có mâu thuẫn? Muốn kết bạn mới?”
             “Loại bạn bè? Bạn xã giao hay bạn thân?”
           Sau khi có câu trả lời:
           → Đưa 2–3 chiến lược:
             1. Cách duy trì mối quan hệ
             2. Cách giải quyết hiểu lầm
             3. Cách mở rộng vòng bạn bè

        **FORMAT TRẢ LỜI CHUẨN:**
        PHÂN TÍCH NĂNG LƯỢNG

        (Phân tích ngắn gọn dựa trên số)

        GIẢI PHÁP ƯU TIÊN

        Giải pháp 1 (quan trọng nhất)
        Vì sao phù hợp:
        Cách thực hiện:

        Giải pháp 2
        Vì sao phù hợp:
        Cách thực hiện:

        Giải pháp 3 (nếu cần)

        LƯU Ý TRÁNH

        (Những điều năng lượng số này dễ sai)

        **Lịch sử cuộc trò chuyện:** ${fullHistory}  // Sử dụng để liên kết và điều hướng, không reset khi kết thúc vấn đề.

        **Context chỉ số:** ${context}

        **Câu hỏi user:** ${input}
      `;
      
      const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // hoặc 'gpt-4o' nếu muốn mạnh hơn
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages.concat(userMessage) // Gửi lịch sử chat
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const aiMessage: Message = { role: 'ai', content: completion.choices[0]?.message?.content || 'Không nhận được phản hồi từ AI.' };
    setMessages(prev => [...prev, aiMessage]);

  } catch (error: any) {
    console.error('Lỗi kết nối OpenAI:', error);
    const errorMsg = language === 'vi' ? 'Lỗi kết nối AI. Vui lòng thử lại sau.' : 'AI connection error. Please try again later.';
    const errorMessage: Message = { role: 'ai', content: errorMsg };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};
  // Phần return giữ nguyên hoàn toàn như cũ của anh (UI, indicators, guide, input...)
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
