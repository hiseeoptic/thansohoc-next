import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Zap, RefreshCw, Sparkles, BrainCircuit, Briefcase, GraduationCap, MessageCircle, Calendar, Mountain, AlertTriangle, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeConnectionLogic } from '@/utils/numerologyUtils';
import { ConnectionAnalysisResult, NumberType, SheetMeaning, CalculationResult } from '@/types';
import { fetchMeanings, getMeaning } from '../services/googleSheetService';
import Chatbot from './Chatbot';
import { OpenAI } from 'openai';
import { generateAnalyzeResponse } from '@/actions/openai';
import { deepNumberKnowledge } from '@/utils/deepNumberKnowledge';

interface ConnectionToolProps {
  sheetData: SheetMeaning[];
  sharedResults: CalculationResult | null;
  language: 'vi' | 'en';
}

// Thay bằng URL CSV public của Google Sheet "Subscriptions" (Publish to web > Sheet Subscriptions > CSV)
const SUBSCRIPTIONS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1-aRNnvyv70nx_dsrEOR1_nO3l6643LjOaQh6uHm6rpE/gviz/tq?tqx=out:csv&sheet=Subscriptions';

// --- Rule Engine: Kiểm soát đầu vào và chỉ thị AI (Mở rộng để hỗ trợ Trục Mới) ---
const ruleEngine = {
  validateInputs: (activeInputs: { type: NumberType, value: number }[]) => {
    // Rule 1: Validate giá trị (Chấp nhận 1-9 và Master Numbers)
    const validNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
    if (!activeInputs.every(i => validNumbers.includes(i.value))) {
      throw new Error('Invalid index. System only analyzes single digits (1-9) and Master Numbers (11, 22, 33). / Chỉ số không hợp lệ. Hệ thống chỉ phân tích các số đơn (1-9) và số Master (11, 22, 33).');
    }

    const types = activeInputs.map(i => i.type);
    const hasHeartDesire = types.includes(NumberType.HeartDesire);
    const hasPersonality = types.includes(NumberType.Personality);
    const hasAttitude = types.includes(NumberType.Attitude);
    const hasMaturity = types.includes(NumberType.Maturity);
    const hasMission = types.includes(NumberType.Mission);
    const hasLifePath = types.includes(NumberType.LifePath);

    // Rule 2: Xác định Combo Đặc Biệt cho Trục Cũ (Sứ Mệnh + Đường Đời [+ Nội Tâm])
    // Logic: Nếu 2 số: Phải là Mission + LifePath. Nếu 3 số: Phải là Mission + LifePath + HeartDesire.
    if (activeInputs.length === 2 && hasMission && hasLifePath) {
      return { comboType: 'coreMissionLife', isSpecial: true, axisCount: 0 };
    }
    if (activeInputs.length === 3 && hasMission && hasLifePath && hasHeartDesire) {
      return { comboType: 'coreMissionLife', isSpecial: true, axisCount: 0 };
    }

    // *** Bổ sung để ép phân tích kỹ cho 2 số trong trục đường đời + nội tâm + sứ mệnh ***
    // Giải thích: Nếu chỉ 2 số bất kỳ trong nhóm (Mission, LifePath, HeartDesire), vẫn dùng prompt sâu 'coreMissionLife' thay vì fallback 'basic'.
    const coreAxisCount = [hasMission, hasLifePath, hasHeartDesire].filter(Boolean).length;
    if (coreAxisCount >= 2) {
      return { comboType: 'coreMissionLife', isSpecial: true, axisCount: coreAxisCount };
    }

    // Rule 3: Xác định Combo Mới cho Trục Nội Tâm – Nhân Cách – Thái Độ – Trưởng Thành
    // Logic: Phát hiện nếu có Nội Tâm + ít nhất 1 trong (Nhân Cách, Thái Độ, Trưởng Thành).
    // Ưu tiên nếu có 3-4 chỉ số trong nhóm này.
    const newAxisCount = [hasHeartDesire, hasPersonality, hasAttitude, hasMaturity].filter(Boolean).length;
    if (hasHeartDesire && newAxisCount >= 2) {
      return { comboType: 'innerPersonalityAxis', isSpecial: true, axisCount: newAxisCount };
    }

    // *** Bổ sung thêm chỉ số Trí Tuệ cho trục innerPersonalityAxis ***
    // Giải thích: Thêm hasIntelligence vào newAxisCount để nếu có Nội Tâm + Trí Tuệ + các chỉ số khác, vẫn ưu tiên 'innerPersonalityAxis' và phân tích kỹ.
    const hasIntelligence = types.includes(NumberType.Intelligence); // Giả sử NumberType.Intelligence đã thêm
    const extendedNewAxisCount = [hasHeartDesire, hasPersonality, hasAttitude, hasMaturity, hasIntelligence].filter(Boolean).length;
    if (hasHeartDesire && extendedNewAxisCount >= 2) {
      return { comboType: 'innerPersonalityAxis', isSpecial: true, axisCount: extendedNewAxisCount };
    }

    // Nếu không khớp combo nào, fallback cơ bản
    return { comboType: 'basic', isSpecial: false, axisCount: 0 };
  },

 getPromptModifiers: (comboType: string, isSpecial: boolean, axisCount?: number) => {
    return `
      **CHỈ THỊ KIỂM SOÁT NỘI DUNG (RULE ENGINE - STRICT MODE):**
      1. **Độ dài & Chi tiết:** ${isSpecial ? 'BẮT BUỘC mỗi phần phân tích chính (thẻ h3) phải dài ít nhất 150-200 từ.' : 'Giữ phân tích ngắn gọn, súc tích, đi thẳng vào vấn đề.'} Hãy đưa ra ví dụ thực tế cụ thể (trong công sở, gia đình, quản lý tài chính...).
      2. **Cấm Thuật Ngữ Tâm Linh:** TUYỆT ĐỐI KHÔNG dùng các từ: 'năng lượng', 'tần số', 'rung động', 'vũ trụ', 'kiếp trước', 'linh hồn', 'chữa lành', 'phụng sự', 'nghiệp quả'.
      3. **Thay Thế Bằng Ngôn Ngữ Hành Vi:**
         - Thay 'năng lượng' -> 'động lực tâm lý', 'xu hướng hành vi'.
         - Thay 'chữa lành' -> 'giải quyết mâu thuẫn', 'xây dựng niềm tin'.
         - Thay 'phụng sự' -> 'cống hiến', 'tạo giá trị xã hội', 'hỗ trợ cộng đồng'.
      4. **Giọng văn:** Thực tế (Practical), Sắc sảo, Tâm lý học hành vi (Behavioral Psychology).
      5. **Variant Specific:** ${comboType === 'innerPersonalityAxis' ? `Tập trung vào trục Nội Tâm – Nhân Cách – Thái Độ – Trưởng Thành với ${axisCount} chỉ số. Nếu thiếu chỉ số, điều chỉnh phân tích cho phù hợp.` : ''}
      6. **Bám sát Khung Sườn:** TUYỆT ĐỐI bám sát khung phân tích được chỉ định, không thêm, bớt hoặc thay đổi cấu trúc. Mở rộng chi tiết dựa trên dữ liệu gốc và ví dụ thực tế, nhưng giữ nhất quán khi phân tích cùng bộ số nhiều lần. Không sáng tạo thêm phần mới ngoài khung.
      7. **Ép Phân Tích Sâu Bám Sát Dàn Ý:** BẮT BUỘC phải trích xuất đặc điểm chính từ dữ liệu gốc (context), sau đó diễn giải sâu sắc, mở rộng với ví dụ thực tế cụ thể từ cuộc sống (công việc, gia đình, tài chính, mối quan hệ), phân tích hậu quả/lợi ích/ý nghĩa, liên kết các ý logic, đảm bảo nội dung đủ ý, không hời hợt. Mỗi điểm con phải tự diễn giải đầy đủ, không chỉ liệt kê mà phải phân tích dựa trên dữ liệu để tạo chiều sâu.
    8. **Bám sát Bộ Chỉ Số Đang Phân Tích:**  
   Toàn bộ output (tất cả các phần h3, h4, ul, li) PHẢI dựa 100% vào đặc điểm cốt lõi của các con số đang được tra cứu (Life Path, Heart Desire, Mission, Personality, Maturity, Attitude, Intelligence…).  
   - Bắt buộc trích dẫn rõ ràng từng số: “Theo đặc điểm của số X là …”, “Số Y cho thấy …”, “Khi kết hợp số A với số B dẫn đến …”.  
   - Tuyệt đối không viết chung chung kiểu “người số X thường…” hoặc “thường thì con số này…”.

9. **Xử Lý Thiếu Dữ Liệu:**  
   Nếu không có đủ dữ liệu cụ thể từ Google Sheet cho bất kỳ phần nào, chỉ được trả lời đúng một câu:  
   “Dữ liệu hiện tại chưa đủ để phân tích chi tiết phần này”.  
   KHÔNG ĐƯỢC tự chế, suy diễn hoặc thêm nội dung ngoài context.

10. **Tính Nhất Quán Toàn Bộ:**  
    Giữ giọng văn, phong cách và mức độ sâu sắc nhất quán xuyên suốt toàn bộ phân tích. Mọi ví dụ thực tế phải liên kết trực tiếp với đặc điểm của bộ chỉ số đang phân tích.
11. **=== QUY TẮC BẮT BUỘC CHO PHẦN BÀI HỌC NHÂN – DUYÊN – QUẢ & CHUYỂN HÓA TÍNH CÁCH ===**
    - Phần này **PHẢI nằm trước phần Lộ trình phát triển**.
    - Phải dùng **đúng cấu trúc HTML** dưới đây, không được thay đổi thẻ.
    - Khi phân tích tổ hợp số (ví dụ: 1+5, 3+5, 2+8, 4+5...), AI **PHẢI phân tích kĩ lưỡng, chặt chẽ**, không được chung chung.

<h4>🔥 BÀI HỌC NHÂN – DUYÊN – QUẢ & CHUYỂN HÓA TÍNH CÁCH</h4>

    **QUY TẮC PHÂN TÍCH TỔ HỢP SỐ (BẮT BUỘC):**
    - AI phải nhận diện **năng lượng lõi** của từng số trước (ví dụ: 3 = biểu đạt + cảm xúc, 5 = tự do + trải nghiệm...).
    - Sau đó phân tích **tổ hợp** một cách sâu sắc:
      • Hai năng lượng này bổ trợ hay xung đột?
      • Khi kết hợp tạo ra “bản sắc mới” gì?
      • Nếu lệch hướng thì biểu hiện cụ thể ra sao trong cuộc sống thực (công việc, tình cảm, tài chính, mối quan hệ)?
    - Phải đưa ra **ví dụ cụ thể, tình huống thực tế**:
      - 3 + 5 lệch → dễ đào hoa, quan hệ ngoài luồng, sống cảm xúc, thiếu trách nhiệm tình cảm.
      - 1 + 5 lệch → liều lĩnh, quyết định mạo hiểm, dễ mất tiền lớn trong kinh doanh.
      - 2 + 5 lệch → dễ yêu sai người, tổn thương cảm xúc sâu sắc.
      - 5 lệch → sa vào tệ nạn, buông thả, mất kiểm soát cuộc sống.
      - 2 lệch → lệ thuộc tình cảm, dễ rơi vào mối quan hệ độc hại.
    - Nhấn mạnh góc nhìn **nhân-duyên-quả** tinh tế: Nhân (suy nghĩ + hành vi), Duyên (môi trường kích hoạt), Quả (kết quả cuộc đời).

    **LƯU Ý QUAN TRỌNG:**
    - Không được viết chung chung.
    - Phải phân tích **tổ hợp số** kĩ lưỡng và chặt chẽ.
    - Luôn nhấn mạnh: “Cách sống mới tạo nghiệp”, “Người tỉnh thức dùng con số để phát triển”.
12. **CHỐNG COPY TEMPLATE (QUAN TRỌNG NHẤT):**
    - TUYỆT ĐỐI KHÔNG viết lại y nguyên nội dung prompt/template (VD: "Số A tạo xu hướng (…)", "Cân bằng (…)", "Phản ứng → quan sát").
    - Nếu trong prompt có placeholder như (…), "___", "Số A/B" → bạn PHẢI thay bằng nội dung phân tích thực sự dựa trên con số cụ thể đang tra cứu.
    - Mỗi câu bạn viết PHẢI chứa ít nhất 1 con số cụ thể đang phân tích (VD: "Số 5 tạo xu hướng tìm kiếm trải nghiệm mới..." thay vì "Số A tạo xu hướng...").
    - Nếu kết quả output giống template hơn 50% → kết quả KHÔNG HỢP LỆ.

**Lưu ý cuối cùng:**
Tất cả 12 quy tắc trên có hiệu lực tuyệt đối với toàn bộ output. Vi phạm bất kỳ quy tắc nào cũng coi như kết quả không hợp lệ.
    `;
  }
};


// Component hiển thị Đỉnh Cao & Thách Thức với nội dung từ Google Sheet
const PeaksChallengesSection: React.FC<{
  sharedResults: CalculationResult;
  sheetData: SheetMeaning[];
  language: 'vi' | 'en';
}> = ({ sharedResults, sheetData, language }) => {
  const [expandedPeak, setExpandedPeak] = useState<number | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<number | null>(null);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl">
      <h3 className="text-xl font-bold text-purple-200 mb-6 flex items-center gap-2">
        <Mountain size={20} className="text-purple-400" />
        {language === 'vi' ? 'Kim Tự Tháp Đỉnh Cao & Thách Thức' : 'Pyramid Peaks & Challenges'}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-purple-300 border-b border-white/10">
              <th className="p-3 text-sm font-semibold">{language === 'vi' ? 'Giai đoạn' : 'Phase'}</th>
              <th className="p-3 text-sm font-semibold">{language === 'vi' ? 'Độ tuổi / Năm' : 'Age / Year'}</th>
              <th className="p-3 text-sm font-semibold">{language === 'vi' ? 'Đỉnh Cao' : 'Peak'}</th>
              <th className="p-3 text-sm font-semibold">{language === 'vi' ? 'Thách Thức' : 'Challenge'}</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {[1, 2, 3, 4].map((i) => {
              const peakNum = (sharedResults.peaks as any)[`peak${i}`];
              const challengeNum = (sharedResults.challenges as any)[`challenge${i}`];
              return (
                <React.Fragment key={i}>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 font-semibold text-blue-200">
                      {language === 'vi' ? `Giai đoạn ${i}` : `Phase ${i}`}
                    </td>
                    <td className="p-3 text-gray-400">
                      {(sharedResults.peaks as any)[`age${i}`]} {language === 'vi' ? 'tuổi /' : 'age /'} {(sharedResults.peaks as any)[`year${i}`]}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setExpandedPeak(expandedPeak === i ? null : i)}
                        className="inline-flex items-center gap-1 text-yellow-400 font-bold text-lg hover:text-yellow-300 transition-colors"
                      >
                        <Sparkles size={14} className="text-yellow-500" />
                        {peakNum}
                        {expandedPeak === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setExpandedChallenge(expandedChallenge === i ? null : i)}
                        className="inline-flex items-center gap-1 text-red-400 font-medium hover:text-red-300 transition-colors"
                      >
                        <AlertTriangle size={14} className="text-red-500" />
                        {challengeNum}
                        {expandedChallenge === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {/* Expanded Peak Meaning */}
                  {expandedPeak === i && (
                    <tr>
                      <td colSpan={4} className="p-4 bg-yellow-900/10 border-b border-yellow-500/10">
                        <div className="text-sm text-gray-200 leading-relaxed">
                          <strong className="text-yellow-300">{language === 'vi' ? `Ý nghĩa Đỉnh Cao ${peakNum}:` : `Peak ${peakNum} Meaning:`}</strong>
                          <div className="mt-2" dangerouslySetInnerHTML={{ __html: getMeaning(sheetData, 'peakNumbers', peakNum, language).replace(/\n/g, '<br/>') }} />
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Expanded Challenge Meaning */}
                  {expandedChallenge === i && (
                    <tr>
                      <td colSpan={4} className="p-4 bg-red-900/10 border-b border-red-500/10">
                        <div className="text-sm text-gray-200 leading-relaxed">
                          <strong className="text-red-300">{language === 'vi' ? `Ý nghĩa Thách Thức ${challengeNum}:` : `Challenge ${challengeNum} Meaning:`}</strong>
                          <div className="mt-2" dangerouslySetInnerHTML={{ __html: getMeaning(sheetData, 'challengeNumbers', challengeNum, language).replace(/\n/g, '<br/>') }} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConnectionTool: React.FC<ConnectionToolProps> = ({ sheetData: initialSheetData, sharedResults, language }) => {
  const [mode, setMode] = useState<2 | 3>(2);
  const [inputs, setInputs] = useState([
    { type: NumberType.HeartDesire, value: '', typeKey: 'heartDesire' },
    { type: NumberType.Mission, value: '', typeKey: 'missionNumber' },
    { type: NumberType.LifePath, value: '', typeKey: 'lifePath' }
  ]);
  const [analysis, setAnalysis] = useState<ConnectionAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // *** Thêm state mới để quản lý sheetData nội bộ và fetching ***
  const [sheetData, setSheetData] = useState<SheetMeaning[]>(initialSheetData);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);

  // *** Thêm state cho hệ thống thuê bao ***
  // Giải thích: State cho số điện thoại (mật khẩu), và trạng thái valid (hợp lệ).
  const [phone, setPhone] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [isValidSubscription, setIsValidSubscription] = useState(false);

  // *** Thêm state cho dữ liệu subscriptions từ Sheet ***
  // Giải thích: Lưu dữ liệu từ Sheet Subscriptions để check local (không dùng AppScript).
  const [subscriptions, setSubscriptions] = useState<{ phone: string; regDate: string }[]>([]);

  // State ngôn ngữ phân tích (tách biệt với language prop của app)
  const [analysisLang, setAnalysisLang] = useState<'vi' | 'en'>(language);

  // State chatbot
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // *** Thêm useEffect để kiểm tra và fetch nếu sheetData rỗng khi component mount ***
  useEffect(() => {
    if (sheetData.length === 0) {
      const loadSheetData = async () => {
        setIsFetchingSheet(true);
        try {
          const data = await fetchMeanings();
          setSheetData(data);
        } catch (error) {
          console.error('Failed to fetch sheet data:', error);
        } finally {
          setIsFetchingSheet(false);
        }
      };
      loadSheetData();
    }
  }, [sheetData.length]);

  // Update internal sheetData if prop changes (in case parent fetches later)
  useEffect(() => {
    if (initialSheetData && initialSheetData.length > 0) {
      setSheetData(initialSheetData);
    }
  }, [initialSheetData]);

  // *** Auto-fill inputs from sharedResults ***
  useEffect(() => {
    if (sharedResults) {
      // Auto-fill inputs dựa trên sharedResults.
      // Ưu tiên 3 chỉ số quan trọng: LifePath, Mission, HeartDesire
      setInputs([
        { type: NumberType.HeartDesire, value: sharedResults.heartDesire.toString(), typeKey: 'heartDesire' },
        { type: NumberType.Mission, value: sharedResults.missionNumber.toString(), typeKey: 'missionNumber' },
        { type: NumberType.LifePath, value: sharedResults.lifePath.toString(), typeKey: 'lifePath' }
      ]);
    }
  }, [sharedResults]);


  // *** Fetch dữ liệu Subscriptions từ Sheet một lần khi mount ***
  // Giải thích: Fetch CSV từ Sheet public, parse thành array objects {phone, regDate}, lưu state để check local.
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const response = await fetch(SUBSCRIPTIONS_CSV_URL);
        if (!response.ok) throw new Error('Failed to fetch subscriptions');
        const csvText = await response.text();
        
        // Parse CSV manual (dòng đầu header, bỏ qua)
        const lines = csvText.split('\n').map(line => line.trim());
        const subs = lines.slice(1).filter(line => line).map(line => {
          const [phone, regDate] = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
          return { phone, regDate };
        });
        
        setSubscriptions(subs);
      } catch (error) {
        console.error('Failed to load subscriptions:', error);
        setSubscriptionMessage(analysisLang === 'en' ? 'Error loading subscription data. Please try later.' : 'Lỗi tải dữ liệu thuê bao. Vui lòng thử sau.');
      }
    };
    loadSubscriptions();
  }, []);

  // Map selection labels to keys used in Google Sheet logic
  const typeKeyMap: Record<string, string> = {
    [NumberType.LifePath]: 'lifePath',
    [NumberType.HeartDesire]: 'heartDesire',
    [NumberType.Mission]: 'missionNumber',
    [NumberType.Personality]: 'personalityNumber',
    [NumberType.Attitude]: 'attitudeNumber',
    [NumberType.Maturity]: 'maturityNumber',
    [NumberType.BirthDay]: 'birthDay',
    [NumberType.Intelligence]: 'intelligenceNumber'
  };

  const handleInputChange = (index: number, field: 'type' | 'value', val: string) => {
    const newInputs = [...inputs];
    if (field === 'type') {
        newInputs[index].type = val as NumberType;
        newInputs[index].typeKey = typeKeyMap[val] || 'lifePath';
    } else {
        newInputs[index].value = val;
    }
    setInputs(newInputs);
    setAnalysis(null);
  };

  // *** Thêm hàm checkSubscription: Check local từ subscriptions state ***
  // Giải thích: Tìm phone trong subscriptions, check date +30 ngày, không cần AppScript.
  const checkSubscription = (code: string) => {
    const trimmedCode = code.trim();
    const isEn = analysisLang === 'en';
    // Bypass codes
    if (['8888', 'admin', 'vip'].includes(trimmedCode)) {
       setSubscriptionMessage(isEn ? 'Authentication successful (Backup/Test mode).' : 'Xác thực thành công (Chế độ Dự phòng/Test).');
       setIsValidSubscription(true);
       return true;
    }

    const sub = subscriptions.find(s => s.phone.trim() === trimmedCode);

    if (!sub) {
      setSubscriptionMessage(isEn ? 'Code does not exist or is not registered.' : 'Mã không tồn tại hoặc chưa đăng ký.');
      setIsValidSubscription(false);
      return false;
    }

    try {
      const regDate = new Date(sub.regDate);
      if (isNaN(regDate.getTime())) throw new Error('Invalid date');

      const now = new Date();
      const expiryDate = new Date(regDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (now <= expiryDate) {
        setSubscriptionMessage(isEn ? 'Subscription valid ✓' : 'Thuê bao hợp lệ ✓');
        setIsValidSubscription(true);
        return true;
      } else {
        setSubscriptionMessage(isEn ? 'Subscription expired. Please renew!' : 'Thuê bao đã hết hạn. Vui lòng gia hạn!');
        setIsValidSubscription(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionMessage(isEn ? 'Error verifying code. Please try again.' : 'Lỗi kiểm tra mã. Vui lòng thử lại.');
      setIsValidSubscription(false);
      return false;
    }
  };

  const handleDeepAnalyze = async () => {
  // *** Kiểm tra thuê bao trước khi phân tích ***
  if (!phone) {
    setSubscriptionMessage(analysisLang === 'en' ? 'Please enter a subscription code to verify.' : 'Vui lòng nhập mã thuê bao để xác thực.');
    return;
  }
  const isValid = checkSubscription(phone);
  if (!isValid) {
    return; // Dừng nếu hết hạn hoặc không tồn tại (message đã set)
  }

  const activeInputs = inputs.slice(0, mode).map(i => ({
    type: i.type,
    typeKey: i.typeKey,
    value: parseInt(i.value) || 0
  }));

  if (activeInputs.some(i => i.value === 0)) return;

  setIsAnalyzing(true);

  // 1. Get Basic Logic (Always run as base/fallback)
  const basicAnalysis = analyzeConnectionLogic(activeInputs);
  
  // 2. Validate Inputs & Determine Combo Type via Rule Engine
  let comboInfo = { comboType: 'basic', isSpecial: false, axisCount: 0 };
  try {
      comboInfo = ruleEngine.validateInputs(activeInputs);
  } catch (error: any) {
      setIsAnalyzing(false);
      setAnalysis({
          ...basicAnalysis,
          aiContent: `<p class='text-red-400 font-bold'>⚠️ ${error.message}</p>`
      });
      return;
  }

  try {
      // *** Bước 1: Bắt buộc kiểm tra và fetch sheetData nếu chưa có ***
      let currentSheetData = sheetData;
      if (currentSheetData.length === 0) {
          setIsFetchingSheet(true);
          try {
              currentSheetData = await fetchMeanings();
              setSheetData(currentSheetData);
          } catch (error) {
               console.error("Failed to fetch sheet data:", error);
               setAnalysis({
                  relationship: "Lỗi",
                  keywords: "",
                  advice: analysisLang === 'en' ? "Cannot fetch data from Google Sheet. Please check connection." : "Không thể fetch dữ liệu từ Google Sheet. Vui lòng kiểm tra kết nối.",
                  growth: "",
                  aiContent: analysisLang === 'en' ? "<p class='text-red-400'>Error: Cannot read data from Google Sheet.</p>" : "<p class='text-red-400'>Lỗi: Không thể đọc dữ liệu từ Google Sheet.</p>"
               });
               setIsAnalyzing(false);
               setIsFetchingSheet(false);
               return; 
          } finally {
              setIsFetchingSheet(false);
          }
      }

      // *** Bước 2: Tiếp tục phân tích chỉ khi sheetData đã sẵn sàng ***
           // *** Bước 2: Tiếp tục phân tích chỉ khi sheetData đã sẵn sàng ***

      // 1. Tạo dữ liệu gốc từ Google Sheet
      const contextData = activeInputs.map(input => {
          const meaning = getMeaning(currentSheetData, input.typeKey, input.value, 'vi');
          return `### DỮ LIỆU GỐC (Hành vi/Tính cách) của ${input.type} số ${input.value}:\n"${meaning.substring(0, 1000)}..."`;
      }).join('\n\n');

// === PHẦN KIẾN THỨC SÂU VỀ CÁC CON SỐ (THÊM VÀO ĐÂY) ===
const deepContext = activeInputs.map(input => {
  const profile = deepNumberKnowledge[input.value.toString()] || deepNumberKnowledge[input.value];
  if (!profile) return '';

  return `### KIẾN THỨC SÂU VỀ SỐ ${input.value} (${profile.name}):
**Hành tinh:** ${profile.planet}
**Từ khóa:** ${profile.keywords.join(', ')}
**Ưu điểm:** ${profile.advantages}
**Thách thức:** ${profile.challenges}
**Cân bằng:** ${profile.balance}
**Gợi ý nghề nghiệp:** ${profile.careerSuggestions}`;
}).join('\n\n');

// Kết hợp contextData cũ + deepContext mới
const fullContext = contextData + '\n\n' + deepContext;
    
      // 2. LẤY RULE ENGINE (Phần này rất quan trọng)
      const modifiers = ruleEngine.getPromptModifiers(
        comboInfo.comboType, 
        comboInfo.isSpecial, 
        comboInfo.axisCount || 0
      );

      // 3. Tạo commonInstructions + Rule Engine
      // QUAN TRỌNG: Inject cả contextData (Google Sheet) + deepContext (kiến thức sâu về số) vào prompt
      const commonInstructions = `
            === NHIỆM VỤ ===
            Phân tích tổ hợp số ${activeInputs.map(i => `${i.type}: ${i.value}`).join(', ')} theo đúng framework bên dưới.

            ⛔ CẢNH BÁO: Phần bên dưới chứa KHUNG CẤU TRÚC (framework) với các thẻ HTML. Đây là DÀN Ý để bạn PHÂN TÍCH, KHÔNG PHẢI template để điền vào. Bạn PHẢI:
            - Đọc mỗi mục trong dàn ý
            - Tra cứu dữ liệu KIẾN THỨC SÂU bên dưới để tìm keywords, advantages, challenges, balance của từng số
            - TỰ VIẾT nội dung phân tích MỚI HOÀN TOÀN cho bộ số ${activeInputs.map(i => i.value).join(' + ')}
            - KHÔNG copy/paraphrase bất kỳ câu nào từ dàn ý. Dàn ý nói "Phân tích X" thì bạn phải TỰ phân tích X, không viết lại "Phân tích X".

            === DỮ LIỆU GỐC TỪ GOOGLE SHEET (Hành vi/Tính cách) ===
            ${contextData}

            === DỮ LIỆU KIẾN THỨC SÂU VỀ CÁC SỐ (BẮT BUỘC SỬ DỤNG LÀM NỀN TẢNG) ===
            ${deepContext}

            === CÁCH SỬ DỤNG DỮ LIỆU KIẾN THỨC SÂU ===
            Khi phân tích MỖI điểm, bạn PHẢI:
            1. Tra keywords/advantages/challenges/balance của từng số trong bộ từ dữ liệu trên
            2. Nhận diện năng lượng lõi: VD số 5 có keywords "Tự do, Phiêu lưu, Thay đổi" → năng lượng lõi = trải nghiệm + không ràng buộc
            3. Phân tích TỔ HỢP: khi năng lượng số ${activeInputs[0]?.value} gặp năng lượng số ${activeInputs[1]?.value || activeInputs[0]?.value} → tạo ra hiệu ứng gì MỚI?
            4. Trích dẫn rõ ràng: "Số ${activeInputs[0]?.value} với đặc điểm [trích từ keywords]..." + "Kết hợp số ${activeInputs[1]?.value || ''} có [trích từ advantages]..." + "Xung đột xảy ra vì [trích từ challenges]..."
            5. Đưa ví dụ thực tế CỤ THỂ trong công việc, tình cảm, tài chính, gia đình

            ${modifiers}

            === YÊU CẦU ĐỊNH DẠNG ===
            - Trả về HTML sạch (chỉ dùng h3, h4, ul, li, p, strong). KHÔNG dùng markdown.
            - Mỗi phần h3 phải dài ít nhất 150-200 từ với nội dung phân tích sâu.
            - Mỗi li phải dài ít nhất 80 từ — KHÔNG liệt kê ngắn gọn.
            - TUYỆT ĐỐI tuân thủ toàn bộ quy tắc trong Rule Engine.

            === NGÔN NGỮ OUTPUT ===
            ${analysisLang === 'en' ? 'BẮT BUỘC viết TOÀN BỘ output bằng TIẾNG ANH (English). Tất cả tiêu đề h3, h4, nội dung p, li đều phải bằng tiếng Anh. Giữ nguyên cấu trúc framework nhưng dịch toàn bộ nội dung sang English.' : 'Viết toàn bộ output bằng TIẾNG VIỆT.'}

            === BÊN DƯỚI LÀ DÀN Ý PHÂN TÍCH — HÃY DÙNG LÀM KHUNG CẤU TRÚC, TỰ VIẾT NỘI DUNG ===
      `;

      let prompt = "";

        if (comboInfo.comboType === 'coreMissionLife') {
            // PROMPT CŨ CHO TRỤC ĐƯỜNG ĐỜI + NỘI TÂM + SỨ MỆNH
            prompt = `
                ${commonInstructions}


⚠️ CHỈ THỊ BẮT BUỘC: Toàn bộ nội dung dưới đây là KHUNG PHÂN TÍCH — AI PHẢI tự phân tích dựa trên năng lượng cụ thể của bộ số ${activeInputs.map(i => i.value).join(' + ')} từ DỮ LIỆU KIẾN THỨC SÂU. KHÔNG copy template. KHÔNG viết “Số A”, “chỉ số X” — PHẢI thay bằng số thực tế. Mỗi phần PHẢI có ví dụ hành vi cụ thể. Phần chuyển hóa PHẢI nói rõ: từ hành vi gì CỤ THỂ → chuyển sang hành vi gì CỤ THỂ (dựa trên challenges → balance của từng số).

<h3>1. BẢN CHẤT & ĐỘNG LỰC CỐT LÕI (Core Dynamics)</h3>
<p>Phân tích bộ số ${activeInputs.map(i => i.value).join(' + ')} theo các lớp sau. Mỗi lớp PHẢI: (a) trích dẫn keywords/advantages/challenges cụ thể từ KIẾN THỨC SÂU, (b) phân tích tổ hợp chứ KHÔNG phân tích từng số riêng lẻ, (c) đưa ít nhất 2 ví dụ hành vi thực tế.</p>
<ul>
<li><strong>Trục năng lượng kết hợp:</strong> Dựa trên keywords của từng số trong bộ, xác định trục năng lượng dạng “X ↔ Y”. Giải thích trục này chi phối hành vi, quyết định, cảm xúc như thế nào. Ví dụ biểu hiện trong công việc, cảm xúc, ra quyết định.</li>
<li><strong>Nhóm động lực chủ đạo:</strong> Bộ số thuộc nhóm Hành động/Cảm xúc/Sáng tạo/Trí tuệ? Nếu đa nhóm → phân tích xung đột hoặc bổ trợ. Ví dụ cụ thể hành vi trong công sở và gia đình.
<p>🔥 <strong>Chuyển hóa:</strong> Dựa trên challenges cụ thể của từng số, khi ở mức THẤP → hành vi lệch cụ thể gì? (VD: “Số ${activeInputs[0]?.value} khi lệch sẽ [trích từ challenges]...”). Khi ở mức CAO → biến challenges thành gì? (trích từ balance).</p></li>
<li><strong>Động cơ cốt lõi:</strong> Từ advantages, bộ số này sống vì điều gì? Phân tích động cơ kép khi kết hợp. Ví dụ cách chọn nghề, xử lý khủng hoảng.
<p>🔥 <strong>Chuyển hóa:</strong> Thấp → giằng xé cụ thể giữa [nhu cầu số ${activeInputs[0]?.value}] và [nhu cầu số ${activeInputs[1]?.value || ''}]. Cao → tích hợp thành công cụ thể ra sao?</p></li>
<li><strong>Bản sắc cá nhân & vai trò:</strong> Tổ hợp tạo “vai trò lai” gì? Phân tích vai trò tự nhiên trong tập thể, gia đình.
<p>🔥 <strong>Chuyển hóa:</strong> Thấp → vai trò méo cụ thể gì? (kiểm soát/phụ thuộc/né tránh — dựa trên challenges). Cao → vai trò đúng mang lại giá trị gì?</p></li>
<li><strong>Mức độ đồng bộ nội–ngoại:</strong> Nội tâm có trùng với biểu hiện không? 3 trạng thái: đồng bộ/lệch nhẹ/lệch mạnh. Hậu quả khi lệch. Hướng dẫn cân bằng cụ thể.</li>
<li><strong>Khí chất tổng thể:</strong> Tổ hợp tạo khí chất gì? Ảnh hưởng tương tác hàng ngày ra sao? Ví dụ thực tế.</li>
</ul>

<h3>2. CƠ CHẾ TÂM LÝ & MÔ HÌNH TƯƠNG TÁC (Mechanism & Interaction)</h3>
<p>Phân tích cơ chế vận hành tâm lý của bộ số ${activeInputs.map(i => i.value).join(' + ')}. PHẢI dựa trên challenges và advantages cụ thể.</p>
<ul>
<li><strong>Trạng thái Flow vs Stress:</strong> Khi thuận lợi, số nào chi phối và biểu hiện cụ thể? Khi áp lực, phản ứng cụ thể gì (kiểm soát/né tránh/bùng nổ/thu mình)? Ví dụ tình huống thất bại dự án, tranh cãi gia đình.</li>
<li><strong>Cơ chế phòng vệ & điểm kích hoạt:</strong> Khi tổn thương → đổ lỗi/tự trách/kiểm soát/cô lập? Điều gì dễ khiến mất cân bằng nhất? (dựa trên challenges). Ví dụ tình huống thực.</li>
<li><strong>Mô hình hành vi lặp lại:</strong> Pattern vô thức nào tái diễn khi xung đột? Vòng lặp cụ thể trong mối quan hệ, công việc.</li>
<li><strong>Xung đột nội tại:</strong> Các số có hỗ trợ hay mâu thuẫn? 3 loại xung đột (nội tâm/hành vi/môi trường). Biểu hiện: mệt mỏi, thiếu động lực, tự nghi ngờ — giải thích TẠI SAO dựa trên tổ hợp số cụ thể.</li>
<li><strong>Cơ chế cân bằng & hướng dẫn phục hồi:</strong> Khi kiệt sức, quay về thói quen số nào? Cách phá vỡ vòng lặp tiêu cực — hành động cụ thể.</li>
</ul>

<h3>3. HỒ SƠ TÍNH CÁCH CHUYÊN SÂU (Deep Profile)</h3>
<p>⚠️ Phần này CỰC KỲ QUAN TRỌNG — phải vẽ ra được “chân dung tâm lý” rõ nét để người đọc NHÌN THẤY được người mang bộ số ${activeInputs.map(i => i.value).join(' + ')} là người như thế nào. Mỗi mục PHẢI bám sát keywords, advantages, challenges cụ thể.</p>
<ul>
<li><strong>Tư duy:</strong> Logic hay cảm xúc? Thực tế hay lý tưởng? Tư duy chiến lược hay phản ứng tức thời? Ra quyết định dựa trên gì? Khi nào tư duy sáng suốt, khi nào bị cảm xúc chi phối? Ví dụ cụ thể trong công việc.
<p>🔥 <strong>Chuyển hóa cụ thể:</strong> Từ [hạn chế tư duy cụ thể dựa trên challenges] → chuyển sang [tư duy mới cụ thể dựa trên balance]. Hành động thực tế để chuyển hóa.</p></li>
<li><strong>Hành vi & phong cách sống:</strong> Chủ động hay thụ động? Quyết liệt hay thận trọng? Bền bỉ hay dễ thay đổi? Họ sống ngày thường như thế nào — thói quen, cách làm việc, cách quản lý thời gian? Ví dụ cụ thể.
<p>🔥 <strong>Chuyển hóa cụ thể:</strong> Hành vi tiêu cực cụ thể nào cần thay đổi? Thay bằng hành vi gì? Thói quen hàng ngày nên xây dựng.</p></li>
<li><strong>Cách thể hiện cảm xúc:</strong> Bộc lộ hay che giấu? Nhạy cảm với điều gì? Cách yêu thương, cách giận dữ, cách buồn. Mô tả CỤ THỂ để người đọc hình dung rõ.</li>
<li><strong>Nội lực & sức bền:</strong> Nội lực mạnh/yếu/dao động? Được “nạp năng lượng” từ đâu (thành tựu/kết nối/tự do/tri thức)? Khi nào mất năng lượng? Cách tự phục hồi.</li>
<li><strong>Điểm mù & nỗi sợ cốt lõi:</strong> Nỗi sợ sâu nhất (thất bại/bị từ chối/mất kiểm soát/mất tự do)? Thói quen tự sabotage? Mặt trái khi lệch hướng? Hậu quả dài hạn nếu không điều chỉnh? Tất cả PHẢI dựa trên challenges cụ thể.</li>
<li><strong>Bức tranh tổng thể — “Người này là ai”:</strong> Viết 1 đoạn mô tả ngắn gọn nhưng sắc nét về con người mang bộ số này — như thể bạn đang vẽ chân dung tâm lý cho họ. Bao gồm: điểm mạnh nổi bật nhất, điểm yếu nguy hiểm nhất, nhu cầu sâu nhất, nỗi sợ lớn nhất.</li>
</ul>

<h3>4. ỨNG DỤNG THỰC TẾ (Actionable Insights)</h3>

<h4>🏢 Sự Nghiệp & Kinh Doanh:</h4>
<p>Phân tích CỤ THỂ cho bộ số ${activeInputs.map(i => i.value).join(' + ')}. KHÔNG liệt kê chung theo nhóm — PHẢI phân tích dựa trên tổ hợp thực tế.</p>
<ul>
<li><strong>Vị thế & ngành nghề phù hợp:</strong> Dựa trên careerSuggestions + advantages của TẤT CẢ các số trong bộ, tổ hợp này phù hợp ngành gì nhất? Vai trò cụ thể: lãnh đạo/chuyên gia/kết nối/sáng tạo? Lý do dựa trên năng lượng kết hợp.</li>
<li><strong>Cách ra quyết định kinh doanh:</strong> Nhanh hay chậm? Cảm tính hay logic? Mạo hiểm hay an toàn? Ví dụ tình huống đầu tư, tuyển dụng.</li>
<li><strong>Điểm yếu cần quản trị trong công việc:</strong> Dựa trên challenges — cụ thể điểm nào sẽ cản trở sự nghiệp? Chiến lược quản trị từng điểm yếu.</li>
<li><strong>Chiến lược phát huy tối ưu:</strong> Xây hệ thống hay bán hàng? Mở rộng nhanh hay bền vững? Cá nhân hay đội nhóm? Lý do từ tổ hợp số.</li>
</ul>

<h4>❤️ Tình Yêu & Mối Quan Hệ:</h4>
<p>⚠️ PHẢI nói RÕ: người mang bộ số ${activeInputs.map(i => i.value).join(' + ')} trong tình yêu MUỐN gì, CẦN gì, SỢ gì — để đối phương biết cách cư xử.</p>
<ul>
<li><strong>Xu hướng tính cách trong tình yêu:</strong> Họ yêu kiểu gì? Mãnh liệt hay điềm đạm? Ghen tuông hay thoáng? Cần không gian hay cần gần gũi? Chung thủy hay dễ chán? (dựa trên keywords + challenges cụ thể).</li>
<li><strong>Họ mong muốn gì từ đối phương:</strong> Sự tôn trọng/tự do/an toàn/hiểu/đồng hành/ngưỡng mộ? Ngôn ngữ tình cảm họ hiểu (lời nói/hành động/quà tặng/thời gian chất lượng)?</li>
<li><strong>Điều TUYỆT ĐỐI không nên làm:</strong> Hành vi nào dễ làm họ tổn thương sâu nhất hoặc mất niềm tin? (dựa trên challenges + nỗi sợ). Ví dụ tình huống cụ thể.</li>
<li><strong>Dấu hiệu rạn nứt & cách hàn gắn:</strong> Khi nào biết họ bắt đầu xa cách? Cách tiếp cận lại cụ thể.</li>
<li><strong>Hướng đi đúng trong tình cảm:</strong> Lời khuyên cụ thể để xây dựng mối quan hệ bền vững với người mang bộ số này.</li>
</ul>

<h4>🤝 Gợi Ý Cho Sale/Coach/Tư Vấn:</h4>
<p>⚠️ PHẢI cho biết: người mang bộ số ${activeInputs.map(i => i.value).join(' + ')} THÍCH gì, MONG MUỐN gì từ dịch vụ — để sale biết cách tư vấn có lợi.</p>
<ul>
<li><strong>Họ bị thu hút bởi điều gì:</strong> Kết quả thực tế? Câu chuyện cảm hứng? Dữ liệu logic? Sự mới mẻ? Sự an toàn? (dựa trên keywords + advantages).</li>
<li><strong>Cách tiếp cận hiệu quả:</strong> Mở đầu thế nào? Giọng nói/phong cách nên dùng? Trình bày sản phẩm theo cách nào? Ví dụ kịch bản tư vấn cụ thể.</li>
<li><strong>Điểm kích hoạt cảm xúc để mở lòng:</strong> Chạm vào mong muốn gì sẽ khiến họ quan tâm? Nỗi sợ nào có thể khai thác tích cực?</li>
<li><strong>Điều TUYỆT ĐỐI không nên nói/làm:</strong> Hành vi nào khiến họ đóng cửa? (dựa trên challenges + điểm kích hoạt). Ví dụ sai lầm sale hay gặp.</li>
<li><strong>Cách chốt quyết định:</strong> Cho họ cảm giác kiểm soát/an toàn/cơ hội? Xử lý từ chối đúng nỗi sợ gốc. Ví dụ kịch bản closing cụ thể.</li>
</ul>
<h3>🔥 ENGINE PHÂN TÍCH KẾT NỐI CHỈ SỐ (AI CORE SYSTEM)</h3>

<p><strong>⚠️ CHỈ THỊ QUAN TRỌNG — ĐÂY LÀ LỆNH PHÂN TÍCH, KHÔNG PHẢI TEMPLATE ĐỂ COPY:</strong></p>
<p>Bạn KHÔNG ĐƯỢC viết lại hay paraphrase nội dung bên dưới. Bạn PHẢI dùng nó như KHUNG TƯ DUY để tự phân tích dựa trên các số cụ thể: ${activeInputs.map(i => i.value).join(', ')}.</p>
<p>Mỗi điểm phân tích PHẢI: (1) gọi tên năng lượng lõi cụ thể của số đang tra cứu dựa trên KIẾN THỨC SÂU đã cung cấp, (2) phân tích sự tương tác giữa các năng lượng đó, (3) đưa ví dụ hành vi thực tế cụ thể (công việc, tình cảm, tài chính, gia đình).</p>

<ul>
<li>
<strong>Bước 1 — Nhận diện năng lượng lõi:</strong>
<p>Dựa trên dữ liệu KIẾN THỨC SÂU (keywords, advantages, challenges), hãy xác định CỤ THỂ năng lượng lõi của từng số đang tra cứu. Ví dụ: nếu số là 3 → tra keywords thấy “Sáng tạo, Biểu đạt, Giao tiếp” → năng lượng lõi = biểu đạt + cảm xúc + xã hội. KHÔNG ĐƯỢC viết chung chung “Số A đại diện cho năng lượng gì” — PHẢI gọi tên cụ thể.</p>
</li>

<li>
<strong>Bước 2 — Phân loại mối quan hệ giữa các số:</strong>
<p>Sau khi có năng lượng lõi từng số, PHẢI xác định quan hệ: Đồng hướng (cùng nhóm → khuếch đại, VD: cả hai đều thiên cảm xúc), Bổ trợ (khác nhóm nhưng hỗ trợ, VD: trí tuệ + hành động), hay Tương phản (đối lập → xung đột nhưng tiềm năng tiến hóa cao, VD: ổn định vs tự do). Giải thích CỤ THỂ tại sao mối quan hệ đó xảy ra với bộ số đang phân tích.</p>
</li>

<li>
<strong>Bước 3 — Tạo trục năng lượng kết hợp:</strong>
<p>Tạo trục dạng “X ↔ Y” dựa trên năng lượng thực sự của bộ số. VD: Nếu số 4+5 → “Ổn định ↔ Tự do”; nếu số 2+8 → “Kết nối ↔ Quyền lực”. PHẢI giải thích trục này chi phối hành vi, quyết định, cảm xúc như thế nào trong đời sống thực.</p>
</li>

<li>
<strong>Bước 4 — Phân tích 5 lớp (PHẢI VIẾT ĐẦY ĐỦ, MỖI LỚP ÍT NHẤT 100 TỪ):</strong>
<ul>
<li><strong>Core (Bản chất mới):</strong> Khi kết hợp các năng lượng lõi, “con người mới” này có bản chất gì? Họ khác gì so với từng số riêng lẻ? Đưa ví dụ cụ thể: cách họ ra quyết định, cách họ yêu, cách họ làm việc.</li>
<li><strong>Mechanism (Cơ chế vận hành tâm lý):</strong> Khi bình thường, số nào chi phối? Khi stress, số nào lấn át? Phản ứng cụ thể trong tình huống: mâu thuẫn công sở, áp lực tài chính, xung đột gia đình.</li>
<li><strong>Power (Sức mạnh):</strong> Tổ hợp này tạo ra lợi thế gì mà từng số riêng lẻ không có? Ứng dụng cụ thể trong kinh doanh, lãnh đạo, sáng tạo, hay kết nối.</li>
<li><strong>Shadow (Lệch hướng):</strong> Khi mất cân bằng, tổ hợp này dẫn đến hành vi tiêu cực gì? PHẢI cụ thể: đào hoa, mạo hiểm tài chính, lệ thuộc cảm xúc, kiểm soát quá mức, sa đà tệ nạn... tùy theo bộ số thực tế.</li>
<li><strong>Evolution (Phát triển):</strong> Kỹ năng cụ thể cần rèn luyện để chuyển từ phiên bản thấp sang cao. Thói quen hàng ngày cần xây dựng. Ví dụ thực tế từ người đã trưởng thành với bộ số tương tự.</li>
</ul>
</li>

<li>
<strong>Bước 5 — Sinh kịch bản 3 trạng thái (PHẢI VIẾT CỤ THỂ, KHÔNG CHUNG CHUNG):</strong>
<ul>
<li><strong>Khi đúng hướng (phiên bản cao):</strong> Họ trở thành ai? Hành vi cụ thể? Thành tựu đạt được? Ví dụ: “Người số X+Y khi trưởng thành sẽ là nhà lãnh đạo có tầm nhìn chiến lược, vừa quyết đoán vừa biết lắng nghe, thành công trong vai trò CEO/founder vì...”</li>
<li><strong>Khi lệch (phiên bản thấp):</strong> Họ rơi vào vòng xoáy gì? Hành vi tự phá hoại cụ thể? Ví dụ: “Người số X+Y khi lệch sẽ liều lĩnh đầu tư, dễ mất tiền lớn, quan hệ tình cảm không bền vì...”</li>
<li><strong>Khi trưởng thành (cân bằng):</strong> Họ học được gì? Chuyển hóa cụ thể nào? Ví dụ: “Biến sự nhạy cảm thành trực giác kinh doanh, biến tham vọng thành tầm nhìn phục vụ...”</li>
</ul>
</li>
</ul>

<h3>🔥 ỨNG DỤNG THỰC TẾ TỪ TỔ HỢP SỐ</h3>
<p><strong>⚠️ PHẢI phân tích CỤ THỂ cho bộ số ${activeInputs.map(i => i.value).join(' + ')}, KHÔNG viết chung chung:</strong></p>
<ul>
<li><strong>Hành vi thực tế:</strong> Với tổ hợp này, họ có xu hướng làm nghề gì? Hành động ra sao trong công việc hàng ngày? Ra quyết định dựa trên logic hay cảm xúc? Phân tích dựa trên keywords và challenges của từng số trong bộ.</li>
<li><strong>Ứng dụng kinh doanh:</strong> Tổ hợp này ra quyết định nhanh hay chậm? Thiên về bán hàng trực tiếp hay xây hệ thống? Dễ mạo hiểm hay thận trọng? Đưa ví dụ ngành nghề cụ thể phù hợp.</li>
<li><strong>Ứng dụng giáo dục:</strong> Tổ hợp này học tốt qua trải nghiệm hay lý thuyết? Cần môi trường học tập như thế nào? Giáo viên/mentor nên tiếp cận ra sao?</li>
<li><strong>Sale / Coach:</strong> Khi tư vấn người mang tổ hợp này: cách nói chuyện cụ thể nào hiệu quả? Điểm kích hoạt cảm xúc nào khiến họ mở lòng? Điều gì tuyệt đối KHÔNG nên nói/làm?</li>
</ul>

<h4>🔥 BÀI HỌC NHÂN – DUYÊN – QUẢ & CHUYỂN HÓA TÍNH CÁCH</h4>
<p><strong>⚠️ ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT — PHẢI PHÂN TÍCH DỰA TRÊN TỔ HỢP SỐ ${activeInputs.map(i => i.value).join(' + ')}, KHÔNG ĐƯỢC VIẾT CHUNG CHUNG HAY COPY TEMPLATE:</strong></p>
<ul>

<li>
<strong>Tổng kết nghiệp tính cách:</strong>
<p>Dựa trên KIẾN THỨC SÂU: Số ${activeInputs[0]?.value} có keywords gì, challenges gì → tạo xu hướng tâm lý cụ thể nào? Số ${activeInputs[1]?.value || 'tiếp theo'} tạo xu hướng gì? Khi kết hợp → phiên bản cao (tích cực) biểu hiện CỤ THỂ ra sao trong đời sống? Phiên bản thấp (tiêu cực) dẫn đến hành vi gì? PHẢI đưa ví dụ tình huống thực: công việc, tình cảm, tài chính. Giải thích tại sao đây là thói quen tâm thức lặp lại — họ lặp lại pattern gì cụ thể?</p>
</li>

<li>
<strong>Phước phần (tài năng bẩm sinh từ tổ hợp này):</strong>
<p>Tổ hợp ${activeInputs.map(i => i.value).join(' + ')} mang lại tài năng bẩm sinh cụ thể gì? (dựa trên advantages của từng số) Cơ hội nào mở ra khi dùng đúng? Thế mạnh cạnh tranh so với người khác là gì? Nếu dùng đúng, họ phát triển nhanh ở lĩnh vực nào? Đưa ví dụ nghề nghiệp, vai trò xã hội cụ thể.</p>
</li>

<li>
<strong>Nghiệp cần chuyển hóa (dựa trên challenges của bộ số):</strong>
<p>Từ challenges trong KIẾN THỨC SÂU, tổ hợp này dễ rơi vào bẫy tâm lý gì? Kiểm soát quá mức? Lệ thuộc cảm xúc? Sợ hãi thay đổi? Thiếu kỷ luật? PHẢI phân tích CỤ THỂ cho bộ số đang tra: VD nếu 3+5 → dễ đào hoa, quan hệ ngoài luồng, sống cảm xúc thiếu trách nhiệm; nếu 1+5 → liều lĩnh mạo hiểm, dễ mất tiền lớn; nếu 2+8 → dễ bị áp chế trong quan hệ. Mô tả cách sai lầm lặp lại — tự phá cơ hội như thế nào?</p>
</li>

<li>
<strong>Nếu không chuyển hóa — hậu quả cụ thể:</strong>
<p>Với tổ hợp ${activeInputs.map(i => i.value).join(' + ')}, nếu không nhận ra pattern tiêu cực: Sức khỏe tâm lý bị ảnh hưởng cụ thể ra sao? (kiệt sức, trầm cảm, mất phương hướng?) Quan hệ đổ vỡ theo kiểu nào? (bị bỏ rơi, tự đẩy người khác ra, kiểm soát quá mức?) Thất bại lặp lại ở đâu? (sự nghiệp, tài chính, tình cảm?) Đưa ví dụ kịch bản đời sống thực.</p>
</li>

<li>
<strong>Nếu chuyển hóa — con đường cụ thể:</strong>
<p>Với bộ số này, chuyển hóa CỤ THỂ nghĩa là gì? Không phải nói chung “phản ứng → quan sát” mà PHẢI nói: “Khi số X khiến bạn muốn [hành vi cũ cụ thể], hãy chuyển sang [hành vi mới cụ thể]”. Ví dụ: “Khi năng lượng số 5 kích hoạt sự bồng bột muốn bỏ việc, hãy dùng năng lượng số 4 để lập kế hoạch 30 ngày trước khi quyết định”. Mỗi chuyển hóa phải có hành động thực tế kèm theo.</p>
</li>

<li>
<strong>Chu kỳ nhân – duyên – quả (phân tích cho bộ số cụ thể):</strong>
<p><strong>Nhân:</strong> Với tổ hợp này, suy nghĩ/niềm tin gốc rễ nào chi phối hành vi? (VD: “Tôi phải kiểm soát mọi thứ” từ số 1, “Tôi cần tự do tuyệt đối” từ số 5). <strong>Duyên:</strong> Môi trường/tình huống nào kích hoạt pattern tiêu cực? (VD: áp lực deadline, xung đột với sếp, bị từ chối trong tình cảm). <strong>Quả:</strong> Kết quả cuộc đời cụ thể khi pattern này lặp đi lặp lại? Phải liên kết trực tiếp với challenges của bộ số.</p>
</li>

<li>
<strong>Bài học phát triển (dựa trên balance của từng số trong bộ):</strong>
<p>Dựa trên phần “balance” trong KIẾN THỨC SÂU của từng số, bài học lớn nhất cho tổ hợp này là gì? Cân bằng giữa điều gì và điều gì CỤ THỂ? Vượt qua nỗi sợ nào CỤ THỂ? Phát triển phẩm chất nào CỤ THỂ? Mỗi bài học phải kèm theo hành động thực tế có thể áp dụng ngay.</p>
</li>

<li>
<strong>🔥 Insight tổng kết:</strong>
<p>Kết luận bằng 2-3 câu sắc sảo, cá nhân hóa cho bộ số ${activeInputs.map(i => i.value).join(' + ')}. Nhấn mạnh: con số không quyết định — nhận thức quyết định. Người tỉnh thức dùng hiểu biết về con số để phát triển chứ không bị con số định nghĩa. Câu này PHẢI liên kết cụ thể với năng lượng của bộ số đang phân tích, KHÔNG phải câu chung chung áp dụng cho mọi bộ số.</p>
</li>

</ul>
</li>

</ul>
                <h3>5. LỘ TRÌNH PHÁT TRIỂN (Timeline)</h3>
                <ul>
                    <li><strong>Giai đoạn Non trẻ:</strong> Trích xuất từ dữ liệu, thường bị chi phối bởi nhu cầu/thói quen nào? Diễn giải sâu với ví dụ từ tuổi trẻ, phân tích cách nó định hình tính cách.</li>
                    <li><strong>Giai đoạn Trung niên:</strong> Từ context, cần tập trung phát triển kỹ năng gì (theo Sứ mệnh)? Phân tích chiến lược, ví dụ từ sự nghiệp giữa đời.</li>
                    <li><strong>Giai đoạn Trưởng thành:</strong> Sự tích hợp hoàn hảo trông như thế nào? Diễn giải phiên bản tốt nhất, với ví dụ từ người thành công cao tuổi.</li>
                </ul>
            `;
       } else if (comboInfo.comboType === 'innerPersonalityAxis') {
    // PROMPT NÂNG CẤP CHUYÊN SÂU CHO TRỤC NỘI TÂM – NHÂN CÁCH – THÁI ĐỘ – TRƯỞNG THÀNH
    prompt = `
        ${commonInstructions}

        **KHUNG PHÂN TÍCH CHUYÊN SÂU CHO TRỤC NỘI TÂM – NHÂN CÁCH – THÁI ĐỘ – TRƯỞNG THÀNH (8 TẦNG NÂNG CẤP):**

        <h3>1. TỔNG QUAN CẤU TRÚC (Overview)</h3>
        <p>
        Bạn có lõi Nội tâm ${activeInputs.find(i => i.type === NumberType.HeartDesire)?.value || 'X'}, 
        thể hiện qua Nhân cách ${activeInputs.find(i => i.type === NumberType.Personality)?.value || 'Y'}, 
        phản ứng bằng Thái Độ ${activeInputs.find(i => i.type === NumberType.Attitude)?.value || 'Z'} 
        và đang hướng tới Trưởng thành ${activeInputs.find(i => i.type === NumberType.Maturity)?.value || 'W'}.
        </p>

        <p>
        Trích xuất từ dữ liệu gốc, phân tích sâu: 
        - Động lực lõi này tạo ra mẫu người thuộc nhóm động lực nào (Hành động / Cảm xúc / Sáng tạo / Trí tuệ)? Diễn giải cách nhóm này định hình bản chất, ví dụ từ hành vi hàng ngày.
        - Động cơ sâu nhất của họ là gì (công nhận, an toàn, tự do, quyền lực, cống hiến)? Phân tích ảnh hưởng đến quyết định cuộc đời, ví dụ từ lựa chọn mối quan hệ.
        - Họ sống vì bản thân hay vì giá trị lớn hơn? Diễn giải sâu với ví dụ từ mục tiêu cá nhân.
        - Nội lực bên trong mạnh hay phụ thuộc vào môi trường? Phân tích rủi ro nếu phụ thuộc, ví dụ từ căng thẳng xã hội.
        </p>

        <h3>2. ĐỘ ĐỒNG BỘ NỘI – NGOẠI (Sync Level)</h3>
        <ul>
            <li><strong>Nội tâm ↔ Nhân cách:</strong> 
                Trích xuất từ context, họ có đang sống đúng với bản chất không? Diễn giải người khác nhìn thấy đúng con người thật hay chỉ thấy “vai diễn”? Khi lệch pha, phân tích sâu họ dễ mệt mỏi, thiếu động lực hay bị hiểu lầm như thế nào, ví dụ từ xung đột nội tại trong công việc.
            </li>

            <li><strong>Nội tâm ↔ Thái Độ:</strong>
                Từ dữ liệu, nhu cầu bên trong có phù hợp với cách họ phản ứng không? Phân tích khi bị tổn thương, họ phản ứng bảo vệ hay bộc phát? Diễn giải số nào chi phối cảm xúc và hành vi, ví dụ từ phản ứng dưới áp lực gia đình.
            </li>
        </ul>

        <h3>3. CƠ CHẾ PHẢN ỨNG KHI ÁP LỰC (Stress Response)</h3>
        <p>
        Trích xuất từ dữ liệu gốc, phân tích theo 3 lớp: 
        - Nội tâm: điều gì khiến họ tổn thương sâu nhất? Diễn giải nguồn gốc tổn thương, ví dụ từ trải nghiệm quá khứ.
        - Thái độ: họ phản ứng bằng kiểm soát, né tránh, bùng nổ hay im lặng? Phân tích hậu quả, ví dụ từ tranh cãi.
        - Nhân cách: người khác sẽ nhìn thấy họ ra sao khi stress? Diễn giải hình ảnh bên ngoài, ví dụ từ phản hồi đồng nghiệp.
        </p>

        <p>
        Làm rõ sâu: 
        - Họ chiến đấu hay rút lui? Phân tích lựa chọn dựa trên động lực, ví dụ từ khủng hoảng sự nghiệp.
        - Họ đổ lỗi, tự trách hay tăng kiểm soát? Diễn giải vòng lặp cảm xúc.
        - Vòng lặp hành vi tiêu cực thường tái diễn là gì? Ví dụ từ hành vi lặp lại trong mối quan hệ.
        </p>

        <h3>4. SỨC MẠNH CỘNG HƯỞNG 4 TẦNG (Synergy)</h3>
        <p>
        Từ context, nhóm năng lượng nào chiếm ưu thế? Phân tích nếu 3–4 tầng cùng nhóm → cá tính rất mạnh, định hướng rõ ràng; nếu đa nhóm → đa chiều, phức tạp nhưng tiềm năng phát triển cao, ví dụ từ thành công đa ngành.
        </p>

        <p>
        Phân tích sâu: 
        - Sức mạnh tự nhiên lớn nhất là gì? (Lãnh đạo, kết nối, sáng tạo, phân tích, xây dựng hệ thống…) Diễn giải với ví dụ từ kỹ năng nổi bật trong công việc.
        - Họ dễ thành công khi đứng ở vị trí nào? Phân tích lý do, ví dụ từ vai trò lãnh đạo.
        - Họ có xu hướng dẫn dắt hay hỗ trợ? Diễn giải trong ngữ cảnh đội nhóm, ví dụ từ dự án hợp tác.
        </p>

        <h3>5. XUNG ĐỘT ẨN SÂU (Conflicts)</h3>
        <ul>
            <li><strong>Nội tâm vs Nhân cách:</strong>
                Trích xuất, có sống khác với bản chất để làm hài lòng người khác? Diễn giải có đeo “mặt nạ” xã hội không, ví dụ từ căng thẳng xã giao.
            </li>

            <li><strong>Nội tâm vs Thái Độ:</strong>
                Từ dữ liệu, phản ứng có làm tổn thương chính họ không? Phân tích có hành xử trái với nhu cầu thật không, ví dụ từ phản ứng cảm xúc lệch.
            </li>

            <li><strong>Nhân cách vs Trưởng thành:</strong>
                Trích xuất, thói quen cũ có cản trở sự phát triển? Diễn giải sâu, ví dụ từ trì hoãn thay đổi.
            </li>

            <li><strong>Thái Độ vs Trưởng thành:</strong>
                Từ context, phản xạ cảm xúc có làm chậm tiến trình trưởng thành? Phân tích ví dụ từ bỏ lỡ cơ hội.
            </li>
        </ul>

        <p>
        Làm rõ vùng mâu thuẫn lớn nhất và bài học cần tích hợp để cân bằng, diễn giải sâu với ví dụ từ quá trình tự cải thiện.
        </p>

        <h3>6. XU HƯỚNG CUỘC ĐỜI (Life Trends)</h3>
        <ul>
            <li><strong>Xu hướng Tính Cách:</strong>
                Trích xuất, chủ động hay thụ động? Lý trí hay cảm xúc chiếm ưu thế? Ổn định dài hạn hay thích bứt phá thay đổi? Diễn giải sâu với ví dụ từ phong cách sống.
            </li>

            <li><strong>Xu hướng Nghề Nghiệp:</strong>
                Từ dữ liệu, phù hợp môi trường cạnh tranh, nhân văn, sáng tạo hay nghiên cứu? Làm cá nhân xuất sắc hay xây đội nhóm? Phân tích ví dụ từ lựa chọn ngành.
            </li>

            <li><strong>Xu hướng Thành Công:</strong>
                Thành công nhờ ảnh hưởng cá nhân? Nhờ xây hệ thống? Nhờ chuyên môn sâu? Hay nhờ truyền cảm hứng? Diễn giải sâu, ví dụ từ case thành công.
            </li>
        </ul>

        <h3>7. GỢI Ý CHO SALER / NHÀ TƯ VẤN (Consulting Tips)</h3>
        <ul>
            <li><strong>Cách Giao Tiếp Phù Hợp:</strong>
                Trích xuất, nên nói thẳng, logic hay mềm mại, cảm xúc? Cần dữ liệu, bằng chứng hay cần niềm tin và sự đồng cảm? Diễn giải ví dụ từ buổi tư vấn.
            </li>

            <li><strong>Điều Tạo Động Lực:</strong>
                Từ context, kết nối với khát khao sâu nhất (công nhận, tự do, an toàn, ảnh hưởng…). Phân tích cách kích hoạt, ví dụ từ động viên.
            </li>

            <li><strong>Điểm Dễ Kích Hoạt Cảm Xúc:</strong>
                Điều gì khiến họ phòng thủ? Điều gì khiến họ mở lòng? Diễn giải sâu, ví dụ từ giao tiếp hàng ngày.
            </li>

            <li><strong>Điều Nên Tránh:</strong>
                Tránh gây tổn thương vào nỗi sợ lõi. Tránh áp lực sai cách. Tránh phủ nhận giá trị họ đang theo đuổi. Phân tích hậu quả, ví dụ từ sai lầm tư vấn.
            </li>
        </ul>

        <h3>8. HƯỚNG PHÁT TRIỂN TRƯỞNG THÀNH (Growth Path)</h3>
        <ul>
            <li><strong>Phiên Bản Cao Nhất:</strong>
                Trích xuất, khi tích hợp 4 tầng, họ trở thành ai trong xã hội? Vai trò lớn nhất họ có thể đảm nhận là gì? Diễn giải sâu với ví dụ từ người thành công.
            </li>

            <li><strong>Nếu Lệch Hướng:</strong>
                Từ dữ liệu, trạng thái tiêu cực kéo dài sẽ dẫn đến điều gì? (Kiệt sức, cô lập, kiểm soát, mất phương hướng…) Phân tích hậu quả, ví dụ từ case lệch lạc.
            </li>

            <li><strong>Bài Học Lớn Nhất:</strong>
                Kỹ năng cần rèn luyện: quản trị cảm xúc, kỷ luật, lãnh đạo, giao tiếp, linh hoạt… Diễn giải điều cần buông bỏ để trưởng thành, ví dụ từ hành trình cá nhân.
            </li>
        </ul>
    `;

        } else {
            // PROMPT CƠ BẢN (FALLBACK / OTHER COMBOS)
            prompt = `
                ${commonInstructions}

                **KHUNG PHÂN TÍCH CƠ BẢN:**

                <h3>1. Tổng Quan Tương Tác</h3>
                <p>Trích xuất từ dữ liệu gốc, nhận định chung về sự kết hợp này: Đây là sự hỗ trợ, bổ sung hay thách thức lẫn nhau? Diễn giải sâu cách các số tương tác, liên kết với động lực tâm lý, ví dụ thực tế từ hành vi hàng ngày hoặc quyết định lớn trong cuộc sống, phân tích ý nghĩa tổng thể và hậu quả nếu không cân bằng.</p>

                <h3>2. Điểm Mạnh & Điểm Yếu</h3>
                <ul>
                    <li><strong>Điểm Mạnh (Sự Cộng Hưởng):</strong> Trích xuất từ context, những phẩm chất tốt đẹp được khuếch đại khi 2 số này đi cùng nhau. Phân tích sâu cách chúng bổ trợ nhau, ví dụ cụ thể từ công việc (như tăng năng suất), gia đình (cải thiện mối quan hệ), tài chính (quản lý tốt hơn), và lợi ích dài hạn.</li>
                    <li><strong>Điểm Yếu (Sự Mâu Thuẫn):</strong> Từ dữ liệu gốc, những rắc rối nội tâm hoặc hành vi mâu thuẫn thường gặp. Diễn giải sâu nguồn gốc mâu thuẫn, ví dụ thực tế từ căng thẳng (công sở tranh cãi, gia đình xung đột), hậu quả (kiệt sức, mất cơ hội), và cách nhận biết sớm.</li>
                </ul>

                <h3>3. Lời Khuyên Ứng Dụng</h3>
                <p>Trích xuất và phân tích lời khuyên thực tế để cân bằng cuộc sống và công việc cho bộ số này. Diễn giải sâu từng chiến lược, ví dụ cụ thể từ ứng dụng (sự nghiệp chọn nghề, tài chính lập kế hoạch, mối quan hệ giao tiếp), phân tích lợi ích và cách triển khai từng bước để hóa giải mâu thuẫn.</p>
            `;
        }

      // Tạo system instruction riêng cho phân tích — ép GPT tuân theo framework
      const analyzeSystemInstruction = `Bạn là Chuyên gia Tâm lý học Hành vi (Behavioral Psychologist) và Cố vấn Chiến lược Nhân sự với hơn 30 năm kinh nghiệm nghiên cứu số học ứng dụng.

=== VAI TRÒ CỦA BẠN ===
Bạn là NHÀ PHÂN TÍCH, không phải "người điền form". Phần prompt bên dưới chứa KHUNG TƯ DUY (framework) — bạn PHẢI dùng nó làm cấu trúc để TỰ VIẾT nội dung phân tích dựa trên dữ liệu KIẾN THỨC SÂU đã cung cấp.

⛔ HÀNH VI CẤM (nếu vi phạm = kết quả vô giá trị):
- KHÔNG copy/paraphrase bất kỳ câu nào từ prompt. Prompt là CHỈ DẪN, không phải nội dung.
- KHÔNG viết "Số A", "chỉ số X", "(…)", "___" — PHẢI thay bằng số thực tế đang tra cứu.
- KHÔNG liệt kê đặc điểm riêng lẻ từng số rồi ghép lại — PHẢI phân tích TỔ HỢP (interaction effect).
- KHÔNG viết chung chung áp dụng cho mọi bộ số — mỗi câu phải CỤ THỂ cho bộ số đang tra.

=== PHƯƠNG PHÁP PHÂN TÍCH BẮT BUỘC ===

BƯỚC 1 — NHẬN DIỆN: Đọc phần "KIẾN THỨC SÂU" trong prompt, trích xuất keywords, advantages, challenges, balance của TỪNG số.

BƯỚC 2 — TỔ HỢP: Xác định quan hệ giữa các số:
- Đồng hướng (cùng nhóm → khuếch đại lẫn nhau)
- Bổ trợ (khác nhóm → bù đắp điểm yếu)
- Tương phản (đối lập → xung đột NHƯNG tiềm năng tiến hóa cao)

BƯỚC 3 — TRỤC NĂNG LƯỢNG: Tạo trục dạng "X ↔ Y" (VD: "Ổn định ↔ Tự do") dựa trên keywords thực. Giải thích trục này chi phối hành vi ra sao.

BƯỚC 4 — PHÂN TÍCH 5 LỚP cho mỗi điểm:
- Core: Bản chất mới khi kết hợp (khác gì từng số riêng lẻ?)
- Mechanism: Số nào chi phối khi bình thường? Khi stress?
- Power: Lợi thế độc nhất mà từng số riêng lẻ không có
- Shadow: Hành vi tiêu cực CỤ THỂ khi mất cân bằng (đào hoa, mạo hiểm tài chính, lệ thuộc cảm xúc, kiểm soát quá mức...)
- Evolution: Kỹ năng cần rèn luyện + thói quen hàng ngày

BƯỚC 5 — 3 KỊCH BẢN: Đúng hướng (phiên bản cao) | Lệch (phiên bản thấp) | Trưởng thành (cân bằng) — mỗi kịch bản có ví dụ hành vi CỤ THỂ.

=== QUY TẮC VIẾT NỘI DUNG ===

1. MỖI câu output PHẢI chứa ít nhất 1 con số cụ thể đang phân tích (VD: "Số 5 tạo xu hướng..." KHÔNG phải "Số này tạo xu hướng...").

2. BẮT BUỘC trích dẫn dữ liệu KIẾN THỨC SÂU: "Theo KIẾN THỨC SÂU, số 5 có keywords: Tự do, Phiêu lưu, Thay đổi — cho thấy năng lượng lõi thiên về trải nghiệm. Kết hợp với số 3 (Sáng tạo, Biểu đạt) tạo thành xu hướng lan tỏa mạnh nhưng dễ hời hợt..."

3. PHẦN CHUYỂN HÓA (🔥): PHẢI viết CỤ THỂ:
   - SAI: "Thấp → giằng xé, Cao → cân bằng" (chung chung)
   - ĐÚNG: "Khi số 5 kích hoạt sự bồng bột muốn bỏ việc giữa chừng (trích từ challenges: thiếu kiên nhẫn), hãy dùng năng lượng số 4 (kỷ luật, ổn định) để lập kế hoạch 30 ngày trước khi quyết định" (cụ thể)

4. MỖI điểm phân tích (li) phải dài ít nhất 80 từ với ví dụ thực tế (công việc, tình cảm, tài chính, gia đình).

5. PHẦN TÌNH YÊU: PHẢI nói rõ người này MUỐN gì, CẦN gì, SỢ gì trong tình yêu — đủ chi tiết để đối phương biết cách cư xử.

6. PHẦN SALE/COACH: PHẢI nói rõ người này bị THU HÚT bởi gì, GHÉT gì từ người tư vấn — đủ chi tiết để sale biết cách tiếp cận.

7. PHẦN BÀI HỌC NHÂN-DUYÊN-QUẢ: Phải dài ít nhất 400 từ. Phải có ví dụ lệch hướng CỤ THỂ cho tổ hợp (VD: 3+5 → đào hoa; 1+5 → mạo hiểm tài chính; 2+8 → bị áp chế).

8. CẤM: 'năng lượng vũ trụ', 'tần số rung động', 'kiếp trước', 'linh hồn', 'chữa lành', 'phụng sự', 'nghiệp quả'.
   THAY: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn', 'cống hiến', 'tạo giá trị xã hội'.

9. GIỌNG VĂN: Thực tế, sắc sảo, tâm lý học hành vi. KHÔNG mơ hồ, KHÔNG lý tưởng hóa.

10. FORMAT: HTML sạch (h3, h4, ul, li, p, strong). KHÔNG markdown. KHÔNG dùng ký tự đặc biệt ngoài emoji cho tiêu đề.

=== KIỂM TRA CHẤT LƯỢNG (TỰ ĐÁNH GIÁ TRƯỚC KHI TRẢ KẾT QUẢ) ===
Trước khi trả output, tự hỏi:
- Có câu nào giống y nguyên prompt không? → XÓA viết lại.
- Có câu nào không chứa số cụ thể không? → THÊM số vào.
- Phần chuyển hóa có nói rõ "từ hành vi A cụ thể → sang hành vi B cụ thể" không? → Nếu chung chung, VIẾT LẠI.
- Phần tình yêu có đủ chi tiết để đối phương biết cách cư xử không? → Nếu không, BỔ SUNG.
- Mỗi li có ít nhất 80 từ không? → Nếu ngắn, MỞ RỘNG.`;

      // Gọi Server Action với system instruction riêng
      const result = await generateAnalyzeResponse(prompt, analyzeSystemInstruction);

      if (result.error) {
        throw new Error(result.error);
      }

      const responseText = result.content || (analysisLang === 'en' ? '<p class="text-yellow-400">No analysis content received from AI. Please try again.</p>' : '<p class="text-yellow-400">Không nhận được nội dung phân tích từ AI. Vui lòng thử lại.</p>');

      setAnalysis({
        ...basicAnalysis,
        aiContent: responseText
      });
    } catch (error: any) {
      console.error('OpenAI Analyze error:', error);
      setAnalysis({
        ...basicAnalysis,
        aiContent: `<p class='text-red-400 font-bold'>⚠️ ${analysisLang === 'en' ? 'OpenAI connection error' : 'Lỗi kết nối OpenAI'}: ${error.message || (analysisLang === 'en' ? 'Please try again later' : 'Vui lòng thử lại sau')}</p>`
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <div className="glass-panel p-6 rounded-2xl shadow-xl border border-blue-400/20">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
           <div className="text-left">
             <h2 className="text-2xl font-bold text-blue-200 flex items-center gap-2">
                <BrainCircuit className="text-blue-400" /> Matrix Analysis Pro
             </h2>
             <p className="text-gray-400 text-xs mt-1">AI Engine v4.0: Rule-Based Logic & Behavioral Psychology</p>
           </div>
          
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setAnalysisLang(analysisLang === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-purple-400/50 transition-all"
              title={analysisLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <Globe size={14} />
              <span>{analysisLang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            {/* Mode Toggle */}
            <div className="flex bg-black/40 rounded-lg p-1">
              <button
                  onClick={() => { setMode(2); setAnalysis(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 2 ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                  {analysisLang === 'vi' ? '2 Chỉ Số' : '2 Indices'}
              </button>
              <button
                  onClick={() => { setMode(3); setAnalysis(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 3 ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                  {analysisLang === 'vi' ? '3 Chỉ Số' : '3 Indices'}
              </button>
            </div>
          </div>
        </div>

        {/* Hướng dẫn kết nối chỉ số */}
        <div className="mb-6 p-4 bg-black/20 rounded-lg border border-blue-500/20 text-gray-300 text-sm leading-relaxed">
          <h4 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
            <Layers size={16} /> {analysisLang === 'vi' ? 'Hướng dẫn chọn chỉ số để kết nối' : 'Guide to Selecting Indices for Connection'}
          </h4>
          <ul className="list-disc pl-5 space-y-2">
            {analysisLang === 'vi' ? (
              <>
                <li>Kết hợp <strong>Đường Đời + Nội Tâm + Sứ Mệnh</strong> (hoặc 2 trong 3 chỉ số) để biết về <strong>xu hướng cuộc đời, mô hình thành công, và lộ trình phát triển cá nhân</strong> của bạn.</li>
                <li>Kết hợp <strong>Nội Tâm + Thái Độ + Nhân Cách + Trưởng Thành</strong> (hoặc ít nhất Nội Tâm + 1 chỉ số khác trong nhóm) để biết về <strong>tính cách cốt lõi, cơ chế phản ứng dưới áp lực, và hướng trưởng thành hành vi</strong> của bạn.</li>
              </>
            ) : (
              <>
                <li>Combine <strong>Life Path + Soul + Mission</strong> (or 2 of 3 indices) to discover your <strong>life direction, success model, and personal development roadmap</strong>.</li>
                <li>Combine <strong>Soul + Attitude + Personality + Maturity</strong> (or at least Soul + 1 other index in this group) to understand your <strong>core character, stress response mechanisms, and behavioral growth direction</strong>.</li>
              </>
            )}
          </ul>
          <p className="mt-2 italic text-gray-400">
            {analysisLang === 'vi' ? 'Chọn đúng combo để nhận phân tích chuyên sâu từ AI Engine.' : 'Choose the right combo for in-depth AI Engine analysis.'}
          </p>
        </div>

        {/* *** Thêm input số điện thoại (mật khẩu) *** */}
        <div className="mb-6">
  <label className="block text-gray-300 mb-2 font-medium">{analysisLang === 'vi' ? 'Nhập Mã Thuê Bao:' : 'Enter Subscription Code:'}</label>
  <input
    type="text"
    value={phone}
    onChange={(e) => setPhone(e.target.value.trim())}
    className="w-full bg-black/30 text-white p-4 rounded-xl border border-white/10 focus:border-blue-500 text-lg"
    placeholder={analysisLang === 'vi' ? 'Nhập mã (ví dụ: 123123)' : 'Enter code (e.g. 123123)'}
  />
  {subscriptionMessage && (
    <p className={`mt-3 font-medium ${isValidSubscription ? 'text-green-400' : 'text-red-400'}`}>
      {subscriptionMessage}
    </p>
  )}
</div>

        {/* Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative">
             {inputs.slice(0, mode).map((input, idx) => (
               <div key={idx} className="bg-gradient-to-b from-white/10 to-white/5 p-5 rounded-2xl border border-white/10 relative group hover:border-blue-400/30 transition-all">
                  <div className="absolute -top-3 left-4 bg-gray-900 px-3 py-0.5 text-xs font-bold text-blue-300 rounded-full border border-blue-500/30">
                    {analysisLang === 'vi' ? `Lớp số ${idx + 1}` : `Layer ${idx + 1}`}
                  </div>
                  
                  <div className="mt-2 space-y-3">
                    <select
                        value={input.type}
                        onChange={(e) => handleInputChange(idx, 'type', e.target.value)}
                        className="w-full bg-black/20 text-blue-100 text-sm font-medium p-2.5 rounded-lg border border-white/5 focus:border-blue-500/50 outline-none appearance-none"
                    >
                        {Object.values(NumberType).map(t => {
                          const enLabels: Record<string, string> = {
                            [NumberType.LifePath]: 'Life Path',
                            [NumberType.HeartDesire]: 'Soul (Heart Desire)',
                            [NumberType.Mission]: 'Mission',
                            [NumberType.Personality]: 'Personality',
                            [NumberType.Attitude]: 'Attitude',
                            [NumberType.Maturity]: 'Maturity',
                            [NumberType.BirthDay]: 'Birth Day',
                            [NumberType.Intelligence]: 'Intelligence',
                          };
                          return <option key={t} value={t}>{analysisLang === 'en' ? enLabels[t] || t : t}</option>;
                        })}
                    </select>
                    
                    <div className="relative">
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={input.value}
                            onChange={(e) => handleInputChange(idx, 'value', e.target.value)}
                            className="w-full bg-transparent text-center text-4xl font-bold text-white p-2 focus:outline-none border-b border-white/10 focus:border-blue-400 transition-colors placeholder-white/10"
                        />
                        <div className="text-center text-xs text-gray-500 mt-1 uppercase tracking-widest">{analysisLang === 'vi' ? 'Nhập số' : 'Enter number'}</div>
                    </div>
                  </div>
               </div>
             ))}
             
             {/* Decorative Connectors */}
             <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent -z-10"></div>
        </div>

        {/* Action Button */}
        <button 
            onClick={handleDeepAnalyze}
            disabled={isAnalyzing}
            className={`w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all duration-500 ${isAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
        >
            <div className="flex items-center justify-center gap-3 relative z-10">
                {isAnalyzing ? (
                    <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span>{analysisLang === 'vi' ? 'Đang kích hoạt Deep Engine & Mapping dữ liệu...' : 'Activating Deep Engine & Data Mapping...'}</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={20} className="group-hover:text-yellow-300 transition-colors" />
                        <span>{analysisLang === 'vi' ? 'Kích Hoạt Phân Tích Chuyên Sâu' : 'Activate Deep Analysis'}</span>
                    </>
                )}
            </div>
        </button>

        {/* Results Area */}
        {analysis && (
            <div className="mt-10 animate-fadeIn space-y-8">
                {/* *** Thêm indicator nếu đang fetch sheet *** */}
                {isFetchingSheet && (
                  <div className="text-center mb-4 text-yellow-400 flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{analysisLang === 'vi' ? 'Đang đọc dữ liệu từ Google Sheet...' : 'Loading data from Google Sheet...'}</span>
                  </div>
                )}

                {/* Header Result */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 mb-3">
                        <Zap size={16} className="fill-blue-400 text-blue-400" />
                        <span className="font-bold tracking-wide uppercase">{analysis.relationship}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{analysis.keywords}</h3>
                </div>

                {/* AI Content - Matrix Analysis */}
                {analysis.aiContent ? (
                    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 leading-relaxed text-gray-200 shadow-2xl">
                        <div className="prose prose-invert prose-blue max-w-none">
                            <div className="ai-content-styled" dangerouslySetInnerHTML={{ __html: analysis.aiContent }} />
                        </div>
                    </div>
                ) : (
                    /* Fallback Static Content */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-900/10 p-6 rounded-2xl border border-emerald-500/20">
                           <p>{analysisLang === 'vi' ? 'Hệ thống đang chờ kết nối...' : 'System waiting for connection...'}</p>
                        </div>
                    </div>
                )}

                {/* Peaks & Challenges Table with Sheet Meanings */}
                {sharedResults && sharedResults.peaks && sharedResults.challenges && (
                  <PeaksChallengesSection
                    sharedResults={sharedResults}
                    sheetData={sheetData}
                    language={analysisLang}
                  />
                )}

                {/* Chatbot Button Trigger */}
                <div className="mt-8">
                   <button
                    onClick={() => setIsChatbotOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 border border-emerald-400/30"
                   >
                     <MessageCircle size={22} />
                     <span>{analysisLang === 'vi' ? 'Hỏi Chuyên Sâu Về Kết Quả (AI Chatbot)' : 'Ask In-Depth Questions (AI Chatbot)'}</span>
                   </button>
                </div>
            </div>
        )}
      </div>

   {isChatbotOpen && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="w-full max-w-2xl">
      <Chatbot
        sharedResults={sharedResults}
        sheetData={sheetData}
        onClose={() => setIsChatbotOpen(false)}
        language={analysisLang} // Truyền analysisLang để chatbot có thể trả lời bằng tiếng Anh
      />
    </div>
  </div>
)}
      {/* CSS for AI Content specific styling */}
      <style>{`
        .ai-content-styled h3 {
            color: #fca5a5; /* red-300ish/pink */
            font-size: 1.4rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 800;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .ai-content-styled h4 {
            color: #93c5fd; /* blue-300 */
            font-size: 1.15rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            font-weight: 700;
            display: flex;
            align-items: center;
        }
        .ai-content-styled h4::before {
            content: '◈';
            display: inline-block;
            margin-right: 8px;
            color: #60a5fa;
            font-size: 0.9em;
        }
        .ai-content-styled p {
            margin-bottom: 1rem;
            color: #e5e7eb; /* gray-200 */
            line-height: 1.8;
            text-align: justify;
        }
        .ai-content-styled ul {
            list-style-type: none;
            padding-left: 0;
            margin-bottom: 1.5rem;
            background: rgba(255,255,255,0.03);
            border-radius: 0.5rem;
            padding: 1rem;
        }
        .ai-content-styled li {
            margin-bottom: 0.8rem;
            padding-left: 1.5rem;
            position: relative;
            color: #d1d5db;
        }
        .ai-content-styled li:last-child {
            margin-bottom: 0;
        }
        .ai-content-styled li::before {
            content: '•';
            position: absolute;
            left: 0.25rem;
            color: #818cf8; /* indigo-400 */
            font-weight: bold;
            font-size: 1.2em;
            line-height: 1;
        }
        .ai-content-styled strong {
            color: #fff;
            font-weight: 700;
            color: #fbbf24; /* amber-300 */
        }
        .ai-content-styled em {
            color: #a5b4fc;
            font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default ConnectionTool;
