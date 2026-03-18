import { ConnectionAnalysisResult } from './types';

// Helper to check if string contains only letters
export const isValidName = (name: string): boolean => {
  return /^[a-zA-Z\s]+$/.test(removeAccents(name));
};

// Helper: Remove Vietnamese accents
export const removeAccents = (str: string): string => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const numerologyMap: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
};

const vowels = 'AEIOU';

// Standard reduction (always reduces to single digit unless master)
const reduceToSingleDigit = (num: number): number => {
  const masterNumbers = [11, 22, 33];
  while (num > 9 && !masterNumbers.includes(num)) {
    num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return num;
};

// Force reduction to 1-9 (ignoring master numbers rules, used for specific sub-calculations)
const reduceToSingleDigitNoMaster = (num: number): number => {
  while (num > 9) {
    num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return num;
};

// --- Helper: Special Reduction for Life Path Components ---
// Reduces a number to a single digit BUT preserves 11, 22, 33
const reduceForMaster = (num: number): number => {
    // If the input itself is a master number (e.g. Day 22), return it immediately
    if ([11, 22, 33].includes(num)) return num;

    let current = num;
    while (current > 9 && ![11, 22, 33].includes(current)) {
        current = current.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }
    return current;
};


const getNumerologyValue = (char: string): number => {
  return numerologyMap[char.toUpperCase()] || 0;
};

// --- Helper: Date Parser ---
// Handles YYYY-MM-DD (standard input type=date) and DD-MM-YYYY (legacy/manual)
const parseDate = (dateStr: string) => {
  if (!dateStr) return { d: 0, m: 0, y: 0 };
  const parts = dateStr.split('-').map(Number);
  
  // If first part is > 1000, assume YYYY-MM-DD (e.g., 2023-10-15)
  if (parts[0] > 1000) {
    return { d: parts[2], m: parts[1], y: parts[0] };
  }
  
  // Else assume DD-MM-YYYY (e.g., 15-10-2023)
  return { d: parts[0], m: parts[1], y: parts[2] };
};


// --- Main Calculators ---

export const calculateLifePath = (birthdate: string): number => {
  const { d: day, m: month, y: year } = parseDate(birthdate);
  if (!day || !month || !year) return 0;

  // Logic: 
  // 1. Check if Day is Master (11, 22). If so, keep. Else reduce.
  const processedDay = reduceForMaster(day);

  // 2. Check if Month is Master (11). If so, keep. Else reduce.
  const processedMonth = reduceForMaster(month);

  // 3. Process Year: Sum digits first (e.g. 1997 -> 26). 
  // Then check if sum is Master (11, 22, 33). If so, keep. Else reduce.
  let sumYear = year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  const processedYear = reduceForMaster(sumYear);

  // 4. Sum the three components
  // Example 22-08-1997: Day(22) + Month(8) + Year(1+9+9+7=26->8) = 22 + 8 + 8 = 38
  let total = processedDay + processedMonth + processedYear;

  // 5. Final Reduction (Preserving Master)
  // Example 38 -> 3+8=11 (Master)
  return reduceForMaster(total);
};

export const calculateHeartDesire = (name: string): number => {
  const cleaned = removeAccents(name).trim().toUpperCase().replace(/[^A-Z]/g, '').split('');
  let sum = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : null;
    const next = i < cleaned.length - 1 ? cleaned[i + 1] : null;

    const isY = char === 'Y';
    const isVowel = vowels.includes(char);
    const yAsVowel = isY && (!prev || !vowels.includes(prev)) && (!next || !vowels.includes(next));

    if (isVowel || yAsVowel) {
      sum += numerologyMap[char] || 0;
    }
  }
  return reduceToSingleDigitNoMaster(sum);
};

export const calculatePersonalityNumber = (name: string): number => {
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const providedJS_Consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const sum2 = removeAccents(name).toUpperCase().split('')
      .filter(char => providedJS_Consonants.includes(char))
      .reduce((acc, char) => acc + getNumerologyValue(char), 0);

  return reduceToSingleDigitNoMaster(sum2);
};

export const calculateMissionNumber = (name: string): number => {
  const cleanedName = removeAccents(name).toUpperCase().replace(/[^A-Z]/g, '');
  const digits = cleanedName.split('').map(char => getNumerologyValue(char));
  let sum = digits.reduce((acc, val) => acc + val, 0);
  const masterNumbers = [11, 22, 33];
  while (sum > 9 && !masterNumbers.includes(sum)) {
    sum = sum.toString().split('').reduce((a, b) => a + parseInt(b || '0'), 0);
  }
  return sum;
};

export const calculateIntelligenceNumber = (name: string): number => {
  const vowels = 'AEIOU';
  const nameParts = removeAccents(name).trim().toUpperCase().split(' ');
  const firstName = nameParts[nameParts.length - 1] || '';
  const cleaned = firstName.replace(/[^A-Z]/g, '').split('');
  let sum = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prev = i > 0 ? cleaned[i - 1] : null;
    const next = i < cleaned.length - 1 ? cleaned[i + 1] : null;
    const isY = char === 'Y';
    const isVowel = vowels.includes(char);
    const yAsVowel = isY && (!prev || !vowels.includes(prev)) && (!next || !vowels.includes(next));
    if (isVowel || yAsVowel) sum += numerologyMap[char] || 0;
  }
  return reduceToSingleDigitNoMaster(sum);
};

export const calculateBalanceNumber = (name: string): number => {
  const sum = removeAccents(name).toUpperCase().split(' ')
    .filter(p => p.length > 0)
    .map(part => getNumerologyValue(part[0]))
    .reduce((a, b) => a + b, 0);
  return reduceToSingleDigitNoMaster(sum);
};

export const calculateMaturityNumber = (lifePath: number, missionNumber: number): number => {
  return reduceToSingleDigitNoMaster(lifePath + missionNumber);
};

export const calculateAttitudeNumber = (birthdate: string): number => {
  const { d, m } = parseDate(birthdate);
  return reduceToSingleDigit(d + m);
};

export const calculatePersonalYear = (birthdate: string, currentYear: number): number => {
  const { d, m } = parseDate(birthdate);
  const attitude = reduceToSingleDigit(d + m);
  const yearSum = reduceToSingleDigitNoMaster(currentYear);
  return reduceToSingleDigitNoMaster(attitude + yearSum);
};

export const calculatePersonalMonth = (birthdate: string, currentYear: number, currentMonth: number): number => {
  const py = calculatePersonalYear(birthdate, currentYear);
  return reduceToSingleDigit(py + currentMonth);
};

export const calculateAccessibilityPower = (name: string): number => {
  const nameParts = removeAccents(name).trim().toUpperCase().split(' ');
  const firstName = nameParts[nameParts.length - 1] || '';
  const sum = firstName.split('').reduce((acc, char) => acc + (numerologyMap[char] || 0), 0);
  return reduceToSingleDigitNoMaster(sum);
};

export const calculateSubconsciousSelf = (name: string): string => {
   const numbers = removeAccents(name).toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map(char => numerologyMap[char])
    .filter(Boolean);

  const frequency: Record<number, number> = {};
  numbers.forEach(num => { frequency[num] = (frequency[num] || 0) + 1; });

  const subconsciousNumbers = Object.entries(frequency)
    .filter(([_, count]) => count >= 2)
    .map(([num]) => parseInt(num))
    .sort((a, b) => a - b);
    
  if (subconsciousNumbers.length === 0) return "Non-repeating";
  return subconsciousNumbers.join(', ');
};

export const calculatePeaksAndChallenges = (birthdate: string, lifePath: number) => {
    const { d: day, m: month, y: year } = parseDate(birthdate);
    
    // Challenges
    const d = reduceToSingleDigitNoMaster(day);
    const m = reduceToSingleDigitNoMaster(month);
    const y = reduceToSingleDigitNoMaster(year);
    
    const c1 = Math.abs(d - m);
    const c2 = Math.abs(d - y);
    const c3 = Math.abs(c1 - c2);
    const c4 = Math.abs(m - y);

    // Peaks
    const p1 = reduceToSingleDigit(d + m);
    const p2 = reduceToSingleDigit(d + y);
    const p3 = reduceToSingleDigit(p1 + p2);
    const p4 = reduceToSingleDigit(m + y);

    const age1 = 36 - lifePath;
    const age2 = age1 + 9;
    const age3 = age2 + 9;
    const age4 = age3 + 9;

    return {
        peaks: {
            peak1: p1, age1, year1: year + age1,
            peak2: p2, age2, year2: year + age2,
            peak3: p3, age3, year3: year + age3,
            peak4: p4, age4, year4: year + age4
        },
        challenges: {
            challenge1: c1, challenge2: c2, challenge3: c3, challenge4: c4
        }
    };
};

export const analyzeConnectionLogic = (nums: { type: string, value: number }[]): ConnectionAnalysisResult => {
  // Simplified logic based on PDF "Principles of Energy Analysis"
  // Groups:
  // 1-5-7: Mind/Individual (Yang)
  // 2-4-8: Material/Order (Yin)
  // 3-6-9: Art/Emotion/Community
  
  const groups = {
    mind: [1, 5, 7],
    material: [4, 8, 22], // 2 often fits here or emotion
    emotion: [3, 6, 9, 33],
    diplomacy: [2, 11]
  };

  const values = nums.map(n => n.value);
  let relationship: ConnectionAnalysisResult['relationship'] = "Trung tính";
  let advice = "";
  let growth = "";

  // Helper to check group
  const getGroup = (n: number) => {
    n = reduceToSingleDigitNoMaster(n);
    if (groups.mind.includes(n)) return 'mind';
    if (groups.material.includes(n)) return 'material';
    if (groups.emotion.includes(n)) return 'emotion';
    return 'diplomacy';
  };

  const g1 = getGroup(values[0]);
  const g2 = getGroup(values[1]);
  const g3 = values[2] ? getGroup(values[2]) : null;

  // 2 Numbers Logic
  if (values.length === 2) {
    if (g1 === g2) {
      relationship = "Đồng hướng";
      advice = "Hai chỉ số này cộng hưởng năng lượng mạnh mẽ. Hãy tận dụng sự đồng điệu để bứt phá.";
      growth = "Phát triển chuyên sâu vào thế mạnh chung.";
    } else if ((g1 === 'mind' && g2 === 'diplomacy') || (g1 === 'diplomacy' && g2 === 'mind')) {
       relationship = "Tương phản"; // 1 vs 2
       advice = "Mâu thuẫn giữa cái tôi (độc lập) và nhu cầu kết nối. Cần học cách lắng nghe.";
       growth = "Lãnh đạo bằng sự thấu cảm.";
    } else if ((g1 === 'material' && g2 === 'emotion') || (g1 === 'emotion' && g2 === 'material')) {
        relationship = "Bổ sung"; // 4 vs 3 or 4 vs 5 (Freedom vs Order)
        advice = "Sự kết hợp giữa kỷ luật và cảm xúc/sáng tạo. Nếu cân bằng được sẽ tạo ra thành tựu bền vững.";
        growth = "Xây dựng nền tảng vững chắc cho sự sáng tạo bay bổng.";
    } else {
        relationship = "Bổ sung";
        advice = "Mỗi số mang một màu sắc khác nhau, hỗ trợ lấp đầy những thiếu sót của nhau.";
        growth = "Học hỏi phẩm chất của đối phương.";
    }
    
    // Specific Overrides from PDF
    if ((values[0] === 4 && values[1] === 5) || (values[0] === 5 && values[1] === 4)) {
       relationship = "Tương phản"; 
       advice = "Mâu thuẫn giữa an toàn (4) và tự do (5).";
       growth = "Tạo 'khung trời tự do': Kế hoạch linh hoạt.";
    }
  } 
  
  // 3 Numbers Logic
  if (values.length === 3) {
      // Simple majority rule for demo
      if (g1 === g2 && g2 === g3) {
          relationship = "Đồng hướng";
          advice = "Tam giác năng lượng thuần nhất. Sức mạnh tập trung cực đại.";
      } else if (g1 !== g2 && g2 !== g3 && g1 !== g3) {
          relationship = "Bổ sung";
          advice = "Đa dạng năng lượng. Bạn có nhiều công cụ để đối phó với cuộc sống.";
      } else {
          relationship = "Bổ sung";
          advice = "Có sự mâu thuẫn nội tại cần giải quyết để khai phóng năng lượng tiềm ẩn.";
      }
  }

  // Generate keywords
  const keywordsList = values.map(v => {
      const map: any = {
          1: "Tiên phong", 2: "Kết nối", 3: "Sáng tạo", 4: "Kỷ luật", 5: "Tự do",
          6: "Yêu thương", 7: "Tri thức", 8: "Thành tựu", 9: "Cho đi", 11: "Trực giác", 22: "Kiến tạo", 33: "Chữa lành"
      };
      return map[v] || v;
  });

  return {
    relationship,
    keywords: keywordsList.join(" + "),
    advice,
    growth
  };
};