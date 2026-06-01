// src/utils/numerologyAnalysis.ts
// Hệ thống phân tích năng lượng liên kết chỉ số thần số học
// Dựa trên: Bridge Numbers, Compatibility Matrix, Five Elements (Ngũ Hành), Energy Polarity

// ============================================================
// 1. NGŨ HÀNH (Five Elements) — Phân loại số theo Pythagorean
// ============================================================
export type Element = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';

export const numberToElement: Record<string, Element> = {
  '1': 'Thủy',   // Giao tiếp, Biểu đạt, Dòng chảy
  '2': 'Thổ',    // Ổn định, Kiên nhẫn, Nền tảng
  '3': 'Mộc',    // Sáng tạo, Phát triển, Sinh sôi
  '4': 'Mộc',    // Cấu trúc, Tăng trưởng, Xây dựng
  '5': 'Thổ',    // Trung tâm, Thích nghi, Cân bằng
  '6': 'Kim',    // Trách nhiệm, Giá trị, Bảo vệ
  '7': 'Kim',    // Trí tuệ, Sắc bén, Phân tích
  '8': 'Thổ',    // Quyền lực, Vật chất, Kiên định
  '9': 'Hỏa',    // Nhiệt huyết, Lý tưởng, Chuyển hóa
  '11': 'Thủy',  // Master — Trực giác, Kênh dẫn
  '22': 'Thổ',   // Master — Kiến tạo, Nền tảng lớn
  '33': 'Hỏa',   // Master — Phụng sự, Tình yêu vĩ đại
};

export const elementInfo: Record<Element, {
  name: string;
  nameEn: string;
  trait: string;
  traitEn: string;
  numbers: string[];
}> = {
  'Thủy': {
    name: 'Thủy (Nước)', nameEn: 'Water',
    trait: 'Giao tiếp, biểu đạt, linh hoạt, thích nghi, trực giác',
    traitEn: 'Communication, expression, adaptability, intuition',
    numbers: ['1', '11'],
  },
  'Thổ': {
    name: 'Thổ (Đất)', nameEn: 'Earth',
    trait: 'Ổn định, kiên nhẫn, thực tế, nền tảng, bền bỉ',
    traitEn: 'Stability, patience, practicality, grounding, persistence',
    numbers: ['2', '5', '8', '22'],
  },
  'Mộc': {
    name: 'Mộc (Gỗ)', nameEn: 'Wood',
    trait: 'Sáng tạo, phát triển, mở rộng, đổi mới, tăng trưởng',
    traitEn: 'Creativity, growth, expansion, innovation',
    numbers: ['3', '4'],
  },
  'Kim': {
    name: 'Kim (Kim loại)', nameEn: 'Metal',
    trait: 'Sắc bén, phân tích, giá trị, trách nhiệm, chiều sâu',
    traitEn: 'Sharpness, analysis, values, responsibility, depth',
    numbers: ['6', '7'],
  },
  'Hỏa': {
    name: 'Hỏa (Lửa)', nameEn: 'Fire',
    trait: 'Nhiệt huyết, lý tưởng, chuyển hóa, đam mê, dẫn dắt',
    traitEn: 'Passion, idealism, transformation, drive, leadership',
    numbers: ['9', '33'],
  },
};

// Chu kỳ Sinh (Tương sinh): Mộc → Hỏa → Thổ → Kim → Thủy → Mộc
// Chu kỳ Khắc (Tương khắc): Mộc → Thổ → Thủy → Hỏa → Kim → Mộc
export type ElementRelation = 'tương_sinh' | 'tương_khắc' | 'đồng_hành' | 'trung_tính';

const productiveCycle: Record<Element, Element> = {
  'Mộc': 'Hỏa',   // Mộc sinh Hỏa (gỗ nuôi lửa)
  'Hỏa': 'Thổ',   // Hỏa sinh Thổ (lửa tạo tro → đất)
  'Thổ': 'Kim',   // Thổ sinh Kim (đất chứa quặng)
  'Kim': 'Thủy',   // Kim sinh Thủy (kim loại ngưng nước)
  'Thủy': 'Mộc',   // Thủy sinh Mộc (nước nuôi cây)
};

const destructiveCycle: Record<Element, Element> = {
  'Mộc': 'Thổ',   // Mộc khắc Thổ (rễ cây hút đất)
  'Thổ': 'Thủy',   // Thổ khắc Thủy (đất ngăn nước)
  'Thủy': 'Hỏa',   // Thủy khắc Hỏa (nước dập lửa)
  'Hỏa': 'Kim',   // Hỏa khắc Kim (lửa nung kim loại)
  'Kim': 'Mộc',   // Kim khắc Mộc (kim loại chặt gỗ)
};

export function getElementRelation(el1: Element, el2: Element): {
  relation: ElementRelation;
  description: string;
  descriptionEn: string;
} {
  if (el1 === el2) {
    return {
      relation: 'đồng_hành',
      description: `Cùng hành ${el1}: Năng lượng cộng hưởng mạnh, khuếch đại cả ưu điểm lẫn thách thức. Dễ đồng điệu nhưng thiếu sự bổ sung.`,
      descriptionEn: `Same element ${el1}: Strong resonance, amplifies both strengths and challenges. Easy harmony but lacks complementary balance.`,
    };
  }
  if (productiveCycle[el1] === el2) {
    return {
      relation: 'tương_sinh',
      description: `${el1} sinh ${el2}: Mối quan hệ nuôi dưỡng — ${el1} hỗ trợ và thúc đẩy ${el2} phát triển. Năng lượng chảy thuận, tạo sự phát triển tự nhiên.`,
      descriptionEn: `${el1} produces ${el2}: Nurturing relationship — ${el1} supports and fuels ${el2}'s growth. Energy flows naturally, creating organic development.`,
    };
  }
  if (productiveCycle[el2] === el1) {
    return {
      relation: 'tương_sinh',
      description: `${el2} sinh ${el1}: Mối quan hệ nuôi dưỡng — ${el2} hỗ trợ và thúc đẩy ${el1} phát triển. Năng lượng chảy thuận.`,
      descriptionEn: `${el2} produces ${el1}: Nurturing relationship — ${el2} supports and fuels ${el1}'s growth. Natural energy flow.`,
    };
  }
  if (destructiveCycle[el1] === el2) {
    return {
      relation: 'tương_khắc',
      description: `${el1} khắc ${el2}: Tạo ma sát và thử thách, nhưng cũng là động lực chuyển hóa mạnh nhất. ${el1} kiểm soát ${el2} — nếu ý thức được sẽ tạo sự rèn luyện và trưởng thành.`,
      descriptionEn: `${el1} controls ${el2}: Creates friction and challenges, but also the strongest transformation catalyst. If conscious, it builds discipline and maturity.`,
    };
  }
  if (destructiveCycle[el2] === el1) {
    return {
      relation: 'tương_khắc',
      description: `${el2} khắc ${el1}: Tạo ma sát và thử thách. ${el2} kiểm soát ${el1} — cần ý thức để biến xung đột thành bài học phát triển.`,
      descriptionEn: `${el2} controls ${el1}: Creates friction. ${el2} controls ${el1} — awareness needed to transform conflict into growth lessons.`,
    };
  }
  return {
    relation: 'trung_tính',
    description: `${el1} và ${el2}: Quan hệ trung tính — không sinh không khắc, tồn tại song song. Cần nỗ lực chủ động để tạo kết nối.`,
    descriptionEn: `${el1} and ${el2}: Neutral relationship — neither producing nor controlling. Requires conscious effort to create connection.`,
  };
}

// ============================================================
// 2. ÂM DƯƠNG (Polarity) — Chẵn/Lẻ
// ============================================================
export type Polarity = 'Dương' | 'Âm';

export function getPolarity(num: number | string): Polarity {
  const n = typeof num === 'string' ? parseInt(num) : num;
  // Số master giữ nguyên tính chất
  if (n === 11 || n === 33) return 'Dương'; // lẻ
  if (n === 22) return 'Âm'; // chẵn
  return n % 2 === 0 ? 'Âm' : 'Dương';
}

export function getPolarityAnalysis(p1: Polarity, p2: Polarity, lang: 'vi' | 'en' = 'vi'): string {
  if (p1 === p2 && p1 === 'Dương') {
    return lang === 'vi'
      ? 'Cùng Dương (lẻ): Cả hai đều hướng ngoại, chủ động, độc lập. Dễ cạnh tranh nhau nhưng năng lượng hành động rất mạnh.'
      : 'Both Yang (odd): Both are outward, proactive, independent. May compete but action energy is very strong.';
  }
  if (p1 === p2 && p1 === 'Âm') {
    return lang === 'vi'
      ? 'Cùng Âm (chẵn): Cả hai đều hướng nội, tiếp nhận, hợp tác. Dễ đồng thuận nhưng có thể thiếu động lực hành động.'
      : 'Both Yin (even): Both are inward, receptive, cooperative. Easy agreement but may lack action drive.';
  }
  return lang === 'vi'
    ? 'Âm-Dương cân bằng: Một chủ động, một tiếp nhận — tạo sự bổ sung tự nhiên. Đây là tổ hợp có tiềm năng hài hòa cao nhất nếu biết phối hợp.'
    : 'Yin-Yang balanced: One proactive, one receptive — natural complement. Highest harmony potential when coordinated.';
}

// ============================================================
// 3. CHỈ SỐ LIÊN KẾT (Bridge Numbers)
// ============================================================
export interface BridgeResult {
  bridgeNumber: number;
  from: string;
  to: string;
  message: string;
  messageEn: string;
  action: string;
  actionEn: string;
}

const bridgeMeanings: Record<number, { message: string; messageEn: string; action: string; actionEn: string }> = {
  0: {
    message: 'Năng lượng hai chỉ số hòa quyện hoàn hảo. Đường đi và đích đến đồng nhất.',
    messageEn: 'The energies of both indices are perfectly aligned. Path and destination are unified.',
    action: 'Tập trung mạnh mẽ, kiên trì theo đuổi — bạn đã đi đúng hướng.',
    actionEn: 'Stay focused and persistent — you are already on the right path.',
  },
  1: {
    message: 'Khoảng cách nhỏ — cần củng cố niềm tin vào bản thân và xác định mục tiêu rõ ràng hơn.',
    messageEn: 'Small gap — need to strengthen self-belief and clarify goals.',
    action: 'Tăng sự tự tin, lắng nghe trực giác bản thân thay vì quá phụ thuộc ý kiến người khác. Dám dẫn dắt.',
    actionEn: 'Build self-confidence, trust your intuition over others\' opinions. Dare to lead.',
  },
  2: {
    message: 'Cần mở lòng, học cách hợp tác và chia sẻ cảm xúc. Xu hướng tự giải quyết một mình cần được cân bằng.',
    messageEn: 'Need to open up, learn cooperation and emotional sharing. Tendency to solve alone needs balance.',
    action: 'Phát triển khả năng lắng nghe, thông cảm. Kết nối cảm xúc là cầu nối giữa hai năng lượng.',
    actionEn: 'Develop listening and empathy skills. Emotional connection bridges the two energies.',
  },
  3: {
    message: 'Cần lạc quan và sáng tạo hơn. Biến thất bại thành bài học — không để nỗi sợ kiểm soát.',
    messageEn: 'Need more optimism and creativity. Transform failures into lessons — don\'t let fear control you.',
    action: 'Thể hiện bản thân qua nghệ thuật, giao tiếp, hoặc sáng tạo. Cho phép mình vui vẻ và tự do biểu đạt.',
    actionEn: 'Express yourself through art, communication, or creativity. Allow yourself joy and free expression.',
  },
  4: {
    message: 'Cần kỷ luật và kế hoạch cụ thể. Xu hướng trì hoãn hoặc thiếu nền tảng cần được khắc phục.',
    messageEn: 'Need discipline and concrete plans. Procrastination and lack of foundation must be addressed.',
    action: 'Xây dựng thói quen ổn định, lập kế hoạch tài chính, từ bỏ trì hoãn. Nền tảng vững mới tạo đột phá.',
    actionEn: 'Build stable habits, plan finances, stop procrastinating. Strong foundation enables breakthroughs.',
  },
  5: {
    message: 'Cần linh hoạt và chấp nhận thay đổi. Sự cứng nhắc đang cản trở sự liên kết hai năng lượng.',
    messageEn: 'Need flexibility and acceptance of change. Rigidity blocks the connection between two energies.',
    action: 'Mở rộng trải nghiệm, thử những điều mới, cân bằng giữa nỗ lực và thư giãn. Dám phá vỡ giới hạn.',
    actionEn: 'Expand experiences, try new things, balance effort with relaxation. Dare to break limits.',
  },
  6: {
    message: 'Cần dành thời gian cho gia đình và trách nhiệm. Sự nghiệp không nên lấn át tình cảm.',
    messageEn: 'Need to invest time in family and responsibilities. Career should not overshadow relationships.',
    action: 'Phát triển tình yêu thương vô điều kiện, hỗ trợ người thân. Sự cho đi chân thành tạo ra cân bằng.',
    actionEn: 'Develop unconditional love, support loved ones. Genuine giving creates balance.',
  },
  7: {
    message: 'Cần chiêm nghiệm và tĩnh lặng nội tâm. Trực giác và lý trí cần được kết hợp hài hòa.',
    messageEn: 'Need contemplation and inner stillness. Intuition and logic must be harmoniously combined.',
    action: 'Dành thời gian thiền định, đọc sách, phân tích sâu. Ra quyết định bằng cả lý trí và trực giác.',
    actionEn: 'Spend time meditating, reading, deep analysis. Decide with both logic and intuition.',
  },
  8: {
    message: 'Cần cân bằng vật chất và tinh thần. Quản lý tài chính và tham vọng cần được kiểm soát.',
    messageEn: 'Need to balance material and spiritual. Financial management and ambition need control.',
    action: 'Đặt mục tiêu rõ ràng, thực tế. Duy trì cân bằng cảm xúc khi theo đuổi thành công vật chất.',
    actionEn: 'Set clear, realistic goals. Maintain emotional balance while pursuing material success.',
  },
  9: {
    message: 'Cần phát triển lòng nhân ái và tinh thần phục vụ. Cho đi để nhận lại — không ích kỷ.',
    messageEn: 'Need to develop compassion and service spirit. Give to receive — not selfishly.',
    action: 'Hỗ trợ cộng đồng, phát triển sự từ bi. Mục đích lớn hơn bản thân tạo ra sự liên kết mạnh mẽ nhất.',
    actionEn: 'Support community, develop compassion. A purpose larger than self creates the strongest connection.',
  },
};

export function calculateBridge(num1: number | string, num2: number | string, label1: string, label2: string): BridgeResult {
  const n1 = typeof num1 === 'string' ? parseInt(num1) : num1;
  const n2 = typeof num2 === 'string' ? parseInt(num2) : num2;

  // Rút gọn master numbers cho phép tính bridge
  const reduce = (n: number): number => {
    if (n === 11) return 2;
    if (n === 22) return 4;
    if (n === 33) return 6;
    return n;
  };

  const r1 = reduce(n1);
  const r2 = reduce(n2);
  let bridge = Math.abs(r1 - r2);
  // Rút gọn nếu > 9
  while (bridge > 9) {
    bridge = bridge.toString().split('').reduce((s, d) => s + parseInt(d), 0);
  }

  const meaning = bridgeMeanings[bridge] || bridgeMeanings[0];

  return {
    bridgeNumber: bridge,
    from: label1,
    to: label2,
    ...meaning,
  };
}

// ============================================================
// 4. MA TRẬN TƯƠNG THÍCH (Compatibility Matrix)
// ============================================================
export type CompatLevel = 'harmonious' | 'neutral' | 'challenging';

// Ma trận dựa trên nghiên cứu tổng hợp từ nhiều nguồn thần số học
// Key: "min-max" (sorted), Value: compatibility level
const compatMatrix: Record<string, CompatLevel> = {
  // Số 1
  '1-1': 'neutral',       // Cùng lãnh đạo: hòa hợp nhưng dễ xung đột cái tôi
  '1-2': 'challenging',   // Độc lập vs Hợp tác: ma sát cơ bản
  '1-3': 'harmonious',    // Tiên phong + Sáng tạo: bổ sung tuyệt vời
  '1-4': 'neutral',       // Đột phá vs Ổn định: cần cân bằng
  '1-5': 'harmonious',    // Lãnh đạo + Tự do: năng lượng mạnh
  '1-6': 'harmonious',    // Dẫn dắt + Trách nhiệm: hỗ trợ nhau
  '1-7': 'neutral',       // Hành động vs Chiêm nghiệm: bổ sung nếu cân bằng
  '1-8': 'challenging',   // Hai quyền lực: xung đột tranh giành
  '1-9': 'harmonious',    // Tiên phong + Lý tưởng: tầm nhìn lớn

  // Số 2
  '2-2': 'harmonious',    // Cùng nhạy cảm: đồng cảm sâu
  '2-3': 'harmonious',    // Hòa hợp + Sáng tạo: nuôi dưỡng nhau
  '2-4': 'challenging',   // Cảm xúc vs Cứng nhắc: ma sát
  '2-5': 'harmonious',    // Hợp tác + Linh hoạt: bổ sung
  '2-6': 'harmonious',    // Yêu thương + Trách nhiệm: hoàn hảo
  '2-7': 'challenging',   // Cảm xúc vs Lý trí: khó kết nối
  '2-8': 'challenging',   // Nhạy cảm vs Quyền lực: dễ bị áp chế
  '2-9': 'challenging',   // Tiếp nhận vs Cho đi: mất cân bằng

  // Số 3
  '3-3': 'harmonious',    // Cùng sáng tạo: vui vẻ nhưng thiếu thực tế
  '3-4': 'neutral',       // Tự do vs Kỷ luật: cần dung hòa
  '3-5': 'harmonious',    // Biểu đạt + Phiêu lưu: rất sôi động
  '3-6': 'challenging',   // Hời hợt vs Sâu sắc: xung đột giá trị
  '3-7': 'harmonious',    // Biểu đạt + Chiều sâu: bổ sung tốt
  '3-8': 'neutral',       // Sáng tạo + Quyền lực: có thể phối hợp
  '3-9': 'harmonious',    // Sáng tạo + Lý tưởng: đồng điệu cao

  // Số 4
  '4-4': 'neutral',       // Cùng ổn định: vững chắc nhưng dễ bảo thủ
  '4-5': 'challenging',   // Ổn định vs Thay đổi: xung đột cơ bản
  '4-6': 'harmonious',    // Nền tảng + Trách nhiệm: vững vàng
  '4-7': 'harmonious',    // Kỷ luật + Trí tuệ: nền tảng + chiều sâu
  '4-8': 'harmonious',    // Xây dựng + Quyền lực: thành tựu lớn
  '4-9': 'challenging',   // Thực tế vs Lý tưởng: ma sát

  // Số 5
  '5-5': 'neutral',       // Cùng tự do: sôi động nhưng thiếu ổn định
  '5-6': 'harmonious',    // Tự do + Yêu thương: bổ sung
  '5-7': 'neutral',       // Phiêu lưu vs Nội tâm: cần cân bằng
  '5-8': 'neutral',       // Linh hoạt + Tham vọng: có tiềm năng
  '5-9': 'neutral',       // Trải nghiệm + Lý tưởng: phong phú

  // Số 6
  '6-6': 'harmonious',    // Cùng yêu thương: hòa hợp sâu
  '6-7': 'harmonious',    // Trách nhiệm + Trí tuệ: bổ sung
  '6-8': 'neutral',       // Gia đình vs Sự nghiệp: cần cân bằng
  '6-9': 'harmonious',    // Yêu thương + Nhân ái: đồng điệu

  // Số 7
  '7-7': 'neutral',       // Cùng nội tâm: sâu sắc nhưng cô lập
  '7-8': 'neutral',       // Trí tuệ + Quyền lực: tiềm năng
  '7-9': 'neutral',       // Chiêm nghiệm + Lý tưởng: chiều sâu

  // Số 8
  '8-8': 'neutral',       // Cùng quyền lực: mạnh nhưng xung đột
  '8-9': 'neutral',       // Vật chất vs Tinh thần: cần cân bằng

  // Số 9
  '9-9': 'harmonious',    // Cùng lý tưởng: đồng điệu
};

export function getCompatibility(num1: number | string, num2: number | string): {
  level: CompatLevel;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
} {
  const n1 = Math.min(Number(num1), Number(num2));
  const n2 = Math.max(Number(num1), Number(num2));
  const key = `${n1}-${n2}`;

  // Rút gọn master numbers cho lookup
  const reduce = (n: number): number => {
    if (n === 11) return 2;
    if (n === 22) return 4;
    if (n === 33) return 6;
    return n;
  };

  const r1 = Math.min(reduce(n1), reduce(n2));
  const r2 = Math.max(reduce(n1), reduce(n2));
  const rKey = `${r1}-${r2}`;

  const level = compatMatrix[rKey] || 'neutral';

  const labels: Record<CompatLevel, { vi: string; en: string }> = {
    harmonious: { vi: 'Hòa hợp', en: 'Harmonious' },
    neutral: { vi: 'Trung tính', en: 'Neutral' },
    challenging: { vi: 'Thách thức', en: 'Challenging' },
  };

  const descriptions: Record<CompatLevel, { vi: string; en: string }> = {
    harmonious: {
      vi: `Số ${num1} và ${num2} có năng lượng tương hỗ tự nhiên. Khi đi cùng nhau tạo sự cộng hưởng, khuếch đại ưu điểm. Mối liên kết này là điểm mạnh bẩm sinh trong bộ số.`,
      en: `Numbers ${num1} and ${num2} have naturally complementary energies. Together they create resonance and amplify strengths. This connection is an innate strength in the chart.`,
    },
    neutral: {
      vi: `Số ${num1} và ${num2} không tự nhiên hỗ trợ cũng không xung đột. Kết quả phụ thuộc vào mức độ ý thức và nỗ lực cân bằng. Cần chủ động kết nối hai năng lượng này.`,
      en: `Numbers ${num1} and ${num2} neither naturally support nor conflict. Results depend on awareness and balancing effort. Need active work to connect these two energies.`,
    },
    challenging: {
      vi: `Số ${num1} và ${num2} tạo ma sát nội tại — hai năng lượng kéo về hai hướng khác nhau. Tuy nhiên đây cũng là nguồn động lực chuyển hóa mạnh nhất nếu biết hòa giải.`,
      en: `Numbers ${num1} and ${num2} create internal friction — two energies pulling in different directions. However, this is also the strongest transformation catalyst if reconciled.`,
    },
  };

  return {
    level,
    label: labels[level].vi,
    labelEn: labels[level].en,
    description: descriptions[level].vi,
    descriptionEn: descriptions[level].en,
  };
}

// ============================================================
// 5. PHÂN TÍCH TỔNG HỢP (Full Analysis Builder)
// ============================================================
export interface IndexInput {
  type: string;   // "Đường Đời", "Nội Tâm", etc.
  value: number | string;
}

export function buildFullAnalysis(inputs: IndexInput[], lang: 'vi' | 'en' = 'vi'): string {
  if (inputs.length < 2) return '';

  const sections: string[] = [];

  // --- Section 1: Ngũ Hành ---
  const elementSection: string[] = [];
  elementSection.push(lang === 'vi'
    ? '=== PHÂN TÍCH NGŨ HÀNH (Five Elements) ==='
    : '=== FIVE ELEMENTS ANALYSIS ===');

  // Map each input to element
  const inputElements = inputs.map(i => ({
    ...i,
    element: numberToElement[i.value.toString()] || 'Thổ',
  }));

  inputElements.forEach(ie => {
    const info = elementInfo[ie.element];
    elementSection.push(lang === 'vi'
      ? `${ie.type} (${ie.value}) → ${info.name}: ${info.trait}`
      : `${ie.type} (${ie.value}) → ${info.nameEn}: ${info.traitEn}`);
  });

  // Element interactions
  for (let i = 0; i < inputElements.length; i++) {
    for (let j = i + 1; j < inputElements.length; j++) {
      const rel = getElementRelation(inputElements[i].element, inputElements[j].element);
      elementSection.push(`\n${inputElements[i].type}(${inputElements[i].value}) ↔ ${inputElements[j].type}(${inputElements[j].value}):`);
      elementSection.push(lang === 'vi' ? rel.description : rel.descriptionEn);
    }
  }

  // Overall element balance
  const elementCounts: Record<Element, number> = { 'Kim': 0, 'Mộc': 0, 'Thủy': 0, 'Hỏa': 0, 'Thổ': 0 };
  inputElements.forEach(ie => elementCounts[ie.element]++);
  const dominant = Object.entries(elementCounts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const missing = Object.entries(elementCounts).filter(([, c]) => c === 0).map(([e]) => e);

  elementSection.push(lang === 'vi'
    ? `\nHành chiếm ưu thế: ${dominant.map(([e, c]) => `${e}(${c})`).join(', ')}${missing.length > 0 ? `. Hành thiếu: ${missing.join(', ')} — cần bổ sung năng lượng này thông qua rèn luyện ý thức.` : '. Ngũ hành tương đối cân bằng.'}`
    : `\nDominant elements: ${dominant.map(([e, c]) => `${e}(${c})`).join(', ')}${missing.length > 0 ? `. Missing: ${missing.join(', ')} — need to cultivate this energy through conscious practice.` : '. Elements are relatively balanced.'}`);

  sections.push(elementSection.join('\n'));

  // --- Section 2: Âm Dương ---
  const polaritySection: string[] = [];
  polaritySection.push(lang === 'vi'
    ? '=== PHÂN TÍCH ÂM DƯƠNG (Polarity) ==='
    : '=== YIN-YANG POLARITY ANALYSIS ===');

  const polarities = inputs.map(i => ({
    ...i,
    polarity: getPolarity(i.value),
  }));

  const yangCount = polarities.filter(p => p.polarity === 'Dương').length;
  const yinCount = polarities.filter(p => p.polarity === 'Âm').length;

  polarities.forEach(p => {
    polaritySection.push(`${p.type} (${p.value}) → ${p.polarity} (${p.polarity === 'Dương' ? 'Yang/Lẻ' : 'Yin/Chẵn'})`);
  });

  if (yangCount > yinCount + 1) {
    polaritySection.push(lang === 'vi'
      ? `⚡ Thiên Dương mạnh (${yangCount}D/${yinCount}Â): Năng lượng hướng ngoại, chủ động, quyết đoán chiếm ưu thế. Cần phát triển thêm khả năng lắng nghe, kiên nhẫn, tiếp nhận.`
      : `⚡ Strong Yang dominant (${yangCount}Y/${yinCount}N): Outward, proactive, decisive energy dominates. Need to develop listening, patience, receptivity.`);
  } else if (yinCount > yangCount + 1) {
    polaritySection.push(lang === 'vi'
      ? `🌙 Thiên Âm mạnh (${yinCount}Â/${yangCount}D): Năng lượng hướng nội, tiếp nhận, hợp tác chiếm ưu thế. Cần phát triển thêm sự quyết đoán, chủ động, dám hành động.`
      : `🌙 Strong Yin dominant (${yinCount}N/${yangCount}Y): Inward, receptive, cooperative energy dominates. Need to develop assertiveness, proactivity, boldness.`);
  } else {
    polaritySection.push(lang === 'vi'
      ? `☯️ Âm-Dương cân bằng (${yangCount}D/${yinCount}Â): Bộ số có sự hài hòa tự nhiên giữa hành động và tiếp nhận, giữa lý trí và cảm xúc.`
      : `☯️ Balanced Yin-Yang (${yangCount}Y/${yinCount}N): The chart has natural harmony between action and reception, logic and emotion.`);
  }

  sections.push(polaritySection.join('\n'));

  // --- Section 3: Ma trận tương thích ---
  const compatSection: string[] = [];
  compatSection.push(lang === 'vi'
    ? '=== MA TRẬN TƯƠNG THÍCH CÁC CẶP SỐ ==='
    : '=== NUMBER PAIR COMPATIBILITY MATRIX ===');

  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const compat = getCompatibility(inputs[i].value, inputs[j].value);
      const emoji = compat.level === 'harmonious' ? '✅' : compat.level === 'challenging' ? '⚠️' : '➖';
      compatSection.push(`\n${emoji} ${inputs[i].type}(${inputs[i].value}) ↔ ${inputs[j].type}(${inputs[j].value}): ${lang === 'vi' ? compat.label : compat.labelEn}`);
      compatSection.push(lang === 'vi' ? compat.description : compat.descriptionEn);
    }
  }

  sections.push(compatSection.join('\n'));

  // --- Section 4: Chỉ số liên kết (Bridge) ---
  const bridgeSection: string[] = [];
  bridgeSection.push(lang === 'vi'
    ? '=== CHỈ SỐ LIÊN KẾT (Bridge Numbers) ==='
    : '=== BRIDGE NUMBERS ===');
  bridgeSection.push(lang === 'vi'
    ? 'Chỉ số liên kết cho biết khoảng cách năng lượng giữa hai chỉ số và hành động cần thực hiện để hài hòa chúng.'
    : 'Bridge numbers reveal the energy gap between two indices and the actions needed to harmonize them.');

  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const bridge = calculateBridge(inputs[i].value, inputs[j].value, inputs[i].type, inputs[j].type);
      bridgeSection.push(`\n🔗 ${bridge.from} ↔ ${bridge.to}: Chỉ số liên kết = ${bridge.bridgeNumber}`);
      bridgeSection.push(lang === 'vi' ? bridge.message : bridge.messageEn);
      bridgeSection.push(lang === 'vi' ? `→ Hành động: ${bridge.action}` : `→ Action: ${bridge.actionEn}`);
    }
  }

  sections.push(bridgeSection.join('\n'));

  return sections.join('\n\n');
}
