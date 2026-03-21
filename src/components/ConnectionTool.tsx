import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, Zap, RefreshCw, Sparkles, BrainCircuit, Briefcase, GraduationCap, MessageCircle } from 'lucide-react';
import { analyzeConnectionLogic } from '@/utils/numerologyUtils';
import { ConnectionAnalysisResult, NumberType, SheetMeaning, CalculationResult } from '@/types';
import { fetchMeanings, getMeaning } from '../services/googleSheetService';
import Chatbot from './Chatbot';
import { OpenAI } from 'openai';
import { generateAnalyzeResponse } from '@/actions/openai';
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
      throw new Error('Chỉ số không hợp lệ. Hệ thống chỉ phân tích các số đơn (1-9) và số Master (11, 22, 33). Vui lòng kiểm tra lại.');
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
    `;
  }
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

  // State chatbot
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
// === TRANSLATION OBJECT ===
const t = {
  vi: {
    title: "Matrix Analysis Pro",
    subtitle: "AI Engine v4.0: Rule-Based Logic & Behavioral Psychology",
    mode2: "2 Chỉ Số",
    mode3: "3 Chỉ Số",
    guideTitle: "Hướng dẫn chọn chỉ số để kết nối",
    guide1: "Kết hợp <strong>Đường Đời + Nội Tâm + Sứ Mệnh</strong> (hoặc 2 trong 3 chỉ số) để biết về xu hướng cuộc đời, mô hình thành công, và lộ trình phát triển cá nhân của bạn.",
    guide2: "Kết hợp <strong>Nội Tâm + Thái Độ + Nhân Cách + Trưởng Thành</strong> (hoặc ít nhất Nội Tâm + 1 chỉ số khác trong nhóm) để biết về tính cách cốt lõi, cơ chế phản ứng dưới áp lực, và hướng trưởng thành hành vi của bạn.",
    guideNote: "Chọn đúng combo để nhận phân tích chuyên sâu từ AI Engine.",
    subLabel: "Nhập Mã Thuê Bao:",
    subPlaceholder: "Nhập mã (ví dụ: 123123)",
    activateBtn: "Kích Hoạt Phân Tích Chuyên Sâu",
    loadingText: "Đang kích hoạt Deep Engine & Mapping dữ liệu...",
    layerText: "Lớp số",
    enterNumber: "Nhập số",
    chatbotBtn: "Hỏi Chuyên Sâu Về Kết Quả (AI Chatbot)",
    fetching: "Đang đọc dữ liệu từ Google Sheet..."
  },
  en: {
    title: "Matrix Analysis Pro",
    subtitle: "AI Engine v4.0: Rule-Based Logic & Behavioral Psychology",
    mode2: "2 Numbers",
    mode3: "3 Numbers",
    guideTitle: "Guide to Selecting Numbers for Connection",
    guide1: "Combine <strong>Life Path + Heart Desire + Mission</strong> (or any 2 out of 3) to understand life trends, success model, and personal development roadmap.",
    guide2: "Combine <strong>Heart Desire + Attitude + Personality + Maturity</strong> (or at least Heart Desire + 1 other) to understand core personality, reaction mechanism under pressure, and behavioral growth direction.",
    guideNote: "Choose the right combo for deep AI analysis.",
    subLabel: "Enter Subscription Code:",
    subPlaceholder: "Enter code (e.g.: 123123)",
    activateBtn: "Activate Deep Analysis",
    loadingText: "Activating Deep Engine & Mapping data...",
    layerText: "Layer",
    enterNumber: "Enter number",
    chatbotBtn: "Ask Deep Questions About Results (AI Chatbot)",
    fetching: "Loading data from Google Sheet..."
  }
}[language];
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
        setSubscriptionMessage('Lỗi tải dữ liệu thuê bao. Vui lòng thử sau.');
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
    // Bypass codes
    if (['8888', 'admin', 'vip'].includes(trimmedCode)) {
       setSubscriptionMessage('Xác thực thành công (Chế độ Dự phòng/Test).');
       setIsValidSubscription(true);
       return true;
    }

    const sub = subscriptions.find(s => s.phone.trim() === trimmedCode);

    if (!sub) {
      setSubscriptionMessage('Mã không tồn tại hoặc chưa đăng ký.');
      setIsValidSubscription(false);
      return false;
    }

    try {
      const regDate = new Date(sub.regDate);
      if (isNaN(regDate.getTime())) throw new Error('Invalid date');

      const now = new Date();
      const expiryDate = new Date(regDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (now <= expiryDate) {
        setSubscriptionMessage('Thuê bao hợp lệ ✓');
        setIsValidSubscription(true);
        return true;
      } else {
        setSubscriptionMessage('Thuê bao đã hết hạn. Vui lòng gia hạn!');
        setIsValidSubscription(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionMessage('Lỗi kiểm tra mã. Vui lòng thử lại.');
      setIsValidSubscription(false);
      return false;
    }
  };

  const handleDeepAnalyze = async () => {
  // *** Kiểm tra thuê bao trước khi phân tích ***
  if (!phone) {
    setSubscriptionMessage('Vui lòng nhập mã thuê bao để xác thực.');
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
                  advice: "Không thể fetch dữ liệu từ Google Sheet. Vui lòng kiểm tra kết nối.",
                  growth: "",
                  aiContent: "<p class='text-red-400'>Lỗi: Không thể đọc dữ liệu từ Google Sheet.</p>"
               });
               setIsAnalyzing(false);
               setIsFetchingSheet(false);
               return; 
          } finally {
              setIsFetchingSheet(false);
          }
      }

      // *** Bước 2: Tiếp tục phân tích chỉ khi sheetData đã sẵn sàng ***
      const contextData = activeInputs.map(input => {
          const meaning = getMeaning(currentSheetData, input.typeKey, input.value, 'vi');
          return `### DỮ LIỆU GỐC (Hành vi/Tính cách) của ${input.type} số ${input.value}:\n"${meaning.substring(0, 1000)}..."`; 
      }).join('\n\n');

      const inputDescriptions = activeInputs.map(i => `${i.type} (${i.value})`).join(" + ");
        let prompt = "";
        const commonInstructions = `
            Đóng vai: Bạn là Chuyên gia Tâm lý học Hành vi (Behavioral Psychologist) và Cố vấn Chiến lược Nhân sự. Sử dụng kiến thức tâm lý học để phân tích tính cách, hành vi, xu hướng thể hiện tình cảm, và cách cải thiện, với trọng tâm vào các khía cạnh thực tế của con người như động lực cảm xúc, thói quen ứng xử, và chiến lược hóa giải mâu thuẫn nội tại.
            
            **DỮ LIỆU THAM CHIẾU (CONTEXT):**
            ${contextData}

            ${ruleEngine.getPromptModifiers(comboInfo.comboType, comboInfo.isSpecial, comboInfo.axisCount)}
            
            **YÊU CẦU ĐỊNH DẠNG:**
            - Trả về HTML sạch (h3, h4, ul, li, p, strong). KHÔNG dùng markdown (\`\`\`).
            - Bắt buộc phân tích sâu: Trích xuất đặc điểm từ context, diễn giải ý nghĩa, liên kết các ý, mở rộng với ví dụ thực tế (công việc, gia đình, tài chính, mối quan hệ), phân tích hậu quả/lợi ích, đảm bảo nội dung đủ ý, logic, không hời hợt. Mỗi phần phải tự diễn giải đầy đủ dựa trên dữ liệu.
        `;

        if (comboInfo.comboType === 'coreMissionLife') {
            // PROMPT CŨ CHO TRỤC ĐƯỜNG ĐỜI + NỘI TÂM + SỨ MỆNH
            prompt = `
                ${commonInstructions}

                **KHUNG PHÂN TÍCH 5 LỚP (DEEP FRAMEWORK):**

                <h3>1. BẢN CHẤT & ĐỘNG LỰC CỐT LÕI (Core Dynamics)</h3>
                <ul>
<li>
<strong>Lớp Bản Chất (Core Identity):</strong>
Dựa trên dữ liệu gốc của các số, trích xuất các đặc điểm chính và phân tích sự kết hợp tạo ra mẫu người có tính cách gốc là gì? Diễn giải sâu sắc với ví dụ thực tế từ cuộc sống hàng ngày, công việc, mối quan hệ, nhấn mạnh cách các đặc điểm này hình thành nên bản chất cốt lõi.

<ul>
<li><strong>Nhóm động lực tâm lý chủ đạo:</strong> Trích xuất từ dữ liệu gốc, bộ số này thiên về Hành động (1–8), Cảm xúc (2–6), Sáng tạo (3–5) hay Trí tuệ (7–9) hay logic cẩn thận (4)? Phân tích nhóm chiếm ưu thế quyết định khí chất lõi như thế nào, với ví dụ cụ thể về hành vi trong môi trường công sở hoặc gia đình, và hậu quả nếu nhóm này bị lệch.</li>
 
<li><strong>Động cơ cốt lõi:</strong> Từ dữ liệu gốc, họ sống vì điều gì? Thành tựu – Tự do – Giá trị – Sự công nhận – Sự an toàn – Cống hiến? Diễn giải sâu cách nhiên liệu bên trong này chi phối quyết định, đưa ví dụ thực tế như cách họ chọn nghề nghiệp hoặc xử lý khủng hoảng, và cách nó ảnh hưởng đến động lực lâu dài.</li>
 
<li><strong>Bản sắc cá nhân:</strong> Trích xuất từ context, họ là người dẫn dắt, người xây dựng, người kết nối, người đổi mới hay người khai sáng? Phân tích vai trò tự nhiên trong tập thể với ví dụ cụ thể, như vai trò lãnh đạo trong nhóm làm việc hoặc vai trò hỗ trợ trong gia đình, và lý do tại sao bản sắc này là cốt lõi.</li>
 
<li><strong>Định hướng nội tại:</strong> Dựa trên dữ liệu, thiên về cá nhân hay cộng đồng? Thực tế hay lý tưởng? Ổn định hay bứt phá? Diễn giải hướng sống dài hạn với ví dụ về lựa chọn nghề nghiệp hoặc mối quan hệ, phân tích rủi ro nếu định hướng này bị bỏ qua.</li>
 
<li><strong>Mức độ đồng bộ nội – ngoại:</strong> Từ dữ liệu gốc, nội tâm có trùng khớp với cách họ thể hiện ra ngoài không? Nếu lệch pha, diễn giải sâu họ dễ rơi vào mâu thuẫn bản thân hoặc sống “vai diễn” như thế nào, với ví dụ thực tế như căng thẳng công việc dẫn đến kiệt sức.</li>
 
<li><strong>Khí chất tổng thể:</strong> Trích xuất và phân tích, người này mang động lực tâm lý trầm ổn – quyết liệt – linh hoạt – sâu sắc – nhân văn hay thực dụng? Diễn giải cách khí chất này ảnh hưởng đến tương tác hàng ngày, với ví dụ từ cách xử lý xung đột hoặc lập kế hoạch tài chính.</li>
</ul>
</li>
<li>
<strong>Cơ Chế Tâm Lý (Mechanism):</strong>
Dựa trên dữ liệu gốc, trích xuất và phân tích khi bình thường (Flow) và khi áp lực (Stress), họ tư duy và phản ứng thế nào? Mở rộng với ví dụ thực tế sâu sắc về cách cơ chế này vận hành trong cuộc sống.

<ul>
<li><strong>Trạng thái Flow:</strong> Trích xuất từ context, khi môi trường thuận lợi, số nào chi phối hành vi? Diễn giải họ hành động quyết đoán, mềm mỏng, sáng tạo hay phân tích sâu như thế nào, với ví dụ cụ thể từ thành công công việc hoặc mối quan hệ hạnh phúc.</li>
 
<li><strong>Trạng thái Stress:</strong> Từ dữ liệu, khi áp lực xuất hiện, họ phản ứng theo xu hướng nào: kiểm soát, né tránh, bùng nổ cảm xúc hay thu mình? Phân tích sâu hậu quả và cách nhận biết, ví dụ từ tình huống thất bại dự án hoặc tranh cãi gia đình.</li>
 
<li><strong>Chi phối lý trí:</strong> Trích xuất, số nào quyết định logic, phân tích, chiến lược? Diễn giải cách nó ảnh hưởng đến quyết định lớn, với ví dụ thực tế như lập kế hoạch tài chính hoặc giải quyết vấn đề phức tạp.</li>
 
<li><strong>Chi phối cảm xúc:</strong> Từ dữ liệu gốc, số nào điều khiển nỗi sợ, tổn thương, sự nhạy cảm? Phân tích sâu cách nó hình thành phản ứng cảm xúc, ví dụ từ cách xử lý thất bại tình cảm hoặc căng thẳng công việc.</li>
 
<li><strong>Cơ chế phòng vệ:</strong> Trích xuất và diễn giải, khi bị tổn thương, họ có xu hướng đổ lỗi, tự trách, kiểm soát người khác hay tự cô lập? Mở rộng với ví dụ thực tế và hậu quả lâu dài nếu không điều chỉnh.</li>
 
<li><strong>Mô hình hành vi lặp lại:</strong> Dựa trên context, những phản xạ vô thức nào thường xuyên tái diễn khi họ gặp xung đột? Phân tích sâu vòng lặp này, với ví dụ từ hành vi lặp lại trong mối quan hệ hoặc công việc.</li>
 
<li><strong>Điểm kích hoạt:</strong> Từ dữ liệu, điều gì dễ làm họ mất cân bằng nhất? Bị kiểm soát? Bị xem thường? Bị bỏ rơi? Thiếu tự do? Diễn giải cách tránh và xử lý, ví dụ cụ thể từ tình huống đời thực.</li>
</ul>
</li>
<li>
<strong>Mô Hình Thành Công (Success Pattern):</strong>
Trích xuất từ dữ liệu gốc, phân tích công thức thành công thực tế nhất cho bộ số này, mở rộng với diễn giải sâu và ví dụ thực tế.

<ul>
<li><strong>Môi trường phù hợp:</strong> Từ context, họ phát triển tốt trong môi trường cạnh tranh, nhân văn, sáng tạo hay có hệ thống? Diễn giải lý do và ví dụ từ sự nghiệp thành công hoặc thất bại do môi trường sai.</li>
 
<li><strong>Cách đạt thành tựu:</strong> Trích xuất, thành công nhờ cá nhân xuất sắc, nhờ xây hệ thống, nhờ kết nối đội nhóm hay nhờ chuyên môn sâu? Phân tích sâu chiến lược, ví dụ từ case study cá nhân hóa.</li>
 
<li><strong>Chiến lược tối ưu:</strong> Dựa trên dữ liệu, nên tập trung vào mở rộng nhanh, phát triển bền vững, xây thương hiệu cá nhân hay tích lũy giá trị dài hạn? Diễn giải với ví dụ thực tế từ quản lý tài chính hoặc phát triển sự nghiệp.</li>
 
<li><strong>Lợi thế tự nhiên:</strong> Từ dữ liệu gốc, kỹ năng nổi bật nhất là gì? Lãnh đạo, giao tiếp, phân tích, chăm sóc hay đổi mới? Phân tích cách tận dụng, ví dụ từ vai trò trong nhóm.</li>
 
<li><strong>Đòn bẩy thành công:</strong> Trích xuất, khi kích hoạt đúng động lực tâm lý, họ sẽ bứt phá mạnh nhất ở đâu? Diễn giải sâu với ví dụ từ chuyển biến sự nghiệp.</li>
 
<li><strong>Vai trò phù hợp:</strong> Từ context, lãnh đạo, chuyên gia, người truyền cảm hứng, nhà cố vấn, người xây dựng nền tảng hay nhà khai phá? Phân tích lý do và ví dụ thực tế từ vị trí công việc lý tưởng.</li>
</ul>
</li>
<li>
<strong>Điểm Mù Hành Vi (Shadow):</strong>
Dựa trên dữ liệu gốc, trích xuất and phân tích những thói quen xấu, mặt trái động lực tâm lý và rào cản cần khắc phục, với diễn giải sâu và ví dụ thực tế.

<ul>
<li><strong>Thiên lệch động lực tâm lý:</strong> Từ dữ liệu, số nào đang lấn át? Diễn giải nó đem đến điều gì cho nội tâm hay xu hướng tâm lý, ví dụ từ hành vi lệch lạc trong mối quan hệ.</li>
 
<li><strong>Thói quen phá hủy:</strong> Trích xuất, những năng lượng nghịch của con số đó sẽ gây nên điều gì dẫn đến hậu quả gì? Phân tích ảnh hưởng đến quyết định, ví dụ từ sai lầm tài chính hoặc xung đột gia đình.</li>
 
<li><strong>Nỗi sợ cốt lõi:</strong> Từ context, sợ thất bại, sợ bị từ chối, sợ mất kiểm soát, sợ không được công nhận hay sợ mất tự do? Diễn giải sâu nguồn gốc và cách biểu hiện, ví dụ thực tế.</li>
 
<li><strong>Hành vi tự sabotaging:</strong> Trích xuất, họ có tự phá cơ hội bằng sự do dự, nóng vội, thiếu nhất quán hay cầu toàn quá mức? Phân tích vòng lặp, ví dụ từ cơ hội nghề nghiệp bị bỏ lỡ.</li>
 
<li><strong>Mặt trái khi lệch hướng:</strong> Từ dữ liệu, khi mất cân bằng, họ sẽ trở thành con người thế nào và ảnh hưởng đến mối quan hệ ra sao? Diễn giải sâu với ví dụ từ xung đột xã hội.</li>
 
<li><strong>Hậu quả dài hạn:</strong> Nếu không điều chỉnh, lặp đi lặp lại sẽ gây ảnh hưởng nghiêm trọng thế nào đến họ và người xung quanh? Phân tích sâu, ví dụ từ sức khỏe tâm lý hoặc mối quan hệ tan vỡ.</li>
</ul>
</li>

<li>
<strong>Bài Học Phát Triển (Evolution):</strong>
Trích xuất từ dữ liệu gốc, phân tích kỹ năng cụ thể cần rèn luyện để thăng tiến, với diễn giải sâu và ví dụ thực tế.

<ul>
<li><strong>Kỹ năng cần rèn luyện:</strong> Từ context, kỷ luật bản thân, kiểm soát cảm xúc, kỹ năng lãnh đạo, tư duy chiến lược, giao tiếp thấu cảm hay khả năng thích nghi? Diễn giải cách rèn và lợi ích, ví dụ từ thói quen hàng ngày.</li>
 
<li><strong>Bài học cốt lõi:</strong> Trích xuất, họ cần học cách cân bằng giữa lý trí và cảm xúc, giữa tự do và trách nhiệm, giữa cá nhân và tập thể. Phân tích sâu ý nghĩa, ví dụ từ chuyển biến cá nhân.</li>
 
<li><strong>Thói quen nên xây dựng:</strong> Từ dữ liệu, thiết lập mục tiêu dài hạn, thực hành phản tư, quản trị thời gian, rèn luyện sự kiên trì. Diễn giải cách áp dụng, ví dụ từ lập kế hoạch hàng tuần.</li>
 
<li><strong>Chuyển hóa điểm yếu:</strong> Trích xuất, biến sự nhạy cảm thành trực giác, biến tham vọng thành tầm nhìn, biến kỷ luật thành nền tảng bền vững. Phân tích quá trình, ví dụ thực tế từ case tự cải thiện.</li>
 
<li><strong>Phiên bản trưởng thành:</strong> Từ context, khi tích hợp đầy đủ động lực tâm lý, họ sẽ trở thành ai? Nhà lãnh đạo nhân văn, chuyên gia uy tín, người truyền cảm hứng hay người xây dựng hệ thống giá trị? Diễn giải sâu vai trò xã hội.</li>
 
<li><strong>Chiến lược phát triển dài hạn:</strong> Phân tích, phát triển chiều sâu nội tâm trước khi mở rộng ảnh hưởng bên ngoài, với ví dụ từ lộ trình sự nghiệp hoặc phát triển bản thân.</li>
</ul>
</li>
                </ul>

<h3>2. TƯƠNG TÁC & XUNG ĐỘT (Interaction)</h3>
<ul>
    <li>
        <strong>Độ Đồng Hướng:</strong>
        Trích xuất từ dữ liệu gốc, phân tích các chỉ số này hỗ trợ hay mâu thuẫn nhau về mặt mục tiêu và hành động? Diễn giải sâu với ví dụ thực tế từ quyết định cuộc sống.

        <ul>
            <li><strong>Đồng hướng cao:</strong> Khi các số cùng nhóm động lực tâm lý (Hành động, Cảm xúc, Sáng tạo, Trí tuệ), phân tích họ có nội lực mạnh, nhất quán, quyết định nhanh như thế nào, ví dụ từ thành công dự án nhóm.</li>
            <li><strong>Bổ trợ:</strong> Khi khác nhóm nhưng bù trừ cho nhau (ví dụ: Trí tuệ + Hành động), diễn giải họ có chiều sâu và khả năng triển khai ra sao, ví dụ từ hợp tác kinh doanh.</li>
            <li><strong>Tương phản mạnh:</strong> Khi các số đại diện cho hai cực đối lập (ổn định – tự do, cảm xúc – quyền lực), phân tích nội tâm giằng xé nhưng tiềm năng phát triển cao nếu trưởng thành, ví dụ từ khủng hoảng cá nhân.</li>
            <li><strong>Câu hỏi phân tích sâu:</strong>
                <ul>
                    <li>Mục tiêu bên trong và mục tiêu bên ngoài có trùng nhau không? Diễn giải với ví dụ từ lựa chọn nghề nghiệp.</li>
                    <li>Họ đang sống theo bản chất hay theo vai trò xã hội? Phân tích hậu quả nếu sống giả tạo.</li>
                    <li>Họ hành động vì giá trị hay vì áp lực? Ví dụ từ quyết định dưới stress.</li>
                </ul>
            </li>
        </ul>
    </li>

    <li>
        <strong>Phân Tích Mâu Thuẫn (nếu có):</strong>
        Từ dữ liệu gốc, trích xuất và phân tích có sự giằng xé giữa “nhu cầu bên trong” và “trách nhiệm bên ngoài” không? Mở rộng sâu với ví dụ thực tế.

        <ul>
            <li><strong>Mâu thuẫn nội tâm:</strong> Khi Nội tâm cần A nhưng Nhân cách/Thái Độ thể hiện B, diễn giải cách nó gây căng thẳng, ví dụ từ xung đột giá trị cá nhân.</li>
            <li><strong>Mâu thuẫn hành vi:</strong> Khi họ muốn làm điều này nhưng phản xạ lại làm điều ngược lại, phân tích vòng lặp, ví dụ từ hành xử trong tranh cãi.</li>
            <li><strong>Mâu thuẫn môi trường:</strong> Họ ở trong môi trường trái với động lực chủ đạo của mình, diễn giải hậu quả, ví dụ từ môi trường làm việc không phù hợp.</li>
            <li><strong>Biểu hiện thường thấy:</strong> Mệt mỏi, thiếu động lực, hay tự nghi ngờ, dễ nổi nóng hoặc thu mình, ví dụ từ triệu chứng kiệt sức.</li>
            <li><strong>Câu hỏi phân tích sâu:</strong>
                <ul>
                    <li>Khi áp lực, họ chọn bảo vệ cái tôi hay bảo vệ mối quan hệ? Diễn giải lựa chọn với ví dụ.</li>
                    <li>Họ sợ mất điều gì nhất: tự do, vị thế, sự công nhận, sự an toàn? Phân tích nguồn gốc sợ hãi.</li>
                </ul>
            </li>
        </ul>
    </li>

    <li>
        <strong>Cơ Chế Cân Bằng:</strong>
        Trích xuất từ context, khi mệt mỏi, họ quay về thói quen của số nào? Phân tích sâu cơ chế với ví dụ thực tế.

        <ul>
            <li><strong>Số an toàn:</strong> Số đại diện cho nhu cầu sâu nhất (thường là Nội Tâm), diễn giải cách nó giúp phục hồi, ví dụ từ hoạt động thư giãn.</li>
            <li><strong>Số phòng vệ:</strong> Số đại diện cho phản xạ mạnh nhất khi stress, phân tích ưu nhược điểm, ví dụ từ phản ứng dưới áp lực.</li>
            <li><strong>Mô hình lặp lại:</strong> Họ có xu hướng lặp lại hành vi kiểm soát, né tránh, bùng nổ hay im lặng? Diễn giải cách phá vỡ vòng lặp.</li>
            <li><strong>Điểm phục hồi:</strong> Muốn cân bằng, họ cần quay về giá trị nào? Ví dụ thực tế từ phương pháp tự chăm sóc.</li>
        </ul>
    </li>
</ul>

                <h3>3. HỒ SƠ TÍNH CÁCH (Profile)</h3>
<ul>
    <li>
        <strong>Tư Duy:</strong>

        <ul>
            <li><strong>Logic hay Cảm xúc:</strong> Trích xuất từ dữ liệu, quyết định dựa trên dữ kiện hay cảm nhận? Diễn giải sâu cách tư duy ảnh hưởng đến quyết định, ví dụ từ giải quyết vấn đề công việc.</li>
            <li><strong>Thực tế hay Lý tưởng:</strong> Tập trung vào kết quả cụ thể hay giá trị dài hạn? Phân tích ưu nhược, ví dụ từ lập kế hoạch tương lai.</li>
            <li><strong>Chiều sâu tư duy:</strong> Phân tích chiến lược hay phản ứng tức thời? Diễn giải với ví dụ từ xử lý khủng hoảng.</li>
            <li><strong>Nội lực trí tuệ:</strong> Họ có khả năng tập trung sâu và kiên định không? Phân tích hạn chế nếu thiếu, ví dụ từ học tập hoặc nghiên cứu.</li>
            <li><strong>Điểm hạn chế tư duy:</strong> Quá cầu toàn, quá cảm tính, quá lý tưởng hóa hay thiếu nhất quán? Diễn giải hậu quả và cách khắc phục, ví dụ thực tế.</li>
        </ul>
    </li>

    <li>
        <strong>Hành Vi:</strong>

        <ul>
            <li><strong>Chủ động hay quan sát:</strong> Họ là người mở đầu hay người phản hồi? Phân tích trong ngữ cảnh xã hội, ví dụ từ giao tiếp nhóm.</li>
            <li><strong>Quyết liệt hay thận trọng:</strong> Ra quyết định nhanh hay cân nhắc lâu? Diễn giải ưu nhược, ví dụ từ đầu tư tài chính.</li>
            <li><strong>Mức động lực cá nhân:</strong> Mạnh mẽ, linh hoạt, ổn định hay trầm lắng? Phân tích cách nó ảnh hưởng đến năng suất, ví dụ từ thói quen làm việc.</li>
            <li><strong>Sức bền nội lực:</strong> Họ bền bỉ theo đuổi mục tiêu hay dễ thay đổi? Diễn giải với ví dụ từ dự án dài hạn.</li>
            <li><strong>Hạn chế hành vi:</strong> Dễ mất kiên nhẫn, thiếu kỷ luật, sợ xung đột hay quá kiểm soát? Phân tích sâu và ví dụ từ mối quan hệ.</li>
        </ul>
    </li>
</ul>

                <h3>4. ỨNG DỤNG THỰC TẾ (Actionable Insights)</h3>
<h4>🏢 Sự Nghiệp & Kinh Doanh:</h4>
<ul>
    <li>
        <strong>Vị Thế Phù Hợp:</strong>
        Trích xuất từ dữ liệu, phân tích vị thế phù hợp cho từng nhóm, diễn giải sâu lý do và ví dụ thực tế từ ngành nghề.

        <ul>
            <li>Nhóm Hành động: Lãnh đạo, quản lý, khởi nghiệp. Diễn giải cách nhóm này tạo kết quả, ví dụ từ doanh nhân thành công.</li>
            <li>Nhóm Cảm xúc: Giáo dục, chăm sóc khách hàng, HR. Phân tích cách tạo kết nối, ví dụ từ vai trò cố vấn.</li>
            <li>Nhóm Sáng tạo: Marketing, truyền thông, nghệ thuật. Diễn giải sự mới mẻ, ví dụ từ dự án sáng tạo.</li>
            <li>Nhóm Trí tuệ: Cố vấn, nghiên cứu, chuyên gia. Phân tích chiều sâu, ví dụ từ nghiên cứu khoa học.</li>
        </ul>
    </li>

    <li>
        <strong>Lý Giải Vì Sao Phù Hợp:</strong>
        Từ context, động lực lõi quyết định cách họ tạo giá trị: Người hành động tạo kết quả, người cảm xúc tạo kết nối, người sáng tạo tạo sự mới mẻ, người trí tuệ tạo chiều sâu. Diễn giải sâu với ví dụ từ sự nghiệp thực tế.
    </li>

    <li>
        <strong>Điểm Yếu Cần Quản Trị:</strong>
        Trích xuất, phân tích điểm yếu như thiếu kỷ luật, quá kiểm soát, dễ dao động, dễ kiệt sức, với ví dụ và chiến lược quản trị.

        <ul>
            <li>Thiếu kỷ luật, thiếu tập trung. Diễn giải hậu quả và cách khắc phục.</li>
            <li>Quá kiểm soát hoặc quá cả nể. Ví dụ từ quản lý đội nhóm.</li>
            <li>Dễ dao động khi bị từ chối. Phân tích trong bán hàng.</li>
            <li>Dễ kiệt sức vì ôm trách nhiệm. Ví dụ từ làm việc quá sức.</li>
        </ul>
    </li>

    <li>
        <strong>Chiến lược phát huy:</strong>
        Xây môi trường phù hợp với nhóm động lực chủ đạo thay vì ép bản thân vào môi trường trái bản chất. Diễn giải sâu với ví dụ từ chuyển việc thành công.
    </li>
</ul>

<h4>🤝 Giao Tiếp & Thuyết Phục:</h4>
<ul>
    <li>
        <strong>Cách Tiếp Cận (Do's):</strong>
        Trích xuất và phân tích cách tiếp cận cho từng nhóm, với ví dụ thực tế từ đàm phán hoặc tư vấn.

        <ul>
            <li>Nhóm Hành động: Nói thẳng, rõ ràng, tập trung kết quả. Diễn giải hiệu quả.</li>
            <li>Nhóm Cảm xúc: Xây niềm tin trước khi đưa giải pháp. Ví dụ từ tư vấn khách hàng.</li>
            <li>Nhóm Sáng tạo: Tạo hứng thú và không gian linh hoạt. Phân tích sáng tạo.</li>
            <li>Nhóm Trí tuệ: Cung cấp chiều sâu và lý do rõ ràng. Ví dụ từ báo cáo.</li>
        </ul>
    </li>

    <li>
        <strong>Điều Cần Tránh (Don'ts):</strong>
        Phân tích điều cần tránh cho từng nhóm, với ví dụ hậu quả.

        <ul>
            <li>Áp lực quá mức với người nhạy cảm. Diễn giải căng thẳng.</li>
            <li>Nói vòng vo với người quyết đoán. Ví dụ từ họp hành.</li>
            <li>Thiếu cấu trúc với người logic. Phân tích thất bại giao tiếp.</li>
            <li>Quá khô khan với người sáng tạo. Ví dụ từ trình bày ý tưởng.</li>
        </ul>
    </li>

    <li>
        <strong>Soi vào điểm yếu để thuyết phục:</strong>
        Trích xuất, phân tích cách soi điểm yếu để thuyết phục, với ví dụ thực tế.

        <ul>
            <li>Người sợ mất kiểm soát → cho họ quyền lựa chọn. Diễn giải trong bán hàng.</li>
            <li>Người sợ bị từ chối → xây sự an toàn. Ví dụ từ đàm phán.</li>
            <li>Người thiếu tự tin → củng cố giá trị của họ. Phân tích động viên.</li>
            <li>Người tham vọng cao → nói về tầm nhìn dài hạn. Ví dụ từ lập kế hoạch.</li>
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

      // Gọi Server Action thay vì fetch /api/analyze
      const result = await generateAnalyzeResponse(prompt);

      if (result.error) {
        throw new Error(result.error);
      }

      const responseText = result.content || '<p class="text-yellow-400">Không nhận được nội dung phân tích từ AI. Vui lòng thử lại.</p>';

      setAnalysis({
        ...basicAnalysis,
        aiContent: responseText
      });
    } catch (error: any) {
      console.error('OpenAI Analyze error:', error);
      setAnalysis({
        ...basicAnalysis,
        aiContent: `<p class='text-red-400 font-bold'>⚠️ Lỗi kết nối OpenAI: ${error.message || 'Vui lòng thử lại sau'}</p>`
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
            <BrainCircuit className="text-blue-400" /> {t.title}
          </h2>
          <p className="text-gray-400 text-xs mt-1">{t.subtitle}</p>
        </div>

        <div className="flex bg-black/40 rounded-lg p-1">
          <button
            onClick={() => { setMode(2); setAnalysis(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 2 ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {t.mode2}
          </button>
          <button
            onClick={() => { setMode(3); setAnalysis(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 3 ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            {t.mode3}
          </button>
        </div>
      </div>

      {/* Hướng dẫn kết nối chỉ số */}
      <div className="mb-6 p-4 bg-black/20 rounded-lg border border-blue-500/20 text-gray-300 text-sm leading-relaxed">
        <h4 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
          <Layers size={16} /> {t.guideTitle}
        </h4>
        <ul className="list-disc pl-5 space-y-2">
          <li dangerouslySetInnerHTML={{ __html: t.guide1 }} />
          <li dangerouslySetInnerHTML={{ __html: t.guide2 }} />
        </ul>
        <p className="mt-2 italic text-gray-400">{t.guideNote}</p>
      </div>

      {/* Input số điện thoại / mã thuê bao */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-medium">{t.subLabel}</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value.trim())}
          className="w-full bg-black/30 text-white p-4 rounded-xl border border-white/10 focus:border-blue-500 text-lg"
          placeholder={t.subPlaceholder}
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
              {t.layerText} {idx + 1}
            </div>

            <div className="mt-2 space-y-3">
              <select
                value={input.type}
                onChange={(e) => handleInputChange(idx, 'type', e.target.value)}
                className="w-full bg-black/20 text-blue-100 text-sm font-medium p-2.5 rounded-lg border border-white/5 focus:border-blue-500/50 outline-none appearance-none"
              >
                {Object.values(NumberType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={input.value}
                  onChange={(e) => handleInputChange(idx, 'value', e.target.value)}
                  className="w-full bg-transparent text-center text-4xl font-bold text-white p-2 focus:outline-none border-b border-white/10 focus:border-blue-400 transition-colors placeholder-white/10"
                />
                <div className="text-center text-xs text-gray-500 mt-1 uppercase tracking-widest">
                  {t.enterNumber}
                </div>
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
        disabled={isAnalyzing || !isValidSubscription}
        className={`w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all duration-500 ${isAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
      >
        <div className="flex items-center justify-center gap-3 relative z-10">
          {isAnalyzing ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              <span>{t.loadingText}</span>
            </>
          ) : (
            <>
              <Sparkles size={20} className="group-hover:text-yellow-300 transition-colors" />
              <span>{t.activateBtn}</span>
            </>
          )}
        </div>
      </button>

      {/* Results Area */}
      {analysis && (
        <div className="mt-10 animate-fadeIn space-y-8">
          {isFetchingSheet && (
            <div className="text-center mb-4 text-yellow-400 flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              <span>{t.fetchingSheet}</span>
            </div>
          )}

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 mb-3">
              <Zap size={16} className="fill-blue-400 text-blue-400" />
              <span className="font-bold tracking-wide uppercase">{analysis.relationship}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{analysis.keywords}</h3>
          </div>

         {analysis?.aiContent && (
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 leading-relaxed text-gray-200 shadow-2xl">
            <div className="prose prose-invert prose-blue max-w-none">
              <div className="ai-content-styled" dangerouslySetInnerHTML={{ __html: analysis.aiContent }} />
            </div>
          </div>
        )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-900/10 p-6 rounded-2xl border border-emerald-500/20">
                <p>Hệ thống đang chờ kết nối...</p>
              </div>
            </div>
      

          <div className="mt-8">
            <button
              onClick={() => setIsChatbotOpen(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 border border-emerald-400/30"
            >
              <MessageCircle size={22} />
              <span>{t.chatbotBtn}</span>
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
              language={language}
            />
          </div>
        </div>
      )}
    </div>
  );
}
    // === CSS được đẩy ra ngoài return để tránh lỗi parser ===
<style>{`
  .ai-content-styled h3 {
    color: #fca5a5;
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
    color: #93c5fd;
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
    color: #e5e7eb;
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
    color: #818cf8;
    font-weight: bold;
    font-size: 1.2em;
    line-height: 1;
  }
  .ai-content-styled strong {
    color: #fbbf24;
    font-weight: 700;
  }
  .ai-content-styled em {
    color: #a5b4fc;
    font-style: italic;
  }
`}</style>

export default ConnectionTool;
