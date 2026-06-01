import React, { useState, useRef, useEffect } from 'react';
import { CalculationResult, SheetMeaning } from '@/types';
import { getMeaning } from '@/services/googleSheetService';
import { Send, X, Bot, User, ChevronUp, ChevronDown, Globe, UserPlus } from 'lucide-react';
import { generateChatResponse } from '@/actions/openai';
import { deepNumberKnowledge } from '@/utils/deepNumberKnowledge';
import * as Utils from '@/utils/numerologyUtils';

interface ChatbotProps {
  sharedResults: CalculationResult | null;
  sheetData: SheetMeaning[];
  onClose: () => void;
  language: 'vi' | 'en';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MyCalcResult {
  name: string;
  birthdate: string;
  lifePath: number;
  heartDesire: number;
  missionNumber: number;
  personalityNumber: number;
  attitudeNumber: number;
  maturityNumber: number;
  intelligenceNumber: number;
  balanceNumber: number;
}

const Chatbot: React.FC<ChatbotProps> = ({ sharedResults, sheetData, onClose, language: initialLanguage }) => {
  const [chatLang, setChatLang] = useState<'vi' | 'en'>(initialLanguage);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialLanguage === 'vi'
      ? 'Xin chào! Tôi là trợ lý Thần Số Học AI. Thông tin chỉ số được tra cứu mặc định là của khách hàng. Nếu bạn muốn hỏi tương tác về tình yêu hay công việc với người có chỉ số này, vui lòng cung cấp họ tên và ngày tháng năm sinh của bạn ở phần bên dưới. Bạn muốn hỏi gì?'
      : 'Hello! I am the Numerology AI Assistant. The queried indicators belong to the client by default. If you want to ask about love or work interactions with this person, please provide your own name and date of birth below. What would you like to ask?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // State cho thông tin cá nhân của người hỏi (để so sánh)
  const [isMyInfoOpen, setIsMyInfoOpen] = useState(false);
  const [myName, setMyName] = useState('');
  const [myDay, setMyDay] = useState('');
  const [myMonth, setMyMonth] = useState('');
  const [myYear, setMyYear] = useState('');
  const [myCalcResult, setMyCalcResult] = useState<MyCalcResult | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Tính toán chỉ số cho người hỏi
  const handleCalcMyNumbers = () => {
    if (!myName.trim() || !myDay || !myMonth || !myYear) return;

    const birthdate = `${myDay}-${myMonth}-${myYear}`;
    const lifePath = Utils.calculateLifePath(birthdate);
    const mission = Utils.calculateMissionNumber(myName);

    const result: MyCalcResult = {
      name: myName.toUpperCase(),
      birthdate,
      lifePath,
      heartDesire: Utils.calculateHeartDesire(myName),
      missionNumber: mission,
      personalityNumber: Utils.calculatePersonalityNumber(myName),
      attitudeNumber: Utils.calculateAttitudeNumber(birthdate),
      maturityNumber: Utils.calculateMaturityNumber(lifePath, mission),
      intelligenceNumber: Utils.calculateIntelligenceNumber(myName),
      balanceNumber: Utils.calculateBalanceNumber(myName),
    };

    setMyCalcResult(result);

    // Thêm thông báo vào chat
    const msg = chatLang === 'vi'
      ? `✅ Đã tính toán chỉ số của bạn (${myName.toUpperCase()}):\n• Đường Đời: ${result.lifePath}\n• Sứ Mệnh: ${result.missionNumber}\n• Nội Tâm: ${result.heartDesire}\n• Nhân Cách: ${result.personalityNumber}\n• Thái Độ: ${result.attitudeNumber}\n• Trưởng Thành: ${result.maturityNumber}\n• Trí Tuệ: ${result.intelligenceNumber}\n\nBây giờ tôi có thể so sánh và phân tích tương tác giữa bạn với khách hàng. Hãy đặt câu hỏi!`
      : `✅ Your indicators calculated (${myName.toUpperCase()}):\n• Life Path: ${result.lifePath}\n• Mission: ${result.missionNumber}\n• Soul: ${result.heartDesire}\n• Personality: ${result.personalityNumber}\n• Attitude: ${result.attitudeNumber}\n• Maturity: ${result.maturityNumber}\n• Intelligence: ${result.intelligenceNumber}\n\nNow I can compare and analyze interactions between you and the client. Ask away!`;

    setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
  };

  // Build deep context cho một bộ chỉ số
  const buildDeepContextFor = (numbers: number[]) => {
    const uniqueNumbers = [...new Set(numbers.filter(n => n))];
    return uniqueNumbers.map(num => {
      const profile = deepNumberKnowledge[num.toString()];
      if (!profile) return '';
      return `Số ${num} (${profile.name}): Keywords=[${profile.keywords.join(', ')}], Ưu điểm=[${profile.advantages.substring(0, 200)}], Thách thức=[${profile.challenges.substring(0, 200)}]`;
    }).filter(Boolean).join('\n');
  };

  const handleSend = async () => {
    if (!input.trim()) {
      const errorMsg = chatLang === 'vi' ? 'Vui lòng nhập câu hỏi.' : 'Please enter a question.';
      const errorMessage: Message = { role: 'assistant', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // === Context KHÁCH HÀNG (người được tra cứu) ===
      const clientDeepContext = sharedResults ? buildDeepContextFor([
        sharedResults.lifePath, sharedResults.missionNumber, sharedResults.heartDesire,
        sharedResults.personalityNumber, sharedResults.attitudeNumber, sharedResults.maturityNumber,
        sharedResults.intelligenceNumber
      ]) : '';

      const clientContext = sharedResults ? `
        **THÔNG TIN CHỈ SỐ KHÁCH HÀNG (người được tra cứu):**
        - Đường Đời (Life Path): ${sharedResults.lifePath} - Ý nghĩa: ${getMeaning(sheetData, 'lifePath', sharedResults.lifePath, chatLang)}
        - Sứ Mệnh (Mission): ${sharedResults.missionNumber} - Ý nghĩa: ${getMeaning(sheetData, 'missionNumber', sharedResults.missionNumber, chatLang)}
        - Nội Tâm (Soul/Heart Desire): ${sharedResults.heartDesire} - Ý nghĩa: ${getMeaning(sheetData, 'heartDesire', sharedResults.heartDesire, chatLang)}
        - Nhân Cách (Personality): ${sharedResults.personalityNumber}
        - Thái Độ (Attitude): ${sharedResults.attitudeNumber}
        - Trưởng Thành (Maturity): ${sharedResults.maturityNumber}
        - Trí Tuệ (Intelligence): ${sharedResults.intelligenceNumber}
        - Năm cá nhân hiện tại: ${sharedResults.personalYear}

        **KIẾN THỨC SÂU VỀ CÁC SỐ CỦA KHÁCH HÀNG:**
        ${clientDeepContext}
      ` : (chatLang === 'vi' ? 'Không có chỉ số khách hàng (chưa tra cứu).' : 'No client indicators (not queried yet).');

      // === Context NGƯỜI HỎI (nếu đã cung cấp thông tin) ===
      let myContext = '';
      if (myCalcResult) {
        const myDeepContext = buildDeepContextFor([
          myCalcResult.lifePath, myCalcResult.missionNumber, myCalcResult.heartDesire,
          myCalcResult.personalityNumber, myCalcResult.attitudeNumber, myCalcResult.maturityNumber,
          myCalcResult.intelligenceNumber
        ]);

        myContext = `
        **THÔNG TIN CHỈ SỐ NGƯỜI HỎI (${myCalcResult.name}):**
        - Đường Đời (Life Path): ${myCalcResult.lifePath}
        - Sứ Mệnh (Mission): ${myCalcResult.missionNumber}
        - Nội Tâm (Soul/Heart Desire): ${myCalcResult.heartDesire}
        - Nhân Cách (Personality): ${myCalcResult.personalityNumber}
        - Thái Độ (Attitude): ${myCalcResult.attitudeNumber}
        - Trưởng Thành (Maturity): ${myCalcResult.maturityNumber}
        - Trí Tuệ (Intelligence): ${myCalcResult.intelligenceNumber}
        - Cân Bằng (Balance): ${myCalcResult.balanceNumber}

        **KIẾN THỨC SÂU VỀ CÁC SỐ CỦA NGƯỜI HỎI:**
        ${myDeepContext}
        `;
      }

      // === Tổng hợp context ===
      const fullContext = myCalcResult
        ? `${clientContext}\n\n${myContext}\n\n**CHÚ Ý QUAN TRỌNG:** Có 2 BỘ CHỈ SỐ — KHÁCH HÀNG và NGƯỜI HỎI. Khi được hỏi về tương tác (tình yêu, công việc, gia đình, đối tác...), PHẢI SO SÁNH cả 2 bộ số, phân tích tương hợp/xung đột giữa 2 người dựa trên keywords, advantages, challenges của từng người. Nếu câu hỏi chỉ về khách hàng thì tập trung vào bộ số khách hàng.`
        : clientContext;

      // Lấy lịch sử chat gần nhất (10 tin nhắn)
      const fullHistory = messages.slice(-10).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

      // System instruction
      const systemInstruction = `
        ${chatLang === 'en' ? '⚠️ LANGUAGE RULE: You MUST respond ENTIRELY in English. All analysis, advice, examples must be in English.' : ''}
        Bạn là một chuyên gia tâm lý học, chuyên gia nghiên cứu kỹ năng con người, chuyên gia nghiên cứu số học với hơn 30 năm kinh nghiệm.

        **QUY TẮC VAI TRÒ QUAN TRỌNG:**
        - Thông tin chỉ số mặc định được tra cứu là của KHÁCH HÀNG (người khác), KHÔNG phải của người đang hỏi.
        - Nếu có 2 bộ chỉ số (KHÁCH HÀNG + NGƯỜI HỎI), hãy phân tích SO SÁNH khi được hỏi về tương tác.
        - Khi so sánh 2 người: phân tích tương hợp/xung đột từng cặp chỉ số (VD: Đường Đời A vs Đường Đời B), đưa ra lời khuyên cụ thể cho mối quan hệ.
        ${myCalcResult ? `- NGƯỜI HỎI đã cung cấp thông tin: ${myCalcResult.name}. Khi phân tích tương tác, gọi tên họ.` : '- NGƯỜI HỎI chưa cung cấp thông tin cá nhân. Nếu họ hỏi về tương tác (tình yêu, công việc, gia đình), hãy gợi ý họ cung cấp họ tên và ngày sinh ở phần "Thông tin của bạn" để có thể so sánh chính xác.'}

        **RULE ENGINE (STRICT MODE):**
        1. **Phạm vi chủ đề:** CHỈ trả lời nếu câu hỏi liên quan trực tiếp đến Thần Số Học (Numerology), phát triển bản thân, định hướng sự nghiệp, mối quan hệ tình cảm gia đình, hoặc giải thích ý nghĩa các con số dựa trên dữ liệu.
        2. **Từ chối:** Nếu câu hỏi KHÔNG liên quan, trả lời lịch sự: "Xin lỗi, tôi là trợ lý chuyên về Thần Số Học."
        3. **Phong cách:**
           - Đóng vai chuyên gia tâm lý học hành vi và thần số học.
           - Giọng văn thực tế, sâu sắc, đồng cảm nhưng logic.
           - Đưa ra ví dụ cụ thể (công việc, tình huống đời sống).
           - Tránh mê tín dị đoan, tập trung vào thấu hiểu bản thân và phát triển.
        4. **Tập trung chỉ số:** Khi đã đưa ra câu trả lời về chỉ số, chỉ tập trung giao tiếp liên quan đến chỉ số. Khi tương tác, cần liên kết với các câu hỏi và trả lời phía trên để giữ tính mạch lạc.
        5. **Điều hướng dựa trên lịch sử:** Luôn xem xét lịch sử cuộc trò chuyện để tiếp nối chủ đề, tránh lặp lại.
        Mọi câu trả lời bắt buộc phải:
        1. Phân tích dựa trên các chỉ số liên quan (Đường Đời, Nội tâm, Sứ mệnh, Nhân Cách, Thái Độ, Trưởng Thành, Trí Tuệ...).
        2. Luôn đưa ra tối thiểu 2–3 giải pháp, sắp xếp ưu tiên. Giải thích vì sao phù hợp với năng lượng số.
        3. Nếu câu hỏi chưa đủ rõ bối cảnh: hỏi ngược lại 1–2 câu để làm rõ.
        4. Khi người dùng yêu cầu "cách thực hiện": mỗi giải pháp có 2–3 cách triển khai cụ thể.
        5. Không trả lời chung chung. Mọi nội dung phải bám sát năng lượng số.

        **LOGIC HỎI NGƯỢC THEO TỪNG TÌNH HUỐNG:**
        A. Nếu hỏi nghề nghiệp → Đưa 2-3 nhóm ngành → Hỏi ngược: kinh doanh/làm thuê/phát triển cá nhân? Sáng tạo/quản lý/hỗ trợ?
        B. Nếu hỏi tư vấn khách hàng (sales) → Hỏi sản phẩm cụ thể → Đưa 3 cách tiếp cận (cảm xúc/lý trí/niềm tin)
        C. Nếu hỏi về người yêu → Hỏi tình trạng hiện tại → Đưa chiến lược (hành động/giao tiếp/quà tặng)
        D. Nếu hỏi con cái/bố mẹ → Hỏi độ tuổi + vấn đề → Đưa cách giáo dục theo số
        E. Nếu hỏi đối tác kinh doanh → Hỏi loại đối tác + tình trạng → Đưa chiến lược
        F. Nếu hỏi bạn bè → Hỏi tình trạng → Đưa chiến lược

        **FORMAT TRẢ LỜI CHUẨN:**
        PHÂN TÍCH NĂNG LƯỢNG (ngắn gọn dựa trên số)
        GIẢI PHÁP ƯU TIÊN (2-3 giải pháp, mỗi cái có: vì sao phù hợp + cách thực hiện)
        LƯU Ý TRÁNH (những điều năng lượng số này dễ sai)

        **Lịch sử cuộc trò chuyện:** ${fullHistory}
        **Context chỉ số:** ${fullContext}
        **Câu hỏi user:** ${input}
      `;

      console.log('[Chatbot] Gọi Server Action');

      const result = await generateChatResponse(
        messages.concat(userMessage),
        systemInstruction + '\n\n' + fullContext
      );

      if ('error' in result) {
        throw new Error(result.error);
      }

      if (!result.content) {
        throw new Error(chatLang === 'vi' ? 'Không nhận được nội dung từ AI' : 'No content received from AI');
      }

      const aiMessage: Message = { role: 'assistant', content: result.content };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('[Chatbot] Error:', error);
      const errorMsg = chatLang === 'vi'
        ? `Lỗi kết nối AI: ${error.message || 'Vui lòng thử lại sau.'}`
        : `AI connection error: ${error.message || 'Please try again later.'}`;
      const errorMessage: Message = { role: 'assistant', content: errorMsg };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-green-200">
          {chatLang === 'vi' ? 'Chatbot Thần Số Học' : 'Numerology Chatbot'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatLang(chatLang === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-green-400/50 transition-all"
            title={chatLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <Globe size={12} />
            {chatLang === 'vi' ? 'VI' : 'EN'}
          </button>
          <button onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      {/* Chỉ số KHÁCH HÀNG (người được tra cứu) */}
      <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 border border-green-500/20 mb-2">
        <button
          onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
          className="w-full flex justify-between items-center font-bold text-green-200 mb-1"
        >
          {chatLang === 'vi' ? '📋 Chỉ Số Khách Hàng (Đã Tra Cứu)' : '📋 Client Indicators (Queried)'}
          {isIndicatorsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isIndicatorsOpen && (
          <>
            {sharedResults ? (
              <ul className="space-y-1 mt-2">
                <li><strong>{chatLang === 'vi' ? 'Đường Đời:' : 'Life Path:'}</strong> {sharedResults.lifePath}</li>
                <li><strong>{chatLang === 'vi' ? 'Sứ Mệnh:' : 'Mission:'}</strong> {sharedResults.missionNumber}</li>
                <li><strong>{chatLang === 'vi' ? 'Nội Tâm:' : 'Soul:'}</strong> {sharedResults.heartDesire}</li>
                <li><strong>{chatLang === 'vi' ? 'Nhân Cách:' : 'Personality:'}</strong> {sharedResults.personalityNumber}</li>
                <li><strong>{chatLang === 'vi' ? 'Thái Độ:' : 'Attitude:'}</strong> {sharedResults.attitudeNumber}</li>
                <li><strong>{chatLang === 'vi' ? 'Trưởng Thành:' : 'Maturity:'}</strong> {sharedResults.maturityNumber}</li>
                <li><strong>{chatLang === 'vi' ? 'Trí Tuệ:' : 'Intelligence:'}</strong> {sharedResults.intelligenceNumber}</li>
                <li><strong>{chatLang === 'vi' ? 'Năm Cá Nhân:' : 'Personal Year:'}</strong> {sharedResults.personalYear}</li>
              </ul>
            ) : (
              <p className="mt-2">{chatLang === 'vi' ? 'Chưa tra cứu chỉ số. Hãy quay lại phần Tra Cứu.' : 'No indicators queried yet. Go back to Query section.'}</p>
            )}
          </>
        )}
      </div>

      {/* Thông tin NGƯỜI HỎI (để so sánh) */}
      <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 border border-purple-500/20 mb-4">
        <button
          onClick={() => setIsMyInfoOpen(!isMyInfoOpen)}
          className="w-full flex justify-between items-center font-bold text-purple-200 mb-1"
        >
          <span className="flex items-center gap-1.5">
            <UserPlus size={14} />
            {chatLang === 'vi' ? 'Thông Tin Của Bạn (Để So Sánh)' : 'Your Info (For Comparison)'}
          </span>
          {isMyInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {!isMyInfoOpen && !myCalcResult && (
          <p className="text-xs text-gray-500 mt-1 italic">
            {chatLang === 'vi'
              ? 'Cung cấp họ tên & ngày sinh của bạn để so sánh tương tác với khách hàng'
              : 'Provide your name & DOB to compare interactions with the client'}
          </p>
        )}

        {isMyInfoOpen && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {chatLang === 'vi' ? 'Họ và tên (không dấu):' : 'Full name (no accents):'}
              </label>
              <input
                type="text"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder={chatLang === 'vi' ? 'NGUYEN VAN A' : 'NGUYEN VAN A'}
                className="w-full bg-black/30 text-white p-2 rounded-lg border border-white/10 focus:border-purple-500 text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                {chatLang === 'vi' ? 'Ngày sinh (DD - MM - YYYY):' : 'Date of Birth (DD - MM - YYYY):'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={myDay}
                  onChange={(e) => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 31)) setMyDay(v); }}
                  placeholder={chatLang === 'vi' ? 'Ngày' : 'Day'}
                  min="1" max="31"
                  className="bg-black/30 text-white p-2 rounded-lg border border-white/10 focus:border-purple-500 text-sm text-center"
                />
                <input
                  type="number"
                  value={myMonth}
                  onChange={(e) => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 12)) setMyMonth(v); }}
                  placeholder={chatLang === 'vi' ? 'Tháng' : 'Month'}
                  min="1" max="12"
                  className="bg-black/30 text-white p-2 rounded-lg border border-white/10 focus:border-purple-500 text-sm text-center"
                />
                <input
                  type="number"
                  value={myYear}
                  onChange={(e) => { const v = e.target.value; if (v === '' || (v.length <= 4 && /^\d*$/.test(v))) setMyYear(v); }}
                  placeholder={chatLang === 'vi' ? 'Năm' : 'Year'}
                  className="bg-black/30 text-white p-2 rounded-lg border border-white/10 focus:border-purple-500 text-sm text-center"
                />
              </div>
            </div>
            <button
              onClick={handleCalcMyNumbers}
              disabled={!myName.trim() || !myDay || !myMonth || !myYear}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-all"
            >
              {chatLang === 'vi' ? 'Tính Toán Chỉ Số Của Tôi' : 'Calculate My Indicators'}
            </button>

            {/* Hiển thị kết quả đã tính */}
            {myCalcResult && (
              <div className="mt-2 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                <p className="font-semibold text-purple-200 mb-1 text-xs">
                  {chatLang === 'vi' ? `✅ Chỉ số của ${myCalcResult.name}:` : `✅ ${myCalcResult.name}'s indicators:`}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span><strong>{chatLang === 'vi' ? 'Đường Đời:' : 'Life Path:'}</strong> {myCalcResult.lifePath}</span>
                  <span><strong>{chatLang === 'vi' ? 'Sứ Mệnh:' : 'Mission:'}</strong> {myCalcResult.missionNumber}</span>
                  <span><strong>{chatLang === 'vi' ? 'Nội Tâm:' : 'Soul:'}</strong> {myCalcResult.heartDesire}</span>
                  <span><strong>{chatLang === 'vi' ? 'Nhân Cách:' : 'Personality:'}</strong> {myCalcResult.personalityNumber}</span>
                  <span><strong>{chatLang === 'vi' ? 'Thái Độ:' : 'Attitude:'}</strong> {myCalcResult.attitudeNumber}</span>
                  <span><strong>{chatLang === 'vi' ? 'Trưởng Thành:' : 'Maturity:'}</strong> {myCalcResult.maturityNumber}</span>
                  <span><strong>{chatLang === 'vi' ? 'Trí Tuệ:' : 'Intelligence:'}</strong> {myCalcResult.intelligenceNumber}</span>
                  <span><strong>{chatLang === 'vi' ? 'Cân Bằng:' : 'Balance:'}</strong> {myCalcResult.balanceNumber}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-black/50 p-4 rounded-lg space-y-4 text-base leading-relaxed">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-4 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-900/50 text-right' : 'bg-green-900/50 text-left'}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="text-center">{chatLang === 'vi' ? 'Đang suy nghĩ...' : 'Thinking...'}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4 flex gap-2 flex-col">
        <div className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-black/30 p-3 rounded-lg border border-white/10"
            placeholder={chatLang === 'vi' ? "Hỏi về chỉ số khách hàng hoặc so sánh..." : "Ask about client indicators or compare..."}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="bg-green-600 p-3 rounded-lg"><Send size={16} /></button>
        </div>

        {/* Hướng dẫn đặt câu hỏi */}
        <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 border border-blue-500/20 mt-2">
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex justify-between items-center font-bold text-blue-200 mb-2"
          >
            {chatLang === 'vi' ? 'HƯỚNG DẪN ĐẶT CÂU HỎI' : 'QUESTION GUIDANCE'}
            {isGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isGuideOpen && (
            <div className="space-y-2 text-xs leading-relaxed">
              {chatLang === 'vi' ? (
                <>
                  <p className="text-yellow-300 font-medium">📌 Thông tin được tra cứu mặc định là của khách hàng. Nếu bạn muốn hỏi tương tác về tình yêu hay công việc với người có chỉ số này, vui lòng cung cấp họ tên và ngày tháng năm sinh của bạn ở phần "Thông tin của bạn" phía trên.</p>
                  <p className="font-semibold text-gray-200">Ví dụ câu hỏi:</p>
                  <p>• "Khách hàng này phù hợp nghề gì?"</p>
                  <p>• "Tôi và khách hàng này có hợp nhau không? (tình yêu/công việc)"</p>
                  <p>• "Cách tư vấn bán hàng cho người này?"</p>
                  <p>• "Con cái người này nên được giáo dục thế nào?"</p>
                  <p>• "So sánh tương tác giữa tôi và người này trong kinh doanh"</p>
                </>
              ) : (
                <>
                  <p className="text-yellow-300 font-medium">📌 Queried indicators belong to the client by default. If you want to ask about love or work interactions with this person, provide your name and DOB in the "Your Info" section above.</p>
                  <p className="font-semibold text-gray-200">Example questions:</p>
                  <p>• "What career suits this client?"</p>
                  <p>• "Are we compatible? (love/work)"</p>
                  <p>• "How should I approach selling to this person?"</p>
                  <p>• "How should this person's children be educated?"</p>
                  <p>• "Compare my interaction with this person in business"</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
