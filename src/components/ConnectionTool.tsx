import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Zap, RefreshCw, Sparkles, BrainCircuit, Briefcase, GraduationCap, MessageCircle, Calendar, Mountain, AlertTriangle, Globe, ChevronDown, ChevronUp, Download, Mail } from 'lucide-react';
import { analyzeConnectionLogic } from '@/utils/numerologyUtils';
import { ConnectionAnalysisResult, NumberType, SheetMeaning, CalculationResult } from '@/types';
import { fetchMeanings, getMeaning } from '../services/googleSheetService';
import Chatbot from './Chatbot';
import { getAvailableEngines, AIEngine } from '@/actions/openai';
import { deepNumberKnowledge } from '@/utils/deepNumberKnowledge';
import { buildFullAnalysis, IndexInput } from '@/utils/numerologyAnalysis';

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
      1. **Độ dài & Chi tiết:** ${isSpecial ? 'BẮT BUỘC mỗi mục phân tích nhỏ (thẻ li) phải dài ít nhất 600 từ, chia thành 4 phần mỗi phần ít nhất 150 từ: (a) phân tích năng lượng, (b) tương tác/kết hợp, (c) ví dụ thực tế, (d) chuyển hóa/hậu quả. Mỗi phần h3 phải dài ít nhất 2000-3000 từ tổng cộng.' : 'Giữ phân tích ngắn gọn, súc tích, đi thẳng vào vấn đề.'} Hãy đưa ra ví dụ thực tế cụ thể (trong công sở, gia đình, quản lý tài chính...).
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
  const [subscriptions, setSubscriptions] = useState<{ phone: string; regDate: string; balance: number }[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null); // Số dư tài khoản (VND)

  // *** CACHE SYSTEM — Lưu kết quả phân tích để không gọi API lại ***
  const CACHE_PREFIX = 'analysis_cache_';
  const CACHE_EXPIRY_DAYS = 30;

  // Chuẩn hoá tên: bỏ dấu, viết hoa, gộp khoảng trắng → cùng người = cùng key
  const normalizeName = (raw: string | undefined): string => {
    if (!raw) return 'ANON';
    return raw.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().trim().replace(/\s+/g, '_');
  };

  const getCacheKey = (comboType: string, values: number[], engine: string, userName: string | undefined) => {
    const sorted = [...values].sort((a, b) => a - b);
    const nameKey = normalizeName(userName);
    // Key = engine + tên người + loại tổ hợp + bộ số. Cùng tên + bộ số → lấy lại bài cũ, KHÔNG gọi API.
    return `${CACHE_PREFIX}${engine}_${nameKey}_${comboType}_${sorted.join('_')}`;
  };

  const getFromCache = (cacheKey: string): string | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      const { content, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age > CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return content;
    } catch { return null; }
  };

  const saveToCache = (cacheKey: string, content: string) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ content, timestamp: Date.now() }));
    } catch (e) {
      // localStorage full — clear oldest caches
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      if (keys.length > 0) {
        keys.sort();
        localStorage.removeItem(keys[0]);
        try { localStorage.setItem(cacheKey, JSON.stringify({ content, timestamp: Date.now() })); } catch {}
      }
    }
  };

  // *** CHI PHÍ ƯỚC TÍNH ***
  const COST_PER_ANALYSIS: Record<string, number> = {
    claude: 26000,
    openai: 2900,
    gemini: 4200,
  };

  const PRICE_PER_ANALYSIS: Record<string, number> = {
    claude: 30000,
    openai: 5000,
    gemini: 7000,
  };

  // State ngôn ngữ phân tích (tách biệt với language prop của app)
  const [analysisLang, setAnalysisLang] = useState<'vi' | 'en'>(language);

  // State chatbot
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // === Hidden AI Engine Switch (password protected) ===
  // Mặc định Gemini (chất lượng cao nhất, output 65K không bị cắt). OpenAI/Claude chỉ dùng qua nút admin.
  const [aiEngine, setAiEngine] = useState<AIEngine>('gemini');
  const [showEngineSwitch, setShowEngineSwitch] = useState(false);
  const [enginePassword, setEnginePassword] = useState('');
  const [engineUnlocked, setEngineUnlocked] = useState(false);
  const enginePasscodes = ['25021987', '0208'];

  // Auto-detect engine: ƯU TIÊN GEMINI → OpenAI → Claude
  useEffect(() => {
    getAvailableEngines().then(engines => {
      console.log('[Engine] Available:', engines);
      if (engines.includes('gemini')) {
        setAiEngine('gemini');
      } else if (engines.includes('openai')) {
        setAiEngine('openai');
      } else if (engines.includes('claude')) {
        setAiEngine('claude');
      }
    });
  }, []);

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
        // Cột: phone, regDate, balance (tùy chọn)
        const lines = csvText.split('\n').map(line => line.trim());
        const subs = lines.slice(1).filter(line => line).map(line => {
          const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
          const [phone, regDate, balanceStr] = cells;
          const balance = balanceStr ? parseInt(balanceStr) || 0 : 0;
          return { phone, regDate, balance };
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
    if (['8888', 'admin', 'vip', '0208'].includes(trimmedCode)) {
       const isAdmin = trimmedCode === '0208';
       setSubscriptionMessage(isEn ? `Authentication successful (${isAdmin ? 'Admin' : 'Test'} mode).` : `Xác thực thành công (${isAdmin ? 'Quản trị viên' : 'Chế độ Dự phòng/Test'}).`);
       setIsValidSubscription(true);
       setUserBalance(999999); // Unlimited
       return true;
    }

    const sub = subscriptions.find(s => s.phone.trim() === trimmedCode);

    if (!sub) {
      setSubscriptionMessage(isEn ? 'Code does not exist or is not registered.' : 'Mã không tồn tại hoặc chưa đăng ký.');
      setIsValidSubscription(false);
      setUserBalance(null);
      return false;
    }

    try {
      const regDate = new Date(sub.regDate);
      if (isNaN(regDate.getTime())) throw new Error('Invalid date');

      const now = new Date();
      const expiryDate = new Date(regDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (now <= expiryDate) {
        setUserBalance(sub.balance);
        const balanceInfo = sub.balance > 0 ? ` | Số dư: ${sub.balance.toLocaleString('vi-VN')}₫` : '';
        setSubscriptionMessage(isEn ? `Subscription valid ✓${balanceInfo}` : `Thuê bao hợp lệ ✓${balanceInfo}`);
        setIsValidSubscription(true);
        return true;
      } else {
        setSubscriptionMessage(isEn ? 'Subscription expired. Please renew!' : 'Thuê bao đã hết hạn. Vui lòng gia hạn!');
        setIsValidSubscription(false);
        setUserBalance(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionMessage(isEn ? 'Error verifying code. Please try again.' : 'Lỗi kiểm tra mã. Vui lòng thử lại.');
      setIsValidSubscription(false);
      setUserBalance(null);
      return false;
    }
  };

  const handleDeepAnalyze = async (forceRefresh: boolean = false) => {
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

// === PHẦN KIẾN THỨC SÂU VỀ CÁC CON SỐ ===
const deepContext = activeInputs.map(input => {
  const profile = deepNumberKnowledge[input.value.toString()] || deepNumberKnowledge[input.value];
  if (!profile) return '';

  return `### KIẾN THỨC SÂU VỀ SỐ ${input.value} (${profile.name}):
**Vai trò chỉ số:** ${input.type}
**Hành tinh:** ${profile.planet}
**Từ khóa năng lượng gốc:** ${profile.keywords.join(', ')}
**Ưu điểm (advantages):** ${profile.advantages}
**Thách thức (challenges):** ${profile.challenges}
**Cân bằng (balance):** ${profile.balance}
**Gợi ý nghề nghiệp:** ${profile.careerSuggestions}
**Thông điệp cốt lõi:** ${profile.coreMessage || ''}`;
}).join('\n\n');

// === PHÂN TÍCH TƯƠNG TÁC NĂNG LƯỢNG GIỮA CÁC SỐ ===
const interactionAnalysis = (() => {
  if (activeInputs.length < 2) return '';

  const profiles = activeInputs.map(i => ({
    type: i.type,
    value: i.value,
    profile: deepNumberKnowledge[i.value.toString()] || deepNumberKnowledge[i.value]
  })).filter(p => p.profile);

  if (profiles.length < 2) return '';

  // Phân loại nhóm năng lượng
  const getEnergyGroup = (keywords: string[]) => {
    const kw = keywords.join(' ').toLowerCase();
    if (/lãnh đạo|tiên phong|quyết đoán|độc lập|hành động|mục tiêu|quyền lực|thành tựu/.test(kw)) return 'Hành động';
    if (/yêu thương|nhạy cảm|hòa hợp|kết nối|chia sẻ|quan tâm|gia đình|trách nhiệm|bảo vệ/.test(kw)) return 'Cảm xúc';
    if (/sáng tạo|biểu đạt|giao tiếp|tự do|phiêu lưu|thay đổi|linh hoạt/.test(kw)) return 'Sáng tạo';
    if (/trí tuệ|phân tích|chiều sâu|nghiên cứu|triết học|nội tâm|chiêm nghiệm/.test(kw)) return 'Trí tuệ';
    return 'Tổng hợp';
  };

  const groups = profiles.map(p => ({
    ...p,
    group: getEnergyGroup(p.profile.keywords)
  }));

  // Tạo bản đồ tương tác
  const pairs: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i];
      const b = groups[j];
      const sameGroup = a.group === b.group;
      const relType = sameGroup ? 'ĐỒNG HƯỚNG (khuếch đại)' : 'BỔ TRỢ/TƯƠNG PHẢN (cân bằng)';

      pairs.push(`
--- ${a.type} (số ${a.value}) ↔ ${b.type} (số ${b.value}) ---
**Quan hệ:** ${relType}
**Nhóm năng lượng:** ${a.value} = ${a.group} | ${b.value} = ${b.group}
**Năng lượng gốc ${a.type} (${a.value}):** ${a.profile.keywords.slice(0, 4).join(', ')} → Hướng đến: ${a.profile.coreMessage || a.profile.keywords[0]}
**Năng lượng gốc ${b.type} (${b.value}):** ${b.profile.keywords.slice(0, 4).join(', ')} → Hướng đến: ${b.profile.coreMessage || b.profile.keywords[0]}
**Khi hoà hợp:** ${a.profile.advantages.split('\n')[0]} + ${b.profile.advantages.split('\n')[0]} → tạo sức mạnh cộng hưởng
**Khi xung đột:** ${a.profile.challenges.split('\n')[0]} gặp ${b.profile.challenges.split('\n')[0]} → tạo ma sát nội tại
**Chìa khóa cân bằng:** ${a.profile.balance.split('\n')[0]} kết hợp ${b.profile.balance.split('\n')[0]}
${sameGroup ? `⚠️ Cùng nhóm ${a.group}: năng lượng khuếch đại mạnh — ưu điểm rất nổi bật nhưng thách thức cũng nhân đôi. Dễ cực đoan nếu thiếu ý thức.` : `💡 Khác nhóm (${a.group} ↔ ${b.group}): tạo sự đa chiều — ${a.value} bổ sung điều ${b.value} thiếu và ngược lại. VD: ${a.type} số ${a.value} (${a.group}) làm dịu/kích hoạt ${b.type} số ${b.value} (${b.group}).`}`);
    }
  }

  return `\n\n=== BẢN ĐỒ TƯƠNG TÁC NĂNG LƯỢNG GIỮA CÁC CHỈ SỐ ===
⚠️ BẮT BUỘC sử dụng bản đồ tương tác này khi phân tích. Đây là nền tảng để hiểu CÁC SỐ TÁC ĐỘNG LẪN NHAU như thế nào — không chỉ phân tích riêng lẻ.
Ví dụ: Đường Đời 7 + Nội Tâm 7 = hướng nội rất mạnh, khép kín → nhưng nếu Sứ Mệnh là 5 hoặc 3, năng lượng biểu đạt/tự do sẽ làm dịu sự cô độc, tạo cầu nối ra bên ngoài.

${pairs.join('\n')}

=== NGUYÊN LÝ PHÂN TÍCH TƯƠNG TÁC ===
Khi phân tích tổ hợp, PHẢI xem xét:
1. **Vai trò từng chỉ số:** Đường Đời = con đường cuộc đời phải đi; Nội Tâm = khao khát sâu thẳm bên trong; Sứ Mệnh = nhiệm vụ phải hoàn thành; Nhân Cách = cách thế giới nhìn thấy bạn; Thái Độ = phản ứng tức thời; Trưởng Thành = hướng phát triển về sau
2. **Hiệu ứng hoà hợp:** Khi 2+ số cùng nhóm năng lượng → khuếch đại (VD: ĐĐ 7 + NT 7 = trí tuệ cực mạnh nhưng cô độc cực sâu)
3. **Hiệu ứng làm dịu:** Khi 1 số khác nhóm xen vào → điều hoà (VD: SM 3 làm dịu sự khép kín của 7+7 bằng năng lượng giao tiếp)
4. **Hiệu ứng xung đột:** Khi challenges của số này đụng advantages của số kia → giằng xé nội tại (VD: challenges "cái tôi cao" của 1 đụng advantages "khiêm nhường" của 2)`;
})();

// === PHÂN TÍCH HỆ THỐNG: Ngũ Hành + Âm Dương + Tương Thích + Liên Kết ===
const analysisInputs: IndexInput[] = activeInputs.map(i => ({ type: i.type, value: i.value }));
const systematicAnalysis = buildFullAnalysis(analysisInputs, analysisLang);

// Kết hợp tất cả
const fullContext = contextData + '\n\n' + deepContext + interactionAnalysis + '\n\n' + systematicAnalysis;
    
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
            Bạn đang viết MỘT PHẦN NHỎ trong bài phân tích tổ hợp số ${activeInputs.map(i => `${i.type}: ${i.value}`).join(', ')}.

            ⛔⛔ QUY TẮC SỐ 1 — QUAN TRỌNG NHẤT, TUYỆT ĐỐI TUÂN THỦ:
            - Bạn CHỈ ĐƯỢC viết DUY NHẤT (các) mục có tiêu đề được liệt kê ở CUỐI prompt này (sau dòng "BÊN DƯỚI LÀ PHẦN DUY NHẤT CẦN VIẾT").
            - TUYỆT ĐỐI KHÔNG viết bất kỳ mục/tiêu đề nào KHÁC. KHÔNG tự bịa thêm tiêu đề mới (ví dụ KHÔNG tự tạo "Phân tích tương tác năng lượng", "Sự nghiệp & Tài chính", "Lộ trình phát triển"... nếu chúng KHÔNG có trong phần được giao).
            - KHÔNG viết lại toàn bộ bài phân tích. KHÔNG nhắc lại các mục đã thuộc về phần khác.
            - Viết xong (các) mục được giao thì DỪNG NGAY LẬP TỨC, không viết thêm gì.

            ⛔ Phần khung bên dưới là DÀN Ý để bạn TỰ PHÂN TÍCH, KHÔNG PHẢI template để điền vào. Bạn PHẢI:
            - Tra cứu dữ liệu KIẾN THỨC SÂU bên dưới để tìm từ khóa, ưu điểm, thách thức, trạng thái cân bằng của từng số (dữ liệu gốc ghi bằng tiếng Anh nhưng BẠN PHẢI viết ra bằng TIẾNG VIỆT).
            - TỰ VIẾT nội dung phân tích MỚI HOÀN TOÀN cho bộ số ${activeInputs.map(i => i.value).join(' + ')}
            - KHÔNG copy/paraphrase bất kỳ câu nào từ dàn ý. Dàn ý nói "Phân tích X" thì bạn phải TỰ phân tích X, không viết lại "Phân tích X".

            === DỮ LIỆU GỐC TỪ GOOGLE SHEET (Hành vi/Tính cách) ===
            ${contextData}

            === DỮ LIỆU KIẾN THỨC SÂU VỀ CÁC SỐ (BẮT BUỘC SỬ DỤNG LÀM NỀN TẢNG) ===
            ${deepContext}

            === BẢN ĐỒ TƯƠNG TÁC NĂNG LƯỢNG (BẮT BUỘC THAM CHIẾU KHI PHÂN TÍCH) ===
            ${interactionAnalysis}

            === PHÂN TÍCH HỆ THỐNG: NGŨ HÀNH + ÂM DƯƠNG + TƯƠNG THÍCH + LIÊN KẾT ===
            ${systematicAnalysis}

            === CÁCH SỬ DỤNG DỮ LIỆU KIẾN THỨC SÂU ===
            Khi phân tích MỖI điểm, bạn PHẢI:
            1. Tra từ khóa / ưu điểm / thách thức / trạng thái cân bằng của từng số trong bộ từ dữ liệu trên (KHI VIẾT RA phải dùng tiếng Việt, KHÔNG dùng từ tiếng Anh)
            2. Nhận diện năng lượng lõi: VD số 5 có keywords "Tự do, Phiêu lưu, Thay đổi" → năng lượng lõi = trải nghiệm + không ràng buộc
            3. Phân tích TỔ HỢP: khi năng lượng số ${activeInputs[0]?.value} gặp năng lượng số ${activeInputs[1]?.value || activeInputs[0]?.value} → tạo ra hiệu ứng gì MỚI?
            4. Trích dẫn rõ ràng: "Số ${activeInputs[0]?.value} với đặc điểm [trích từ keywords]..." + "Kết hợp số ${activeInputs[1]?.value || ''} có [trích từ advantages]..." + "Xung đột xảy ra vì [trích từ challenges]..."
            5. Đưa ví dụ thực tế CỤ THỂ trong công việc, tình cảm, tài chính, gia đình

            ${modifiers}

            === YÊU CẦU ĐỊNH DẠNG & CHẤT LƯỢNG ===
            - Trả về HTML sạch (chỉ dùng h3, h4, ul, li, p, strong). KHÔNG dùng markdown.
            - Mỗi phần h3 phải có nội dung phân tích sâu, diễn giải chi tiết.
            - MỖI mục (li) PHẢI có đủ 4 yếu tố: (a) Năng lượng gốc của số — trích keywords, advantages, challenges từ KIẾN THỨC SÂU. (b) Tương tác khi kết hợp — phân tích hiệu ứng tổ hợp dựa trên BẢN ĐỒ TƯƠNG TÁC. (c) Ví dụ thực tế — tình huống cụ thể trong công việc, tình cảm, tài chính. (d) Chuyển hóa — phiên bản thấp (vô thức) vs phiên bản cao (tỉnh thức), hành động cụ thể.
            - TRỌNG TÂM: Phân tích CÁCH CÁC SỐ TƯƠNG TÁC với nhau (khuếch đại, bổ trợ, xung đột, làm dịu) — KHÔNG chỉ liệt kê đặc điểm từng số riêng lẻ.
            - TUYỆT ĐỐI tuân thủ toàn bộ quy tắc trong Rule Engine.

            === NGÔN NGỮ OUTPUT — QUY TẮC TUYỆT ĐỐI ===
            ${analysisLang === 'en' ? 'BẮT BUỘC viết TOÀN BỘ output bằng TIẾNG ANH (English). Tất cả tiêu đề h3, h4, nội dung p, li đều phải bằng tiếng Anh. Giữ nguyên cấu trúc framework nhưng dịch toàn bộ nội dung sang English.' : 'BẮT BUỘC viết TOÀN BỘ bằng TIẾNG VIỆT THUẦN TÚY. KHÔNG được dùng BẤT KỲ từ tiếng Anh nào — kể cả trong ngoặc đơn, tiêu đề, thuật ngữ chuyên môn.\n⛔ ĐẶC BIỆT: TUYỆT ĐỐI KHÔNG dùng các từ tiếng Anh sau (dù dữ liệu gốc ghi bằng tiếng Anh) — PHẢI dịch sang tiếng Việt: "keywords"→"từ khóa", "advantages"→"ưu điểm", "challenges"→"thách thức", "balance"→"trạng thái cân bằng", "pattern"→"khuôn mẫu", "mindfulness"→"chánh niệm", "impact investing"→"đầu tư tác động", "accountability partner"→"người đồng hành giám sát", "startup"→"công ty khởi nghiệp", "deadline"→"hạn chót", "think-tank"→"nhóm chuyên gia cố vấn", "awkward"→"ngượng ngùng", "ultimatum"→"tối hậu thư", "mentor"→"người cố vấn", "insight"→"sự thấu hiểu".\nKHÔNG viết kiểu "theo advantages của số 9" hay "challenges của số 7" — PHẢI viết "theo ưu điểm của số 9", "thách thức của số 7".'}

            === BÊN DƯỚI LÀ PHẦN DUY NHẤT CẦN VIẾT (chỉ viết đúng các mục có tiêu đề dưới đây, viết xong thì DỪNG) ===
      `;

      let promptParts: string[] = [];

        if (comboInfo.comboType === 'coreMissionLife') {
            // CHIA 3 PHẦN ĐỂ VƯỢT GIỚI HẠN TOKEN — MỖI PHẦN 16384 TOKENS
            const coreInstruction = `⚠️ CHỈ THỊ BẮT BUỘC: AI PHẢI tự phân tích dựa trên năng lượng cụ thể của bộ số ${activeInputs.map(i => i.value).join(' + ')} từ DỮ LIỆU KIẾN THỨC SÂU. KHÔNG copy template. KHÔNG viết “Số A”, “chỉ số X” — PHẢI thay bằng số thực tế. Mỗi phần PHẢI có ví dụ hành vi cụ thể. Phần chuyển hóa PHẢI nói rõ: từ hành vi gì CỤ THỂ → chuyển sang hành vi gì CỤ THỂ.
⚠️ GIỚI HẠN ĐỘ DÀI QUAN TRỌNG: Mỗi mục (li) viết SÚC TÍCH 130-180 từ. PHẢI HOÀN THÀNH ĐỦ TẤT CẢ CÁC MỤC trong phần này rồi mới dừng — KHÔNG viết lan man dài dòng khiến không kịp hoàn thành. Viết ĐỦ Ý quan trọng hơn viết DÀI.`;

            // PHẦN 1: Sections 1-3 (Bản chất + Cơ chế + Hồ sơ tính cách)
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Hãy viết THẬT CHI TIẾT cho phần dưới đây. PHẢI HOÀN THÀNH TẤT CẢ CÁC MỤC — không bỏ sót mục nào.

<h3>1. BẢN CHẤT & ĐỘNG LỰC CỐT LÕI</h3>
<p>Phân tích bộ số ${activeInputs.map(i => i.value).join(' + ')} theo các lớp sau.</p>
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
            `);

            // PHẦN: Section 2 — Cơ chế tâm lý
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h3>2. CƠ CHẾ TÂM LÝ & MÔ HÌNH TƯƠNG TÁC</h3>
<p>Phân tích cơ chế vận hành tâm lý của bộ số ${activeInputs.map(i => i.value).join(' + ')}. PHẢI dựa trên challenges và advantages cụ thể.</p>
<ul>
<li><strong>Trạng thái thuận lợi và căng thẳng:</strong> Khi thuận lợi, số nào chi phối và biểu hiện cụ thể? Khi áp lực, phản ứng cụ thể gì (kiểm soát/né tránh/bùng nổ/thu mình)? Ví dụ tình huống thất bại dự án, tranh cãi gia đình.</li>
<li><strong>Cơ chế phòng vệ & điểm kích hoạt:</strong> Khi tổn thương → đổ lỗi/tự trách/kiểm soát/cô lập? Điều gì dễ khiến mất cân bằng nhất? (dựa trên challenges). Ví dụ tình huống thực.</li>
<li><strong>Mô hình hành vi lặp lại:</strong> Khuôn mẫu vô thức nào tái diễn khi xung đột? Vòng lặp cụ thể trong mối quan hệ, công việc.</li>
<li><strong>Xung đột nội tại:</strong> Các số có hỗ trợ hay mâu thuẫn? 3 loại xung đột (nội tâm/hành vi/môi trường). Biểu hiện: mệt mỏi, thiếu động lực, tự nghi ngờ — giải thích TẠI SAO dựa trên tổ hợp số cụ thể.</li>
<li><strong>Cơ chế cân bằng & hướng dẫn phục hồi:</strong> Khi kiệt sức, quay về thói quen số nào? Cách phá vỡ vòng lặp tiêu cực — hành động cụ thể.</li>
</ul>
            `);

            // PHẦN: Section 3 — Hồ sơ tính cách
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h3>3. HỒ SƠ TÍNH CÁCH CHUYÊN SÂU</h3>
<p>⚠️ Phần này CỰC KỲ QUAN TRỌNG — phải vẽ ra được “chân dung tâm lý” rõ nét để người đọc NHÌN THẤY được người mang bộ số ${activeInputs.map(i => i.value).join(' + ')} là người như thế nào.</p>
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
            `);

            // PHẦN 2: Sections 4-5 + ENGINE + BÀI HỌC NHÂN-DUYÊN-QUẢ
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết, HOÀN THÀNH ĐỦ các mục. KHÔNG lặp lại nội dung đã viết.

<h3>4. ỨNG DỤNG THỰC TẾ</h3>

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
            `);

            // PHẦN: Section 4 (tiếp) — Sale/Coach/Tư vấn
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước (mục 4. Ứng dụng thực tế). Viết chi tiết phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h4>🤝 Gợi Ý Cho Sale/Coach/Tư Vấn (Ứng dụng thực tế — tiếp):</h4>
<p>⚠️ PHẢI cho biết: người mang bộ số ${activeInputs.map(i => i.value).join(' + ')} THÍCH gì, MONG MUỐN gì từ dịch vụ — để sale biết cách tư vấn có lợi.</p>
<ul>
<li><strong>Họ bị thu hút bởi điều gì:</strong> Kết quả thực tế? Câu chuyện cảm hứng? Dữ liệu logic? Sự mới mẻ? Sự an toàn? (dựa trên keywords + advantages).</li>
<li><strong>Cách tiếp cận hiệu quả:</strong> Mở đầu thế nào? Giọng nói/phong cách nên dùng? Trình bày sản phẩm theo cách nào? Ví dụ kịch bản tư vấn cụ thể.</li>
<li><strong>Điểm kích hoạt cảm xúc để mở lòng:</strong> Chạm vào mong muốn gì sẽ khiến họ quan tâm? Nỗi sợ nào có thể khai thác tích cực?</li>
<li><strong>Điều TUYỆT ĐỐI không nên nói/làm:</strong> Hành vi nào khiến họ đóng cửa? (dựa trên challenges + điểm kích hoạt). Ví dụ sai lầm sale hay gặp.</li>
<li><strong>Cách chốt quyết định:</strong> Cho họ cảm giác kiểm soát/an toàn/cơ hội? Xử lý từ chối đúng nỗi sợ gốc. Ví dụ kịch bản chốt cụ thể.</li>
</ul>
            `);

            // PHẦN: Section 5 — ENGINE 5 bước
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết phần dưới đây, HOÀN THÀNH ĐỦ cả 5 bước. KHÔNG lặp lại nội dung đã viết.

<h3>5. PHÂN TÍCH KẾT NỐI CHỈ SỐ CHUYÊN SÂU</h3>

<p><strong>⚠️ CHỈ THỊ QUAN TRỌNG — ĐÂY LÀ LỆNH PHÂN TÍCH, KHÔNG PHẢI TEMPLATE ĐỂ COPY:</strong></p>
<p>Bạn PHẢI dùng nó như KHUNG TƯ DUY để tự phân tích dựa trên các số cụ thể: ${activeInputs.map(i => i.value).join(', ')}.</p>

<ul>
<li>
<strong>Bước 1 — Nhận diện năng lượng lõi:</strong>
<p>Dựa trên dữ liệu KIẾN THỨC SÂU (keywords, advantages, challenges), xác định CỤ THỂ năng lượng lõi của từng số đang tra cứu. KHÔNG ĐƯỢC viết chung chung — PHẢI gọi tên cụ thể.</p>
</li>

<li>
<strong>Bước 2 — Phân loại mối quan hệ giữa các số:</strong>
<p>Xác định quan hệ: Đồng hướng (cùng nhóm → khuếch đại), Bổ trợ (khác nhóm nhưng hỗ trợ), hay Tương phản (đối lập → xung đột nhưng tiềm năng tiến hóa cao). Giải thích CỤ THỂ tại sao.</p>
</li>

<li>
<strong>Bước 3 — Tạo trục năng lượng kết hợp:</strong>
<p>Tạo trục dạng “X ↔ Y” dựa trên năng lượng thực sự của bộ số. PHẢI giải thích trục này chi phối hành vi, quyết định, cảm xúc như thế nào trong đời sống thực.</p>
</li>

<li>
<strong>Bước 4 — Phân tích 5 lớp (mỗi lớp 120-160 từ, SÚC TÍCH, đủ cả 5 lớp):</strong>
<ul>
<li><strong>Bản chất mới khi kết hợp:</strong> Khi kết hợp các năng lượng lõi, “con người mới” này có bản chất gì? Họ khác gì so với từng số riêng lẻ? Đưa ví dụ cụ thể: cách họ ra quyết định, cách họ yêu, cách họ làm việc.</li>
<li><strong>Cơ chế vận hành tâm lý:</strong> Khi bình thường, số nào chi phối? Khi căng thẳng, số nào lấn át? Phản ứng cụ thể trong tình huống: mâu thuẫn công sở, áp lực tài chính, xung đột gia đình.</li>
<li><strong>Sức mạnh tổ hợp:</strong> Tổ hợp này tạo ra lợi thế gì mà từng số riêng lẻ không có? Ứng dụng cụ thể trong kinh doanh, lãnh đạo, sáng tạo, hay kết nối.</li>
<li><strong>Lệch hướng tiêu cực:</strong> Khi mất cân bằng, tổ hợp này dẫn đến hành vi tiêu cực gì? PHẢI cụ thể: đào hoa, mạo hiểm tài chính, lệ thuộc cảm xúc, kiểm soát quá mức, sa đà tệ nạn... tùy theo bộ số thực tế.</li>
<li><strong>Phát triển và chuyển hóa:</strong> Kỹ năng cụ thể cần rèn luyện để chuyển từ phiên bản thấp sang cao. Thói quen hàng ngày cần xây dựng.</li>
</ul>
</li>

<li>
<strong>Bước 5 — Sinh kịch bản 3 trạng thái (PHẢI VIẾT CỤ THỂ, KHÔNG CHUNG CHUNG):</strong>
<ul>
<li><strong>Khi đúng hướng (phiên bản cao):</strong> Họ trở thành ai? Hành vi cụ thể? Thành tựu đạt được?</li>
<li><strong>Khi lệch (phiên bản thấp):</strong> Họ rơi vào vòng xoáy gì? Hành vi tự phá hoại cụ thể?</li>
<li><strong>Khi trưởng thành (cân bằng):</strong> Họ học được gì? Chuyển hóa cụ thể nào?</li>
</ul>
</li>
</ul>
            `);

            // PHẦN: Section 6 + 7 — Nhân-Duyên-Quả + Lộ trình
            promptParts.push(`
                ${commonInstructions}

${coreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết 2 phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h3>6. BÀI HỌC NHÂN – DUYÊN – QUẢ & CHUYỂN HÓA TÍNH CÁCH</h3>
<p><strong>⚠️ ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT — PHẢI PHÂN TÍCH DỰA TRÊN TỔ HỢP SỐ ${activeInputs.map(i => i.value).join(' + ')}, KHÔNG ĐƯỢC VIẾT CHUNG CHUNG HAY COPY TEMPLATE:</strong></p>
<ul>

<li>
<strong>Tổng kết nghiệp tính cách:</strong>
<p>Dựa trên KIẾN THỨC SÂU: Số ${activeInputs[0]?.value} có keywords gì, challenges gì → tạo xu hướng tâm lý cụ thể nào? Số ${activeInputs[1]?.value || 'tiếp theo'} tạo xu hướng gì? Khi kết hợp → phiên bản cao (tích cực) biểu hiện CỤ THỂ ra sao trong đời sống? Phiên bản thấp (tiêu cực) dẫn đến hành vi gì? PHẢI đưa ví dụ tình huống thực: công việc, tình cảm, tài chính.</p>
</li>

<li>
<strong>Phước phần (tài năng bẩm sinh từ tổ hợp này):</strong>
<p>Tổ hợp ${activeInputs.map(i => i.value).join(' + ')} mang lại tài năng bẩm sinh cụ thể gì? Cơ hội nào mở ra khi dùng đúng? Thế mạnh cạnh tranh so với người khác là gì? Đưa ví dụ nghề nghiệp, vai trò xã hội cụ thể.</p>
</li>

<li>
<strong>Nghiệp cần chuyển hóa (dựa trên challenges của bộ số):</strong>
<p>Tổ hợp này dễ rơi vào bẫy tâm lý gì? PHẢI phân tích CỤ THỂ cho bộ số đang tra. Mô tả cách sai lầm lặp lại — tự phá cơ hội như thế nào?</p>
</li>

<li>
<strong>Nếu không chuyển hóa — hậu quả cụ thể:</strong>
<p>Với tổ hợp ${activeInputs.map(i => i.value).join(' + ')}, nếu không nhận ra khuôn mẫu tiêu cực: Sức khỏe tâm lý bị ảnh hưởng cụ thể ra sao? Quan hệ đổ vỡ theo kiểu nào? Thất bại lặp lại ở đâu? Đưa ví dụ kịch bản đời sống thực.</p>
</li>

<li>
<strong>Nếu chuyển hóa — con đường cụ thể:</strong>
<p>Với bộ số này, chuyển hóa CỤ THỂ nghĩa là gì? PHẢI nói: “Khi số X khiến bạn muốn [hành vi cũ cụ thể], hãy chuyển sang [hành vi mới cụ thể]”. Mỗi chuyển hóa phải có hành động thực tế kèm theo.</p>
</li>

<li>
<strong>Chu kỳ nhân – duyên – quả (phân tích cho bộ số cụ thể):</strong>
<p><strong>Nhân:</strong> Suy nghĩ/niềm tin gốc rễ nào chi phối hành vi? <strong>Duyên:</strong> Môi trường/tình huống nào kích hoạt khuôn mẫu tiêu cực? <strong>Quả:</strong> Kết quả cuộc đời cụ thể khi khuôn mẫu này lặp đi lặp lại?</p>
</li>

<li>
<strong>Bài học phát triển:</strong>
<p>Bài học lớn nhất cho tổ hợp này là gì? Cân bằng giữa điều gì và điều gì CỤ THỂ? Mỗi bài học phải kèm theo hành động thực tế có thể áp dụng ngay.</p>
</li>

<li>
<strong>🔥 Tổng kết sâu sắc:</strong>
<p>Kết luận bằng 2-3 câu sắc sảo, cá nhân hóa cho bộ số ${activeInputs.map(i => i.value).join(' + ')}. Nhấn mạnh: con số không quyết định — nhận thức quyết định. Câu này PHẢI liên kết cụ thể với năng lượng của bộ số đang phân tích.</p>
</li>

</ul>

<h3>7. LỘ TRÌNH PHÁT TRIỂN (Timeline)</h3>
<ul>
<li><strong>Giai đoạn Non trẻ:</strong> Trích xuất từ dữ liệu, thường bị chi phối bởi nhu cầu/thói quen nào? Diễn giải sâu với ví dụ từ tuổi trẻ, phân tích cách nó định hình tính cách.</li>
<li><strong>Giai đoạn Trung niên:</strong> Từ context, cần tập trung phát triển kỹ năng gì (theo Sứ mệnh)? Phân tích chiến lược, ví dụ từ sự nghiệp giữa đời.</li>
<li><strong>Giai đoạn Trưởng thành:</strong> Sự tích hợp hoàn hảo trông như thế nào? Diễn giải phiên bản tốt nhất, với ví dụ từ người thành công cao tuổi.</li>
</ul>
            `);

            // PHẦN: Section 8a — Con cái + Đối tác
            promptParts.push(`
                ${commonInstructions}

⚠️ Tiếp nối phần trước. Viết súc tích, mỗi mục 150-200 từ, HOÀN THÀNH ĐỦ 2 nhóm dưới đây. Tự phân tích dựa trên năng lượng bộ số ${activeInputs.map(i => i.value).join(' + ')}. KHÔNG lặp lại nội dung đã viết.

<h3>8. HƯỚNG DẪN ỨNG XỬ VỚI NGƯỜI MANG BỘ SỐ ${activeInputs.map(i => i.value).join(' + ')}</h3>

<h4>👶 Con Cái — Hướng dẫn nuôi dạy:</h4>
<ul>
<li><strong>Bản chất & cách giáo dục:</strong> Nhu cầu tâm lý gốc của trẻ mang bộ số này, phong cách dạy con phù hợp, môi trường/hoạt động tốt nhất.</li>
<li><strong>Điều cấm kỵ & dấu hiệu lệch hướng:</strong> Hành vi cha mẹ gây tổn thương nhất, biểu hiện khi con sống "phiên bản thấp", cách can thiệp với câu nói mẫu.</li>
</ul>

<h4>🤝 Đối Tác Kinh Doanh:</h4>
<ul>
<li><strong>Phong cách & lòng tin:</strong> Cách làm việc, ra quyết định, điều họ đánh giá cao nhất ở đối tác, hành vi phá vỡ lòng tin.</li>
<li><strong>Xung đột & hợp tác:</strong> Cách phản ứng khi bất đồng, cách tiếp cận đúng, phân chia vai trò tối ưu.</li>
</ul>
            `);

            // PHẦN: Section 8b — Khách hàng + Người yêu
            promptParts.push(`
                ${commonInstructions}

⚠️ Tiếp nối phần trước (mục 8. Hướng dẫn ứng xử). Viết súc tích, mỗi mục 150-200 từ, HOÀN THÀNH ĐỦ 2 nhóm dưới đây. KHÔNG lặp lại nội dung đã viết.

<h4>💼 Khách Hàng (Hướng dẫn ứng xử — tiếp):</h4>
<ul>
<li><strong>Tâm lý mua hàng:</strong> Mua vì lý trí hay cảm xúc, cách tiếp cận và tư vấn hiệu quả, giọng điệu phù hợp.</li>
<li><strong>Xử lý từ chối & giữ chân:</strong> Lý do thật khi từ chối, câu nói xử lý cụ thể, cách chăm sóc sau bán.</li>
</ul>

<h4>💕 Người Yêu / Bạn Đời:</h4>
<ul>
<li><strong>Ngôn ngữ tình yêu & nỗi sợ:</strong> Kênh cảm nhận tình yêu mạnh nhất, nỗi sợ sâu nhất trong tình yêu, hành vi phòng vệ.</li>
<li><strong>Hướng dẫn thực tế:</strong> 3 điều NÊN làm, 3 điều KHÔNG nên làm, câu nói khiến họ yêu nhất vs tổn thương nhất, cách hàn gắn khi khủng hoảng.</li>
</ul>
            `);

            // PHẦN: Section 9 — GÓC NHÌN ĐA CHIỀU
            promptParts.push(`
                ${commonInstructions}

⚠️ Tiếp nối phần trước. Viết súc tích, mỗi góc nhìn 200-300 từ, HOÀN THÀNH ĐỦ cả 3 góc nhìn. Tự phân tích dựa trên năng lượng bộ số ${activeInputs.map(i => i.value).join(' + ')}. KHÔNG lặp lại nội dung đã viết.

⚠️ PHẦN 4/4 — tiếp nối phần trước. KHÔNG lặp lại nội dung đã viết.

<h3>9. GÓC NHÌN CHUYỂN HÓA ĐA CHIỀU</h3>

<h4>🧠 Tâm Lý Học Hành Vi:</h4>
<ul>
<li><strong>Lược đồ nhận thức:</strong> Niềm tin cốt lõi vô thức mà bộ số này tạo ra, niềm tin kép khi tổ hợp.</li>
<li><strong>Vòng lặp hành vi:</strong> Kích hoạt → suy nghĩ tự động → cảm xúc → hành vi → hệ quả. Phân tích cụ thể + điểm can thiệp.</li>
<li><strong>Chiến lược trị liệu:</strong> Kỹ thuật phù hợp nhất (nhật ký tư duy, câu hỏi Socrates, tái cấu trúc nhận thức) + bài tập hàng ngày.</li>
</ul>

<h4>☸️ Triết Học Phật Giáo:</h4>
<ul>
<li><strong>Tam Độc:</strong> Bộ số thiên về Tham, Sân hay Si? Khi tổ hợp → "độc" nào khuếch đại?</li>
<li><strong>Ba Thiện Căn & Chánh niệm:</strong> Phẩm chất cần rèn nhất (Vô Tham/Vô Sân/Vô Si), kỹ thuật chánh niệm cụ thể khi năng lượng tiêu cực bị kích hoạt.</li>
<li><strong>Chuyển hóa nghiệp tập:</strong> Thói quen tâm thức lặp lại, cách chuyển từ phản ứng tự động → hành động có chánh niệm.</li>
</ul>

<h4>📚 Nhà Giáo Dục:</h4>
<ul>
<li><strong>Phong cách học tập:</strong> Kênh học tốt nhất (thị giác/thính giác/vận động/logic), môi trường lý tưởng.</li>
<li><strong>Lộ trình phát triển:</strong> Kỹ năng mềm ưu tiên, sách/khóa học cụ thể, vai trò trong cộng đồng.</li>
<li><strong>Trí tuệ cảm xúc (EQ):</strong> Điểm mạnh/yếu trong 5 thành phần EQ, bài tập phát triển cụ thể.</li>
<li><strong>Trí tuệ cảm xúc (EQ) — điểm cần phát triển:</strong> Bộ số này mạnh hay yếu ở 5 thành phần EQ: tự nhận thức, tự điều chỉnh, động lực, đồng cảm, kỹ năng xã hội? Thành phần nào là "gót chân Achilles"? Bài tập phát triển EQ cụ thể.</li>
</ul>
            `);

       } else if (comboInfo.comboType === 'innerPersonalityAxis') {
    // PROMPT NÂNG CẤP CHUYÊN SÂU CHO TRỤC NỘI TÂM – NHÂN CÁCH – THÁI ĐỘ – TRƯỞNG THÀNH
    const heartVal = activeInputs.find(i => i.type === NumberType.HeartDesire)?.value || 'X';
    const persVal = activeInputs.find(i => i.type === NumberType.Personality)?.value || 'Y';
    const attVal = activeInputs.find(i => i.type === NumberType.Attitude)?.value || 'Z';
    const matVal = activeInputs.find(i => i.type === NumberType.Maturity)?.value || 'W';

    const innerCoreInstruction = `⚠️ CHỈ THỊ BẮT BUỘC: AI PHẢI tự phân tích dựa trên năng lượng cụ thể của bộ số ${activeInputs.map(i => i.value).join(' + ')} từ DỮ LIỆU KIẾN THỨC SÂU. KHÔNG copy template. KHÔNG viết “Số A”, “chỉ số X”. PHẢI phân tích TƯƠNG TÁC giữa các số chứ KHÔNG liệt kê từng số riêng lẻ.
⚠️ GIỚI HẠN ĐỘ DÀI QUAN TRỌNG: Mỗi mục (li) viết SÚC TÍCH 130-180 từ. PHẢI HOÀN THÀNH ĐỦ TẤT CẢ CÁC MỤC trong phần này rồi mới dừng — KHÔNG viết lan man khiến không kịp hoàn thành. Viết ĐỦ Ý quan trọng hơn viết DÀI.`;

    // PHẦN 1: Sections 1-4
    promptParts.push(`
        ${commonInstructions}

        **KHUNG PHÂN TÍCH CHUYÊN SÂU CHO TRỤC NỘI TÂM – NHÂN CÁCH – THÁI ĐỘ – TRƯỞNG THÀNH:**

${innerCoreInstruction}

⚠️ Hãy viết THẬT CHI TIẾT cho 2 phần dưới đây. PHẢI HOÀN THÀNH TẤT CẢ CÁC MỤC — không bỏ sót mục nào.

<h3>1. LỚP BẢN CHẤT</h3>
<p>Bạn có lõi Nội tâm ${heartVal}, thể hiện qua Nhân cách ${persVal}, phản ứng bằng Thái Độ ${attVal}${matVal !== 'W' ? ` và đang hướng tới Trưởng thành ${matVal}` : ''}. Phân tích sự kết hợp này tạo ra mẫu người có tính cách gốc là gì, với ví dụ thực tế từ cuộc sống hàng ngày, công việc, mối quan hệ.</p>

<ul>
<li><strong>0. TRỤC NĂNG LƯỢNG KẾT HỢP (Energy Axis):</strong>
Dựa trên sự kết hợp các chỉ số ${activeInputs.map(i => i.value).join(' + ')}, xác định trục năng lượng tổng thể dạng “X ↔ Y” (ví dụ: 4+5 → Ổn định–Tự do, 2+6 → Yêu thương–Chăm sóc, 1+8 → Lãnh đạo–Quyền lực). Trục này là “lực kéo trung tâm” chi phối toàn bộ bản chất, động lực và hành vi.
<p>Phân tích bản chất kết hợp: Số ${heartVal} (Nội Tâm) mang năng lượng gì? Số ${persVal !== 'Y' ? persVal + ' (Nhân Cách)' : attVal + ' (Thái Độ)'} mang năng lượng gì? Khi kết hợp: khuếch đại (cùng nhóm), bổ trợ (khác nhóm hỗ trợ), hay xung đột (đối cực)? Không còn là từng số riêng lẻ mà tạo thành “bản sắc mới”.</p>
<p>Biểu hiện thực tế: Trong công việc họ hành động theo năng lượng nào chiếm ưu thế? Trong cảm xúc bị giằng co giữa nhu cầu nào? Trong quyết định thiên về an toàn, tự do hay kiểm soát? Đưa ví dụ cụ thể từ tình huống đời thực.</p>
<p>🔥 Chuyển hóa tâm thức: Khi chưa trưởng thành → sống theo bản năng từng số → mâu thuẫn, thiếu ổn định, dễ lệch hướng. Khi trưởng thành → tích hợp → tạo phiên bản cao hơn. Cùng một bộ số nhưng biểu hiện ở hai tầng hoàn toàn khác nhau tùy mức độ nhận thức.</p>
</li>

<li><strong>Nhóm động lực tâm lý chủ đạo:</strong>
Bộ số này thiên về Hành động (1–8), Cảm xúc (2–6), Sáng tạo (3–5), Trí tuệ (7–9), Logic cầu toàn (4), hay Master (11-22-33)? Khi kết hợp: nếu cùng nhóm → khuếch đại mạnh, nội lực rõ ràng nhưng dễ cực đoan; nếu khác nhóm → bổ trợ hoặc xung đột, tiềm năng phát triển cao. Phân tích nhóm chiếm ưu thế quyết định khí chất lõi, ví dụ cụ thể hành vi trong công sở và gia đình, hậu quả nếu nhóm bị lệch.
<p>🔥 Chuyển hóa: Thấp → bị năng lượng chi phối (quá cảm xúc / quá kiểm soát / thiếu ổn định). Cao → làm chủ năng lượng, linh hoạt sử dụng theo hoàn cảnh.</p>
</li>

<li><strong>Động cơ cốt lõi:</strong>
Họ sống vì điều gì? Thành tựu – Tự do – Giá trị – Sự công nhận – Sự an toàn – Cống hiến? Khi kết hợp: Nội Tâm ${heartVal} theo đuổi gì? Nhân Cách ${persVal !== 'Y' ? persVal : ''}/Thái Độ ${attVal !== 'Z' ? attVal : ''} theo đuổi gì? Tạo thành động cơ kép. Ví dụ cách chọn nghề nghiệp, xử lý khủng hoảng, ảnh hưởng đến động lực lâu dài.
<p>🔥 Chuyển hóa: Thấp → giằng xé nội tâm. Cao → tích hợp tạo động lực mạnh mẽ và rõ ràng.</p>
</li>

<li><strong>Bản sắc cá nhân:</strong>
Họ là người dẫn dắt, người xây dựng, người kết nối, người đổi mới hay người khai sáng? Khi kết hợp: Nội Tâm = bản chất lõi, Nhân Cách/Thái Độ = cách thể hiện → tạo ra “vai trò lai”. Phân tích vai trò tự nhiên trong tập thể, gia đình.
<p>🔥 Chuyển hóa: Thấp → vai trò méo (kiểm soát, phụ thuộc, né tránh). Cao → đúng vai trò, phát huy tối đa giá trị.</p>
</li>

<li><strong>Định hướng nội tại:</strong>
Thiên về cá nhân hay cộng đồng? Thực tế hay lý tưởng? Ổn định hay bứt phá? Khi kết hợp: có thể đồng hướng (rõ ràng) hoặc đối lập (giằng co). Diễn giải hướng sống dài hạn với ví dụ về lựa chọn nghề nghiệp hoặc mối quan hệ.
<p>🔥 Chuyển hóa: Thấp → mất phương hướng. Cao → tạo ra con đường riêng phù hợp với bản chất.</p>
</li>

<li><strong>Mức độ đồng bộ nội–ngoại:</strong>
Nội tâm ${heartVal} có trùng khớp với Nhân cách ${persVal !== 'Y' ? persVal : ''} không? 3 trạng thái: Đồng bộ → mạnh mẽ nhất quán; Lệch nhẹ → mệt mỏi thiếu động lực; Lệch mạnh → sống “vai diễn”. Diễn giải mâu thuẫn bản thân hoặc kiệt sức.
<p>🔥 Chuyển hóa: Nhận thức → giảm lệch. Trưởng thành → thống nhất nội–ngoại.</p>
</li>

<li><strong>Khí chất tổng thể:</strong>
Người này mang khí chất trầm ổn – quyết liệt – linh hoạt – sâu sắc – nhân văn hay thực dụng? Khí chất được tạo bởi “tổng hòa năng lượng” của tổ hợp. Diễn giải cách ảnh hưởng đến tương tác hàng ngày.
<p>🔥 Chuyển hóa: Thấp → cực đoan (cứng nhắc / cảm xúc quá mức). Cao → cân bằng, trưởng thành, có chiều sâu.</p>
</li>
</ul>

<h3>2. CƠ CHẾ TÂM LÝ</h3>
<p>Dựa trên dữ liệu gốc, trích xuất và phân tích khi bình thường (thuận lợi) và khi áp lực (căng thẳng), họ tư duy và phản ứng thế nào? Nội Tâm ${heartVal} là nhu cầu gốc, Thái Độ ${attVal !== 'Z' ? attVal : ''} là cách phản ứng tức thời, Nhân Cách ${persVal !== 'Y' ? persVal : ''} là cách thể hiện ra ngoài.</p>
<ul>
<li><strong>Trạng thái thuận lợi:</strong> Khi môi trường thuận lợi, số nào chi phối hành vi? Họ hành động quyết đoán, mềm mỏng, sáng tạo hay phân tích sâu? Ví dụ cụ thể từ thành công công việc, mối quan hệ hạnh phúc.</li>
<li><strong>Trạng thái căng thẳng:</strong> Khi áp lực, phản ứng theo xu hướng nào: kiểm soát, né tránh, bùng nổ cảm xúc hay thu mình? Phân tích sâu hậu quả và cách nhận biết, ví dụ từ thất bại dự án, tranh cãi gia đình.</li>
<li><strong>Chi phối lý trí:</strong> Số nào quyết định logic, phân tích, chiến lược? Cách ảnh hưởng đến quyết định lớn: lập kế hoạch tài chính, giải quyết vấn đề phức tạp. Ví dụ thực tế.</li>
<li><strong>Chi phối cảm xúc:</strong> Số nào điều khiển nỗi sợ, tổn thương, sự nhạy cảm? Cách hình thành phản ứng cảm xúc, ví dụ xử lý thất bại tình cảm, căng thẳng công việc.</li>
<li><strong>Cơ chế phòng vệ:</strong> Khi bị tổn thương, xu hướng đổ lỗi, tự trách, kiểm soát người khác hay tự cô lập? Mở rộng với ví dụ thực tế và hậu quả lâu dài nếu không điều chỉnh.</li>
<li><strong>Mô hình hành vi lặp lại:</strong> Phản xạ vô thức nào thường xuyên tái diễn khi gặp xung đột? Phân tích vòng lặp, ví dụ từ hành vi lặp lại trong mối quan hệ hoặc công việc.</li>
<li><strong>Điểm kích hoạt:</strong> Điều gì dễ làm mất cân bằng nhất? Bị kiểm soát? Bị xem thường? Bị bỏ rơi? Thiếu tự do? Diễn giải cách tránh và xử lý, ví dụ cụ thể từ tình huống đời thực.</li>
</ul>
    `);

    // PHẦN: Section 3 + 4 — Tương tác + Hồ sơ tính cách
    promptParts.push(`
        ${commonInstructions}

${innerCoreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết 2 phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h3>3. TƯƠNG TÁC & XUNG ĐỘT</h3>
<ul>
<li><strong>Độ Đồng Hướng:</strong>
Phân tích các chỉ số hỗ trợ hay mâu thuẫn nhau: Đồng hướng → khuếch đại (năng lượng cùng chiều, hành động mạnh nhất quán); Bổ trợ → phát triển (khác biệt nhưng hỗ trợ, tạo chiều sâu hiệu quả); Tương phản → xung đột nhưng tiềm năng cao (đối cực, giằng xé nhưng nếu trưởng thành sẽ bứt phá mạnh).
<p>3 loại xung đột: Nội tâm → giằng xé bên trong; Hành vi → làm khác điều mình muốn; Môi trường → sống sai môi trường. Phân tích xung đột nằm ở đâu cho bộ số này.</p>
<p>Câu hỏi phân tích sâu: Mục tiêu bên trong và bên ngoài có trùng nhau? Họ sống theo bản chất hay vai trò xã hội? Hành động vì giá trị hay vì áp lực? Ví dụ thực tế.</p>
</li>

<li><strong>Phân Tích Mâu Thuẫn:</strong>
<p>Mâu thuẫn nội tâm: Khi Nội tâm ${heartVal} cần A nhưng Nhân cách ${persVal !== 'Y' ? persVal : ''}/Thái Độ ${attVal !== 'Z' ? attVal : ''} thể hiện B → căng thẳng. Mâu thuẫn hành vi: Muốn làm điều này nhưng phản xạ lại ngược lại. Mâu thuẫn môi trường: Ở trong môi trường trái với động lực chủ đạo.</p>
<p>Biểu hiện: Mệt mỏi, thiếu động lực, dễ bùng nổ hoặc thu mình → dấu hiệu hệ năng lượng đang bị lệch hoặc xung đột kéo dài. Khi áp lực, họ chọn bảo vệ cái tôi hay bảo vệ mối quan hệ? Sợ mất điều gì nhất? Ví dụ thực tế.</p>
</li>

<li><strong>Cơ Chế Cân Bằng:</strong>
<p>Số an toàn: Số đại diện nhu cầu sâu nhất (thường Nội Tâm ${heartVal}), cách phục hồi. Số phòng vệ: Phản xạ mạnh nhất khi stress, ưu nhược điểm. Mô hình lặp lại: Xu hướng kiểm soát, né tránh, bùng nổ hay im lặng? Cách phá vỡ vòng lặp. Điểm phục hồi: Muốn cân bằng cần quay về giá trị nào?</p>
<p>🔥 Chu kỳ chuyển hóa: 1. Bản năng → 2. Xung đột → 3. Nhận thức → 4. Tích hợp. Không phải ai cũng đạt giai đoạn 4 — đây là tiến trình phát triển tâm thức của toàn bộ hệ số.</p>
</li>
</ul>

<h3>4. HỒ SƠ TÍNH CÁCH</h3>
<ul>
<li><strong>Tư Duy:</strong>
<p>Tổng quan: Logic hay cảm xúc? Thực tế hay lý tưởng? Dựa trên tổ hợp số: Nội Tâm ${heartVal} thiên về gì? Nhân Cách/Thái Độ thiên về gì? Khi kết hợp: Đồng hướng → tư duy rõ ràng nhất quán; Xung đột → dễ giằng co thiếu quyết đoán; Bổ trợ → vừa có chiều sâu vừa linh hoạt.</p>
<p>Chiều sâu tư duy: Phân tích chiến lược hay phản ứng tức thời? Nội lực trí tuệ: Có khả năng tập trung sâu và kiên định không? Điểm hạn chế tư duy: Quá cầu toàn, quá cảm tính, quá lý tưởng hóa hay thiếu nhất quán? Hậu quả và cách khắc phục, ví dụ thực tế.</p>
<p>🔥 Chuyển hóa: Thấp → tư duy cứng nhắc hoặc cảm tính. Cao → linh hoạt, biết dùng đúng kiểu tư duy theo tình huống.</p>
</li>

<li><strong>Hành Vi:</strong>
<p>Tổng quan: Chủ động hay thụ động? Quyết liệt hay thận trọng? Dựa trên tổ hợp: Đồng hướng → hành động mạnh rõ ràng; Xung đột → lúc nhanh lúc chậm thiếu ổn định; Bổ trợ → vừa có chiến lược vừa có triển khai.</p>
<p>Mức động lực, sức bền nội lực, hạn chế hành vi. Ví dụ từ thói quen làm việc, dự án dài hạn, mối quan hệ.</p>
<p>🔥 Chuyển hóa: Thấp → phản ứng theo cảm xúc. Cao → hành động có ý thức và kiểm soát.</p>
</li>

<li><strong>Nội lực:</strong>
<p>Mức độ: Mạnh – yếu – dao động? Đồng hướng → nội lực mạnh ổn định; Xung đột → nội lực dao động; Lệch → dễ mất phương hướng. Nguồn năng lượng chính: Được “nạp” từ thành tựu / kết nối / tự do / tri thức / giá trị? Điểm suy yếu: Khi nào mất năng lượng?</p>
<p>🔥 Chuyển hóa nội lực: Thấp → phụ thuộc môi trường. Trung → nhận ra điểm yếu. Cao → tự tạo năng lượng từ bên trong. Đây là yếu tố quyết định bền vững hay dễ gục ngã.</p>
</li>

<li><strong>🔥 Chuyển hóa tổng thể:</strong>
<p>Trạng thái chưa trưởng thành: Tư duy cứng nhắc/cảm tính, Hành vi phản ứng/thiếu kiểm soát, Nội lực phụ thuộc bên ngoài. Trạng thái trưởng thành: Tư duy linh hoạt, hành vi ổn định, nội lực vững vàng, biết khi nào nên hành động khi nào nên dừng.</p>
<p>Bước chuyển hóa: 1. Nhận ra xung đột → 2. Quan sát bản thân → 3. Điều chỉnh hành vi → 4. Tích hợp năng lượng. Không phải ai cũng đi đến bước 4.</p>
</li>
</ul>
    `);

    // PHẦN 2: Sections 5-7
    promptParts.push(`
        ${commonInstructions}

${innerCoreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết, HOÀN THÀNH ĐỦ các mục. KHÔNG lặp lại nội dung đã viết.

<h3>5. ỨNG DỤNG THỰC TẾ</h3>

<h4>🏢 Sự Nghiệp & Kinh Doanh:</h4>
<ul>
<li><strong>Vị Thế Phù Hợp:</strong> Phân tích vị thế cho từng nhóm năng lượng của bộ số: Nhóm Hành động (Lãnh đạo, quản lý, khởi nghiệp), Cảm xúc (Giáo dục, chăm sóc, HR), Sáng tạo (Marketing, truyền thông, nghệ thuật), Trí tuệ (Cố vấn, nghiên cứu, chuyên gia). Ví dụ từ ngành nghề thành công.</li>
<li><strong>Lý Giải Vì Sao Phù Hợp:</strong> Động lực lõi quyết định cách tạo giá trị: Hành động tạo kết quả, Cảm xúc tạo kết nối, Sáng tạo tạo sự mới mẻ, Trí tuệ tạo chiều sâu. Diễn giải sâu cho bộ số cụ thể.</li>
<li><strong>Điểm Yếu Cần Quản Trị:</strong> Thiếu kỷ luật, quá kiểm soát, dễ dao động, dễ kiệt sức — cụ thể cho bộ số này. Chiến lược quản trị từng điểm yếu, ví dụ từ quản lý đội nhóm.</li>
<li><strong>Chiến lược phát huy:</strong> Xây môi trường phù hợp với nhóm động lực chủ đạo thay vì ép bản thân vào môi trường trái bản chất. Ví dụ cụ thể.</li>
</ul>

<h4>🤝 Giao Tiếp & Thuyết Phục:</h4>
<ul>
<li><strong>Cách tiếp cận hiệu quả:</strong> Cách mở đầu: đánh vào động lực chính của bộ số. Cách truyền đạt: điều chỉnh ngôn ngữ phù hợp “tần số” (trực tiếp / cảm xúc / sáng tạo / logic). Cách đưa giải pháp: trình bày theo cách dễ chấp nhận. Ví dụ giao tiếp, tư vấn, đàm phán cụ thể.</li>
<li><strong>Điều cần tránh:</strong> Tránh kích hoạt điểm tiêu cực (áp lực sai cách, chạm nỗi sợ cốt lõi). Tránh sai phong cách giao tiếp. Hậu quả: im lặng, chống đối, mất niềm tin, rút lui. Ví dụ cụ thể.</li>
<li><strong>Soi vào điểm yếu để thuyết phục:</strong> Nỗi sợ cốt lõi → đưa giải pháp làm họ an toàn/mạnh mẽ. Đòn bẩy thuyết phục: quyền lựa chọn / sự công nhận / sự đảm bảo / tầm nhìn. Ví dụ ứng dụng trong bán hàng, tuyển dụng, dẫn dắt đội nhóm.</li>
</ul>

<h4>💰 Ứng Dụng Tư Vấn – Bán Hàng – Chốt Quyết Định:</h4>
<ul>
<li><strong>Trọng tâm cần đánh vào:</strong> Yếu tố khiến sẵn sàng chi tiền (kết quả, cảm xúc, sự an toàn, giá trị cá nhân, tầm nhìn). Cách xây dựng niềm tin.</li>
<li><strong>Cách trình bày sản phẩm/dịch vụ:</strong> Điều chỉnh theo cách ra quyết định (nhanh–chậm, cảm tính–lý trí, linh hoạt–cấu trúc). Đòn bẩy ra quyết định.</li>
<li><strong>Cách xử lý từ chối & chốt:</strong> Hiểu lý do thật → xử lý đúng nỗi sợ gốc. Đưa đề nghị phù hợp. Ví dụ kịch bản tư vấn/bán hàng cụ thể.</li>
</ul>

<h4>❤️ Tình Cảm & Kết Nối:</h4>
<ul>
<li><strong>Nên làm gì:</strong> Hành động giúp cảm thấy được yêu, được hiểu và muốn gắn bó (tùy nhu cầu cảm xúc cốt lõi từ Nội Tâm ${heartVal}). Ngôn ngữ tình cảm họ hiểu (lời nói, hành động, sự ổn định, sự phát triển).</li>
<li><strong>Không nên làm gì:</strong> Hành vi dễ tổn thương sâu sắc hoặc mất niềm tin (kiểm soát, bỏ rơi, thiếu tôn trọng — cụ thể từ challenges bộ số).</li>
<li><strong>Dấu hiệu rạn nứt:</strong> Nhận biết khi bắt đầu thay đổi (lạnh nhạt, né tránh, kiểm soát hơn, mất kết nối). Cách tiếp cận lại cụ thể.</li>
</ul>
    `);

    // PHẦN: Section 6 + 7 — Nhân-Duyên-Quả + Trưởng thành
    promptParts.push(`
        ${commonInstructions}

${innerCoreInstruction}

⚠️ Tiếp nối phần trước. Viết chi tiết 2 phần dưới đây, HOÀN THÀNH ĐỦ tất cả các mục. KHÔNG lặp lại nội dung đã viết.

<h3>6. BÀI HỌC NHÂN – DUYÊN – QUẢ & CHUYỂN HÓA TÍNH CÁCH</h3>
<p><strong>Khuôn mẫu lệch hướng tham khảo (20% — KHÔNG thay logic phân tích):</strong> Lệch hướng từng số (1→độc đoán, 2→lệ thuộc, 3→hời hợt, 4→bảo thủ, 5→sa đà, 6→kiểm soát tình cảm, 7→cô lập, 8→tham vọng cực đoan, 9→lý tưởng hóa). Tổ hợp dễ lệch (3+5→đào hoa, 1+5→liều lĩnh, 2+5→yêu sai người, 2+8→bị áp chế, 4+5→giằng xé, 7+5→nghĩ nhiều không hành động).</p>
<ul>
<li><strong>Tổng kết nghiệp tính cách:</strong> Nội Tâm ${heartVal} tạo xu hướng gì? Nhân Cách/Thái Độ tạo xu hướng gì? Khi kết hợp: Tích cực → phiên bản cao. Tiêu cực → phiên bản thấp. Đây là thói quen tâm thức lặp lại.</li>
<li><strong>Phước phần:</strong> Tài năng – cơ hội – thế mạnh bẩm sinh từ tổ hợp. Nếu dùng đúng → phát triển nhanh ở lĩnh vực nào?</li>
<li><strong>Nghiệp cần chuyển hóa:</strong> Kiểm soát / lệ thuộc / sợ hãi / thiếu kỷ luật — cụ thể cho bộ số. Lặp lại sai lầm – tự phá cơ hội.</li>
<li><strong>Nếu không chuyển hóa:</strong> Mệt mỏi – mất phương hướng. Quan hệ đổ vỡ – thất bại lặp lại. Hậu quả cụ thể cho bộ số.</li>
<li><strong>Nếu chuyển hóa:</strong> Phản ứng → quan sát. Sợ hãi → chấp nhận. Kiểm soát → thấu hiểu. Hành động cụ thể kèm theo.</li>
<li><strong>Chu kỳ nhân – duyên – quả:</strong> Nhân → suy nghĩ/hành vi gốc rễ. Duyên → môi trường kích hoạt. Quả → kết quả cuộc đời. Liên kết trực tiếp với challenges bộ số.</li>
<li><strong>Bài học phát triển:</strong> Cân bằng giữa điều gì CỤ THỂ? Vượt qua nỗi sợ nào CỤ THỂ? Phát triển phẩm chất nào CỤ THỂ? Mỗi bài học kèm hành động thực tế.</li>
<li><strong>🔥 Tổng kết sâu sắc:</strong> Con số không quyết định. Nhận thức quyết định. Câu kết luận CÁ NHÂN HÓA cho bộ số ${activeInputs.map(i => i.value).join(' + ')}.</li>
</ul>

<h3>7. HƯỚNG PHÁT TRIỂN TRƯỞNG THÀNH</h3>
<ul>
<li><strong>Phiên Bản Cao Nhất:</strong> Khi tích hợp tất cả tầng, trở thành ai trong xã hội? Vai trò lớn nhất có thể đảm nhận? Diễn giải sâu với ví dụ cụ thể.</li>
<li><strong>Nếu Lệch Hướng:</strong> Trạng thái tiêu cực kéo dài dẫn đến điều gì? Kiệt sức, cô lập, kiểm soát, mất phương hướng? Phân tích hậu quả cụ thể.</li>
<li><strong>Bài Học Lớn Nhất:</strong> Kỹ năng cần rèn: quản trị cảm xúc, kỷ luật, lãnh đạo, giao tiếp, linh hoạt. Điều cần buông bỏ để trưởng thành. Thói quen nên xây dựng hàng ngày. Ví dụ từ hành trình cá nhân.</li>
<li><strong>Chiến lược phát triển dài hạn:</strong> Phát triển chiều sâu nội tâm trước khi mở rộng ảnh hưởng bên ngoài. Lộ trình sự nghiệp hoặc phát triển bản thân cụ thể.</li>
</ul>
    `);

    // PHẦN 3: Section 8 — HƯỚNG DẪN ỨNG XỬ (template rút gọn)
    // PHẦN: Section 8a — Con cái + Đối tác
    promptParts.push(`
        ${commonInstructions}

⚠️ Tiếp nối phần trước. Viết súc tích, mỗi mục 150-200 từ, HOÀN THÀNH ĐỦ 2 nhóm dưới đây. Tự phân tích dựa trên năng lượng bộ số ${activeInputs.map(i => i.value).join(' + ')}. KHÔNG lặp lại nội dung đã viết.

<h3>8. HƯỚNG DẪN ỨNG XỬ VỚI NGƯỜI MANG BỘ SỐ ${activeInputs.map(i => i.value).join(' + ')}</h3>

<h4>👶 Con Cái — Hướng dẫn nuôi dạy:</h4>
<ul>
<li><strong>Bản chất & cách giáo dục:</strong> Nhu cầu tâm lý gốc, phong cách dạy con phù hợp, môi trường/hoạt động tốt nhất.</li>
<li><strong>Điều cấm kỵ & dấu hiệu lệch hướng:</strong> Hành vi cha mẹ gây tổn thương nhất, biểu hiện khi con sống "phiên bản thấp", cách can thiệp với câu nói mẫu.</li>
</ul>

<h4>🤝 Đối Tác Kinh Doanh:</h4>
<ul>
<li><strong>Phong cách & lòng tin:</strong> Cách làm việc, ra quyết định, điều đánh giá cao nhất ở đối tác, hành vi phá vỡ lòng tin.</li>
<li><strong>Xung đột & hợp tác:</strong> Phản ứng khi bất đồng, cách tiếp cận đúng, phân chia vai trò tối ưu.</li>
</ul>
    `);

    // PHẦN: Section 8b — Khách hàng + Người yêu
    promptParts.push(`
        ${commonInstructions}

⚠️ Tiếp nối phần trước (mục 8. Hướng dẫn ứng xử). Viết súc tích, mỗi mục 150-200 từ, HOÀN THÀNH ĐỦ 2 nhóm dưới đây. KHÔNG lặp lại nội dung đã viết.

<h4>💼 Khách Hàng (Hướng dẫn ứng xử — tiếp):</h4>
<ul>
<li><strong>Tâm lý mua hàng:</strong> Mua vì lý trí hay cảm xúc, cách tiếp cận và tư vấn hiệu quả.</li>
<li><strong>Xử lý từ chối & giữ chân:</strong> Lý do thật khi từ chối, câu nói xử lý cụ thể, cách chăm sóc sau bán.</li>
</ul>

<h4>💕 Người Yêu / Bạn Đời:</h4>
<ul>
<li><strong>Ngôn ngữ tình yêu & nỗi sợ:</strong> Kênh cảm nhận tình yêu mạnh nhất, nỗi sợ sâu nhất, hành vi phòng vệ.</li>
<li><strong>Hướng dẫn thực tế:</strong> 3 điều NÊN, 3 điều KHÔNG nên, câu nói yêu nhất vs tổn thương nhất, cách hàn gắn khi khủng hoảng.</li>
</ul>
    `);

    // PHẦN: Section 9 — GÓC NHÌN ĐA CHIỀU
    promptParts.push(`
        ${commonInstructions}

⚠️ Tiếp nối phần trước. Viết súc tích, mỗi góc nhìn 200-300 từ, HOÀN THÀNH ĐỦ cả 3 góc nhìn. Tự phân tích dựa trên năng lượng bộ số ${activeInputs.map(i => i.value).join(' + ')}. KHÔNG lặp lại nội dung đã viết.

<h3>9. GÓC NHÌN CHUYỂN HÓA ĐA CHIỀU</h3>

<h4>🧠 Tâm Lý Học Hành Vi:</h4>
<ul>
<li><strong>Lược đồ nhận thức:</strong> Niềm tin cốt lõi vô thức mà bộ số tạo ra, niềm tin kép khi tổ hợp.</li>
<li><strong>Vòng lặp hành vi:</strong> Kích hoạt → suy nghĩ → cảm xúc → hành vi → hệ quả. Phân tích cụ thể + điểm can thiệp.</li>
<li><strong>Chiến lược trị liệu:</strong> Kỹ thuật phù hợp nhất + bài tập hàng ngày.</li>
</ul>

<h4>☸️ Triết Học Phật Giáo:</h4>
<ul>
<li><strong>Tam Độc:</strong> Bộ số thiên về Tham, Sân hay Si? Khi tổ hợp → "độc" nào khuếch đại?</li>
<li><strong>Ba Thiện Căn & Chánh niệm:</strong> Phẩm chất cần rèn nhất, kỹ thuật chánh niệm cụ thể khi năng lượng tiêu cực bị kích hoạt.</li>
<li><strong>Chuyển hóa nghiệp tập:</strong> Thói quen tâm thức lặp lại, cách chuyển từ phản ứng tự động → hành động có chánh niệm.</li>
</ul>

<h4>📚 Nhà Giáo Dục:</h4>
<ul>
<li><strong>Phong cách học tập:</strong> Kênh học tốt nhất, môi trường lý tưởng.</li>
<li><strong>Lộ trình phát triển:</strong> Kỹ năng mềm ưu tiên, sách/khóa học cụ thể, vai trò trong cộng đồng.</li>
<li><strong>Trí tuệ cảm xúc (EQ):</strong> Điểm mạnh/yếu trong 5 thành phần EQ, bài tập phát triển cụ thể.</li>
</ul>
    `);

        } else {
            // PROMPT CƠ BẢN (FALLBACK / OTHER COMBOS) — chỉ 1 phần, không cần chia
            promptParts.push(`
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
            `);
        }

      // Tạo system instruction riêng cho phân tích — ép GPT tuân theo framework
      const analyzeSystemInstruction = `Bạn đồng thời đóng 3 vai trò chuyên gia:
1. CHUYÊN GIA TÂM LÝ HỌC HÀNH VI — hơn 30 năm kinh nghiệm nghiên cứu số học ứng dụng, chuyên phân tích lược đồ nhận thức, vòng lặp hành vi, và chiến lược trị liệu nhận thức.
2. NHÀ SƯ PHẬT GIÁO — am hiểu sâu về Tam Độc (Tham-Sân-Si), Ba Thiện Căn (Vô Tham-Vô Sân-Vô Si), Chánh niệm, và nguyên lý Nhân-Duyên-Quả. Áp dụng triết học Phật giáo vào phân tích tính cách và chuyển hóa hành vi.
3. NHÀ GIÁO DỤC — chuyên về phát triển con người toàn diện, trí tuệ cảm xúc (EQ), phong cách học tập, và thiết kế lộ trình phát triển bản thân.

=== VAI TRÒ CỦA BẠN ===
Bạn là NHÀ PHÂN TÍCH, không phải "người điền form". Phần prompt bên dưới chứa KHUNG TƯ DUY (framework) — bạn PHẢI dùng nó làm cấu trúc để TỰ VIẾT nội dung phân tích dựa trên dữ liệu KIẾN THỨC SÂU đã cung cấp.

⛔ HÀNH VI CẤM (nếu vi phạm = kết quả vô giá trị):
- KHÔNG copy/paraphrase bất kỳ câu nào từ prompt. Prompt là CHỈ DẪN, không phải nội dung.
- KHÔNG viết "Số A", "chỉ số X", "(…)", "___" — PHẢI thay bằng số thực tế đang tra cứu.
- KHÔNG liệt kê đặc điểm riêng lẻ từng số rồi ghép lại — PHẢI phân tích TỔ HỢP (interaction effect).
- KHÔNG viết chung chung áp dụng cho mọi bộ số — mỗi câu phải CỤ THỂ cho bộ số đang tra.

=== PHƯƠNG PHÁP PHÂN TÍCH BẮT BUỘC ===

BƯỚC 1 — NHẬN DIỆN: Đọc phần "KIẾN THỨC SÂU" trong prompt, trích xuất keywords, advantages, challenges, balance của TỪNG số.

BƯỚC 2 — NGŨ HÀNH: Đọc phần "PHÂN TÍCH HỆ THỐNG" trong prompt:
- Ngũ Hành: Mỗi số thuộc hành nào (Kim/Mộc/Thủy/Hỏa/Thổ)? Quan hệ Tương sinh hay Tương khắc?
  + Tương sinh (nuôi dưỡng): Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
  + Tương khắc (kiểm soát): Mộc→Thổ→Thủy→Hỏa→Kim→Mộc
  + Hành nào chiếm ưu thế? Hành nào thiếu? → Ảnh hưởng đến tính cách tổng thể
- PHẢI đề cập Ngũ Hành trong bài phân tích một cách tự nhiên, lồng ghép vào nội dung.

BƯỚC 3 — TƯƠNG THÍCH & LIÊN KẾT: Đọc phần "MA TRẬN TƯƠNG THÍCH" và "CHỈ SỐ LIÊN KẾT":
- Cặp số nào Hòa hợp / Trung tính / Thách thức? → Đây là nền tảng để phân tích xung đột hay bổ trợ.
- Chỉ số liên kết (Bridge Number) cho biết hành động cụ thể cần thực hiện để hài hòa hai chỉ số.
- PHẢI sử dụng kết quả tương thích và liên kết khi viết phần phân tích. VD: "Cặp Đường Đời 4 ↔ Nội Tâm 5 có mức tương thích Thách thức với chỉ số liên kết 1 — cần củng cố niềm tin bản thân..."

BƯỚC 4 — TỔ HỢP: Xác định quan hệ giữa các số:
- Đồng hướng (cùng nhóm/cùng hành → khuếch đại lẫn nhau)
- Bổ trợ (khác nhóm/tương sinh → bù đắp điểm yếu)
- Tương phản (đối lập/tương khắc → xung đột NHƯNG tiềm năng tiến hóa cao)

BƯỚC 5 — TRỤC NĂNG LƯỢNG: Tạo trục dạng "X ↔ Y" (VD: "Ổn định ↔ Tự do") dựa trên keywords thực. Giải thích trục này chi phối hành vi ra sao.

BƯỚC 6 — PHÂN TÍCH 5 LỚP cho mỗi điểm (viết CHI TIẾT với ví dụ cụ thể):
- Bản chất: Bản chất mới khi kết hợp (khác gì từng số riêng lẻ?) — diễn giải sâu
- Cơ chế: Số nào chi phối khi bình thường? Khi căng thẳng? — diễn giải sâu
- Sức mạnh: Lợi thế độc nhất mà từng số riêng lẻ không có — diễn giải sâu
- Lệch hướng: Hành vi tiêu cực CỤ THỂ khi mất cân bằng (đào hoa, mạo hiểm tài chính, lệ thuộc cảm xúc, kiểm soát quá mức...) — diễn giải sâu
- Phát triển: Kỹ năng cần rèn luyện + thói quen hàng ngày — diễn giải sâu

BƯỚC 7 — 3 KỊCH BẢN: Đúng hướng (phiên bản cao) | Lệch (phiên bản thấp) | Trưởng thành (cân bằng) — mỗi kịch bản có ví dụ hành vi CỤ THỂ.

=== QUY TẮC VIẾT NỘI DUNG ===

1. MỖI câu output PHẢI chứa ít nhất 1 con số cụ thể đang phân tích (VD: "Số 5 tạo xu hướng..." KHÔNG phải "Số này tạo xu hướng...").

2. BẮT BUỘC trích dẫn dữ liệu KIẾN THỨC SÂU: "Theo KIẾN THỨC SÂU, số 5 có keywords: Tự do, Phiêu lưu, Thay đổi — cho thấy năng lượng lõi thiên về trải nghiệm. Kết hợp với số 3 (Sáng tạo, Biểu đạt) tạo thành xu hướng lan tỏa mạnh nhưng dễ hời hợt..."

3. PHẦN CHUYỂN HÓA (🔥): PHẢI viết CỤ THỂ:
   - SAI: "Thấp → giằng xé, Cao → cân bằng" (chung chung)
   - ĐÚNG: "Khi số 5 kích hoạt sự bồng bột muốn bỏ việc giữa chừng (trích từ challenges: thiếu kiên nhẫn), hãy dùng năng lượng số 4 (kỷ luật, ổn định) để lập kế hoạch 30 ngày trước khi quyết định" (cụ thể)

4. MỖI điểm phân tích (li) PHẢI có 4 yếu tố:
   (a) Năng lượng gốc: Trích keywords, advantages, challenges từ KIẾN THỨC SÂU. Gọi tên năng lượng lõi.
   (b) Tương tác tổ hợp: Phân tích cách các số tác động lẫn nhau — khuếch đại, bổ trợ, xung đột, làm dịu. Tham chiếu BẢN ĐỒ TƯƠNG TÁC.
   (c) Ví dụ thực tế: Tình huống cụ thể trong công việc, tình cảm, tài chính.
   (d) Chuyển hóa: Phiên bản vô thức (reactive) → phiên bản tỉnh thức (responsive). Hành động cụ thể.

5. PHẦN TÌNH YÊU: PHẢI nói rõ người này MUỐN gì, CẦN gì, SỢ gì trong tình yêu — đủ chi tiết để đối phương biết cách cư xử.

6. PHẦN SALE/COACH: PHẢI nói rõ người này bị THU HÚT bởi gì, GHÉT gì từ người tư vấn — đủ chi tiết để sale biết cách tiếp cận.

7. PHẦN BÀI HỌC NHÂN-DUYÊN-QUẢ: Phải phân tích chi tiết với ví dụ lệch hướng CỤ THỂ cho tổ hợp (VD: 3+5 → đào hoa; 1+5 → mạo hiểm tài chính; 2+8 → bị áp chế). Lồng ghép nguyên lý Nhân-Quả và tam giác Đạo Đức-Trí Tuệ-Nghị Lực vào phân tích.

8. CẤM: 'năng lượng vũ trụ', 'tần số rung động', 'kiếp trước', 'linh hồn', 'chữa lành', 'phụng sự', 'nghiệp quả'.
   THAY: 'động lực tâm lý', 'xu hướng hành vi', 'giải quyết mâu thuẫn', 'cống hiến', 'tạo giá trị xã hội'.

9. GIỌNG VĂN: Thực tế, sắc sảo, tâm lý học hành vi. KHÔNG mơ hồ, KHÔNG lý tưởng hóa.

10. FORMAT: HTML sạch (h3, h4, ul, li, p, strong). KHÔNG markdown. KHÔNG dùng ký tự đặc biệt ngoài emoji cho tiêu đề.

=== KHUNG TRIẾT HỌC PHÁT TRIỂN (Lồng ghép tự nhiên, KHÔNG giảng đạo) ===

1. NGUYÊN LÝ NHÂN – QUẢ (trong Tâm lý Hành vi):
   - Mỗi con số mang một "nhân" (xu hướng tư duy, hành vi gốc rễ) → tạo "duyên" (môi trường, cơ hội, thử thách kích hoạt) → sinh "quả" (kết quả cuộc đời).
   - VD: Số 5 mang nhân "khao khát tự do" → duyên gặp công việc ràng buộc → quả: bỏ việc liên tục HOẶC học cách tự do trong khuôn khổ.
   - AI PHẢI liên kết challenges của từng số với hậu quả cụ thể nếu không chuyển hóa, và phước lành cụ thể nếu phát triển đúng hướng.
   - Cách diễn đạt: "Xu hướng hành vi này nếu lặp lại sẽ tạo kết quả tương ứng" — KHÔNG dùng "nghiệp", "kiếp trước".

2. TAM GIÁC PHÁT TRIỂN: Đạo Đức – Trí Tuệ – Nghị Lực:
   - Đạo Đức: Khả năng phân biệt đúng-sai, sống có nguyên tắc → liên kết với balance và coreMessage của số.
   - Trí Tuệ: Khả năng nhìn nhận đa chiều, không bị cảm xúc chi phối → liên kết với advantages + keywords phân tích.
   - Nghị Lực: Sức mạnh nội tại để vượt qua thử thách → liên kết với challenges và cách vượt qua.
   - AI PHẢI phân tích bộ số đang tra: tam giác này MẠNH ở cạnh nào, YẾU ở cạnh nào? VD: Bộ số thiên Trí tuệ (7, 9) nhưng yếu Nghị lực → cần rèn kỷ luật. Bộ số mạnh Nghị lực (1, 8) nhưng yếu Đạo đức → cần phát triển sự thấu cảm.

3. NGUYÊN LÝ TỈNH THỨC:
   - Mỗi con số có phiên bản "vô thức" (reactive — phản ứng tự động) và phiên bản "tỉnh thức" (responsive — lựa chọn có ý thức).
   - VD: Số 1 vô thức → độc đoán, ép buộc. Số 1 tỉnh thức → dẫn dắt bằng tầm nhìn và gương mẫu.
   - AI PHẢI chỉ ra con đường chuyển hóa từ vô thức → tỉnh thức cho TỪNG số trong bộ, với hành động cụ thể.
   - Cách diễn đạt: "Khi nhận ra xu hướng này và chủ động điều chỉnh..." — giọng tâm lý học, KHÔNG giọng tôn giáo.

=== CÁCH PHÂN TÍCH TƯƠNG TÁC NĂNG LƯỢNG (Bắt buộc dùng KIẾN THỨC SÂU) ===

1. VAI TRÒ TỪNG CHỈ SỐ trong bộ số:
   - Đường Đời: Năng lượng nền tảng, chi phối cách sống và học bài học lớn nhất.
   - Nội Tâm: Động lực sâu bên trong, nhu cầu cảm xúc cốt lõi, điều thực sự muốn.
   - Sứ Mệnh: Hướng phát triển, cách tạo giá trị và đóng góp cho xã hội.
   - Nhân Cách: Cách thể hiện ra bên ngoài, ấn tượng đầu tiên, chiến lược giao tiếp.
   - Thái Độ: Phản ứng bản năng trước tình huống mới, cách xử lý áp lực.
   - Trưởng Thành: Điểm hội tụ cuối đời, bài học lớn nhất cần đạt được.
   - Trí Tuệ: Cách tư duy, xử lý thông tin và ra quyết định.

2. QUY TẮC TƯƠNG TÁC:
   - Khi 2 chỉ số CÙNG NHÓM năng lượng (VD: Đường đời 7 + Nội tâm 7): Khuếch đại mạnh cả tích cực lẫn tiêu cực. Phân tích cụ thể: mặt tích cực khuếch đại gì? Mặt tiêu cực khuếch đại gì?
   - Khi 2 chỉ số KHÁC NHÓM BỔ TRỢ (VD: Hành động 1 + Trí tuệ 7): Tạo chiều sâu, bù đắp điểm yếu. Phân tích: số nào bù cho số nào? Cơ chế bù đắp cụ thể?
   - Khi 2 chỉ số TƯƠNG PHẢN (VD: Ổn định 4 + Tự do 5): Xung đột nội tâm nhưng tiềm năng tiến hóa CAO NHẤT. Phân tích: xung đột biểu hiện thế nào? Nếu hòa giải được → trở thành phiên bản cao ra sao?
   - CHỈ SỐ LÀM DỊU: Khi 2 số tạo xu hướng cực đoan (VD: Đường đời 7 + Nội tâm 7 = hướng nội nặng), tìm số thứ 3 trong bộ có thể làm dịu (VD: Sứ mệnh 5 hoặc 3 → kéo ra xã hội, giảm cô độc). PHẢI nhận diện và phân tích vai trò "làm dịu" này.

=== KIỂM TRA CHẤT LƯỢNG (TỰ ĐÁNH GIÁ TRƯỚC KHI TRẢ KẾT QUẢ) ===
Trước khi trả output, tự hỏi:
- Có câu nào giống y nguyên prompt không? → XÓA viết lại.
- Có câu nào không chứa số cụ thể không? → THÊM số vào.
- Phần chuyển hóa có nói rõ "từ hành vi A cụ thể → sang hành vi B cụ thể" không? → Nếu chung chung, VIẾT LẠI.
- Phần tình yêu có đủ chi tiết để đối phương biết cách cư xử không? → Nếu không, BỔ SUNG.
- Mỗi li có đủ 4 yếu tố (năng lượng gốc, tương tác tổ hợp, ví dụ thực tế, chuyển hóa) không? → Nếu thiếu yếu tố nào, BỔ SUNG.
- Đã phân tích tam giác Đạo Đức – Trí Tuệ – Nghị Lực cho bộ số chưa? → Nếu chưa, BỔ SUNG.
- Đã chỉ ra con đường chuyển hóa vô thức → tỉnh thức cho từng số chưa? → Nếu chưa, BỔ SUNG.
- Đã nhận diện chỉ số "làm dịu" trong bộ số chưa? → Nếu có chỉ số làm dịu mà chưa phân tích, BỔ SUNG.
- Đã đề cập Ngũ Hành (tương sinh/tương khắc) của bộ số chưa? → Nếu chưa, PHẢI lồng ghép.
- Đã sử dụng kết quả MA TRẬN TƯƠNG THÍCH và CHỈ SỐ LIÊN KẾT trong phân tích chưa? → Nếu chưa, BỔ SUNG.`;

      // *** CACHE CHECK — cache RIÊNG theo TÊN người dùng + bộ số + engine ***
      const cacheKey = getCacheKey(comboInfo.comboType, activeInputs.map(i => i.value), aiEngine, sharedResults?.name);
      if (forceRefresh) {
        try { localStorage.removeItem(cacheKey); } catch {}
        console.log(`[Cache CLEARED] ${cacheKey} — Phân tích lại theo yêu cầu`);
      }
      const cachedContent = forceRefresh ? null : getFromCache(cacheKey);

      if (cachedContent) {
        console.log(`[Cache HIT] ${cacheKey} — Trả kết quả từ cache, KHÔNG gọi API`);
        const cacheBanner = analysisLang === 'en'
          ? `<p class="text-xs text-green-400/80 italic mb-3">⚡ Cached result for "${sharedResults?.name || 'this user'}" + this number set (no API cost). Click <strong>"Force refresh"</strong> below to regenerate.</p>`
          : `<p class="text-xs text-green-400/80 italic mb-3">⚡ Kết quả lưu sẵn cho "${sharedResults?.name || 'người dùng này'}" + bộ số này (không tốn API). Bấm <strong>"Phân tích lại"</strong> bên dưới nếu muốn tạo mới.</p>`;
        setAnalysis({
          ...basicAnalysis,
          aiContent: cacheBanner + cachedContent,
        });
        setIsAnalyzing(false);
        return; // ← Thoát sớm, tiết kiệm 100% chi phí API
      }
      console.log(`[Cache MISS] ${cacheKey} — Gọi API mới (engine=${aiEngine})`);

      // Marker mà API gửi khi 1 phần stream XONG TỰ NHIÊN (không bị timeout)
      const COMPLETE_MARKER = '<!--PART_OK-->';

      // Gọi API Route (streaming) — MULTI-CALL: gọi tuần tự từng phần, nối kết quả
      let responseText = '';
      let allPartsComplete = true; // false nếu bất kỳ phần nào bị cắt giữa chừng

      for (let partIdx = 0; partIdx < promptParts.length; partIdx++) {
        const currentPrompt = promptParts[partIdx];
        const requestBody = JSON.stringify({
          prompt: currentPrompt,
          systemInstruction: analyzeSystemInstruction,
          engine: aiEngine,
        });
        console.log(`[Analyze] Part ${partIdx + 1}/${promptParts.length}, Payload: ${(requestBody.length / 1024).toFixed(1)} KB, Engine: ${aiEngine}`);

        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        // Xác nhận engine THỰC SỰ được dùng (chống trừ nhầm tiền)
        const engineUsed = apiResponse.headers.get('X-Engine-Used');
        if (engineUsed && engineUsed !== aiEngine) {
          console.warn(`[Engine MISMATCH] Yêu cầu ${aiEngine} nhưng server dùng ${engineUsed}`);
        }

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          let errorMsg: string;
          try {
            const errJson = JSON.parse(errorText);
            errorMsg = errJson.error || `Server error (${apiResponse.status})`;
          } catch {
            errorMsg = `Server error (${apiResponse.status})`;
          }
          throw new Error(errorMsg);
        }

        // Đọc streaming response cho phần hiện tại
        const reader = apiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let partText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          partText += chunk;

          // Cập nhật UI realtime — ẩn marker khỏi hiển thị
          setAnalysis({
            ...basicAnalysis,
            aiContent: (responseText + partText).split(COMPLETE_MARKER).join(''),
          });
        }

        // Kiểm tra phần này có hoàn chỉnh không (có marker = stream kết thúc tự nhiên)
        if (partText.includes(COMPLETE_MARKER)) {
          partText = partText.split(COMPLETE_MARKER).join('');
        } else {
          allPartsComplete = false;
          console.warn(`[Part ${partIdx + 1}] BỊ CẮT — không nhận được marker hoàn thành (có thể timeout)`);
        }

        responseText += partText;
        if (partIdx < promptParts.length - 1) responseText += '\n\n';
      }

      if (!responseText) {
        responseText = analysisLang === 'en'
          ? '<p class="text-yellow-400">No analysis content received from AI. Please try again.</p>'
          : '<p class="text-yellow-400">Không nhận được nội dung phân tích từ AI. Vui lòng thử lại.</p>';
      }

      // *** CHỈ LƯU CACHE khi TẤT CẢ các phần hoàn chỉnh ***
      if (responseText && !responseText.includes('[ERROR') && allPartsComplete) {
        saveToCache(cacheKey, responseText);
        console.log(`[Cache SAVED] ${cacheKey} — ${(responseText.length / 1024).toFixed(1)} KB`);
      } else if (!allPartsComplete) {
        console.warn('[Cache SKIPPED] Nội dung bị cắt — KHÔNG lưu cache để lần sau chạy lại');
      }

      setAnalysis({
        ...basicAnalysis,
        aiContent: responseText
      });
    } catch (error: any) {
      const engineName = aiEngine === 'claude' ? 'Claude' : aiEngine === 'gemini' ? 'Gemini' : 'OpenAI';
      console.error(`${engineName} Analyze error:`, error);
      setAnalysis({
        ...basicAnalysis,
        aiContent: `<p class='text-red-400 font-bold'>⚠️ ${analysisLang === 'en' ? `${engineName} connection error` : `Lỗi kết nối ${engineName}`}: ${error.message || (analysisLang === 'en' ? 'Please try again later' : 'Vui lòng thử lại sau')}</p>`
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
             <p
               className="text-gray-400 text-xs mt-1 cursor-default select-none"
               onDoubleClick={() => setShowEngineSwitch(!showEngineSwitch)}
             >
               AI Engine v5.0{engineUnlocked ? ` • ${aiEngine === 'claude' ? 'Claude Sonnet 4' : aiEngine === 'gemini' ? 'Gemini 2.5 Flash' : 'GPT-4.1 Mini'}` : ''}
             </p>
             {/* Hidden engine switch — appears on double-click, requires password */}
             {showEngineSwitch && !engineUnlocked && (
               <div className="mt-2 flex items-center gap-2">
                 <input
                   type="password"
                   value={enginePassword}
                   onChange={(e) => setEnginePassword(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && enginePasscodes.includes(enginePassword)) {
                       setEngineUnlocked(true);
                       setShowEngineSwitch(false);
                       setEnginePassword('');
                     }
                   }}
                   placeholder="••••••••"
                   className="w-24 px-2 py-1 text-xs rounded bg-black/60 border border-white/10 text-white focus:outline-none focus:border-blue-400/50"
                 />
                 <button
                   onClick={() => {
                     if (enginePasscodes.includes(enginePassword)) {
                       setEngineUnlocked(true);
                       setShowEngineSwitch(false);
                       setEnginePassword('');
                     } else {
                       setShowEngineSwitch(false);
                       setEnginePassword('');
                     }
                   }}
                   className="px-2 py-1 text-xs rounded bg-white/10 text-gray-400 hover:text-white"
                 >OK</button>
               </div>
             )}
             {engineUnlocked && (
               <div className="mt-1 flex items-center gap-1">
                 <button
                   onClick={() => setAiEngine('gemini')}
                   className={`px-2 py-0.5 text-[10px] rounded transition-all ${aiEngine === 'gemini' ? 'bg-blue-600/80 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                 >Gemini ~4K₫ (Mặc định)</button>
                 <button
                   onClick={() => setAiEngine('openai')}
                   className={`px-2 py-0.5 text-[10px] rounded transition-all ${aiEngine === 'openai' ? 'bg-green-600/80 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                 >GPT ~3K₫</button>
                 <button
                   onClick={() => setAiEngine('claude')}
                   className={`px-2 py-0.5 text-[10px] rounded transition-all ${aiEngine === 'claude' ? 'bg-purple-600/80 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                 >Claude ~26K₫</button>
               </div>
             )}
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

        {/* Công thức kết nối mặc định */}
        <div className="mb-6 p-4 bg-black/20 rounded-lg border border-blue-500/20 text-gray-300 text-sm leading-relaxed">
          <h4 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
            <Layers size={16} /> {analysisLang === 'vi' ? 'Công thức kết nối nhanh' : 'Quick Connection Formulas'}
          </h4>
          <div className="space-y-3">
            {/* Công thức 1: Đường Đời + Nội Tâm + Sứ Mệnh */}
            <button
              onClick={() => {
                setMode(3);
                setInputs([
                  { type: NumberType.LifePath, value: sharedResults ? sharedResults.lifePath.toString() : '', typeKey: 'lifePath' },
                  { type: NumberType.HeartDesire, value: sharedResults ? sharedResults.heartDesire.toString() : '', typeKey: 'heartDesire' },
                  { type: NumberType.Mission, value: sharedResults ? sharedResults.missionNumber.toString() : '', typeKey: 'missionNumber' }
                ]);
                setAnalysis(null);
              }}
              className="w-full text-left p-3 rounded-lg border border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-blue-400" />
                <span className="font-semibold text-blue-200">
                  {analysisLang === 'vi' ? 'Đường Đời + Nội Tâm + Sứ Mệnh' : 'Life Path + Soul + Mission'}
                </span>
                {sharedResults && (
                  <span className="ml-auto text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                    {sharedResults.lifePath} • {sharedResults.heartDesire} • {sharedResults.missionNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-5">
                {analysisLang === 'vi' ? 'Xu hướng cuộc đời, mô hình thành công, lộ trình phát triển cá nhân' : 'Life direction, success model, personal development roadmap'}
              </p>
            </button>

            {/* Công thức 2: Nội Tâm + Thái Độ + Nhân Cách (3 chỉ số) */}
            <button
              onClick={() => {
                setMode(3);
                setInputs([
                  { type: NumberType.HeartDesire, value: sharedResults ? sharedResults.heartDesire.toString() : '', typeKey: 'heartDesire' },
                  { type: NumberType.Attitude, value: sharedResults ? sharedResults.attitudeNumber.toString() : '', typeKey: 'attitudeNumber' },
                  { type: NumberType.Personality, value: sharedResults ? sharedResults.personalityNumber.toString() : '', typeKey: 'personalityNumber' }
                ]);
                setAnalysis(null);
              }}
              className="w-full text-left p-3 rounded-lg border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-purple-400" />
                <span className="font-semibold text-purple-200">
                  {analysisLang === 'vi' ? 'Nội Tâm + Thái Độ + Nhân Cách' : 'Soul + Attitude + Personality'}
                </span>
                {sharedResults && (
                  <span className="ml-auto text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                    {sharedResults.heartDesire} • {sharedResults.attitudeNumber} • {sharedResults.personalityNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-5 mb-2">
                {analysisLang === 'vi' ? 'Tính cách cốt lõi, cơ chế phản ứng dưới áp lực, hướng trưởng thành hành vi' : 'Core character, stress response mechanisms, behavioral growth direction'}
              </p>
              <div className="pl-5 space-y-1 text-[11px] text-gray-500">
                <p>{analysisLang === 'vi' ? '• Nội Tâm: Nhu cầu sâu nhất, động lực gốc rễ chi phối mọi quyết định' : '• Soul: Deepest needs, root motivation driving all decisions'}</p>
                <p>{analysisLang === 'vi' ? '• Nhân Cách: Cách bạn tương tác với thế giới bên ngoài, hình ảnh người khác nhìn thấy' : '• Personality: How you interact with the outside world, the image others see'}</p>
                <p>{analysisLang === 'vi' ? '• Thái Độ: Phản xạ tức thời khi đối mặt tình huống, cách ứng xử dưới áp lực' : '• Attitude: Immediate reactions when facing situations, behavior under pressure'}</p>
                <p className="text-purple-400/70 italic">{analysisLang === 'vi' ? '→ Kết hợp: Nội tâm tạo năng lượng gốc → Nhân cách quyết định cách thể hiện ra ngoài → Thái độ là phản xạ hành vi thực tế' : '→ Combined: Soul creates core energy → Personality determines external expression → Attitude is actual behavioral reflex'}</p>
              </div>
            </button>

            {/* Công thức 3: Nội Tâm + Trưởng Thành (2 chỉ số) */}
            <button
              onClick={() => {
                setMode(2);
                setInputs([
                  { type: NumberType.HeartDesire, value: sharedResults ? sharedResults.heartDesire.toString() : '', typeKey: 'heartDesire' },
                  { type: NumberType.Maturity, value: sharedResults ? sharedResults.maturityNumber.toString() : '', typeKey: 'maturityNumber' },
                  { type: NumberType.LifePath, value: sharedResults ? sharedResults.lifePath.toString() : '', typeKey: 'lifePath' }
                ]);
                setAnalysis(null);
              }}
              className="w-full text-left p-3 rounded-lg border border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-emerald-400" />
                <span className="font-semibold text-emerald-200">
                  {analysisLang === 'vi' ? 'Nội Tâm + Trưởng Thành' : 'Soul + Maturity'}
                </span>
                {sharedResults && (
                  <span className="ml-auto text-xs text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    {sharedResults.heartDesire} • {sharedResults.maturityNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-5 mb-2">
                {analysisLang === 'vi' ? 'Nội tâm sâu kết hợp hướng trưởng thành dài hạn' : 'Deep inner self combined with long-term maturity direction'}
              </p>
              <div className="pl-5 space-y-1 text-[11px] text-gray-500">
                <p>{analysisLang === 'vi' ? '• Nội Tâm: Con người thật bên trong, khao khát sâu thẳm không dễ bộc lộ' : '• Soul: True inner self, deep desires not easily revealed'}</p>
                <p>{analysisLang === 'vi' ? '• Trưởng Thành: Đích đến cuộc đời, phiên bản tốt nhất bạn đang hướng tới' : '• Maturity: Life destination, the best version you are evolving toward'}</p>
                <p className="text-emerald-400/70 italic">{analysisLang === 'vi' ? '→ Kết hợp: Nội tâm là điểm xuất phát → Trưởng thành là đích đến → Phân tích lộ trình chuyển hóa từ bản năng sang trí tuệ' : '→ Combined: Soul is starting point → Maturity is destination → Analyzing transformation from instinct to wisdom'}</p>
              </div>
            </button>
          </div>
          {!sharedResults && (
            <p className="mt-3 italic text-yellow-400/80 text-xs">
              {analysisLang === 'vi' ? '⚠ Hãy tra cứu thần số học trước để tự động điền chỉ số.' : '⚠ Please perform a numerology lookup first to auto-fill indices.'}
            </p>
          )}
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
  {/* Hiển thị chi phí ước tính và số dư */}
  {isValidSubscription && userBalance !== null && userBalance !== 999999 && (
    <div className="mt-3 p-3 bg-blue-900/30 rounded-xl border border-blue-500/20 text-sm">
      <div className="flex justify-between items-center">
        <span className="text-blue-300">💰 Số dư tài khoản:</span>
        <span className="text-white font-bold">{userBalance.toLocaleString('vi-VN')}₫</span>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-blue-300">📊 Chi phí/bài ({aiEngine === 'claude' ? 'Claude Sonnet' : aiEngine === 'gemini' ? 'Gemini Flash' : 'GPT-4.1 Mini'}):</span>
        <span className="text-yellow-300 font-medium">{(PRICE_PER_ANALYSIS[aiEngine] || 5000).toLocaleString('vi-VN')}₫</span>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-blue-300">📝 Số bài còn phân tích được:</span>
        <span className={`font-bold ${Math.floor(userBalance / (PRICE_PER_ANALYSIS[aiEngine] || 5000)) > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {Math.floor(userBalance / (PRICE_PER_ANALYSIS[aiEngine] || 5000))} bài
        </span>
      </div>
    </div>
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

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-2">
          <button
              onClick={() => handleDeepAnalyze(false)}
              disabled={isAnalyzing}
              className={`flex-1 relative overflow-hidden group bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all duration-500 ${isAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
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
          {/* Nút "Phân tích lại": xoá cache + gọi API mới. Chỉ hiện khi đã có kết quả. */}
          {analysis && !isAnalyzing && (
            <button
              onClick={() => handleDeepAnalyze(true)}
              title={analysisLang === 'vi' ? 'Bỏ qua cache, tạo bản phân tích mới (tốn API)' : 'Bypass cache, regenerate (uses API)'}
              className="md:w-auto px-4 py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-medium rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              <span>{analysisLang === 'vi' ? 'Phân tích lại' : 'Force refresh'}</span>
            </button>
          )}
        </div>

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
                    <>
                    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 leading-relaxed text-gray-200 shadow-2xl">
                        <div className="prose prose-invert prose-blue max-w-none">
                            <div className="ai-content-styled" dangerouslySetInnerHTML={{ __html: analysis.aiContent }} />
                        </div>
                    </div>

                    {/* Download & Email Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          const header = `PHÂN TÍCH LIÊN KẾT CHỈ SỐ\n${inputs.slice(0, mode).map(i => `${i.type}: ${i.value}`).join(' | ')}\nNgày: ${new Date().toLocaleDateString('vi-VN')}\n${'='.repeat(60)}\n\n`;
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = analysis.aiContent || '';
                          const textContent = header + tempDiv.innerText;
                          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `phan-tich-${inputs.slice(0, mode).map(i => i.value).join('-')}_${new Date().toISOString().slice(0,10)}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all border border-blue-400/30 shadow-lg"
                      >
                        <Download size={18} />
                        <span>{analysisLang === 'vi' ? 'Tải Về Nội Dung (.txt)' : 'Download Content (.txt)'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = analysis.aiContent || '';
                          const textContent = tempDiv.innerText;
                          const subject = encodeURIComponent(`Phân tích liên kết chỉ số: ${inputs.slice(0, mode).map(i => `${i.type} ${i.value}`).join(', ')}`);
                          const body = encodeURIComponent(textContent.substring(0, 1800) + '\n\n... (Nội dung đầy đủ vui lòng tải file .txt)');
                          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all border border-emerald-400/30 shadow-lg"
                      >
                        <Mail size={18} />
                        <span>{analysisLang === 'vi' ? 'Gửi Qua Email' : 'Send via Email'}</span>
                      </button>
                    </div>
                    </>
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
