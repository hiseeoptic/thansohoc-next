export interface CalculationResult {
  lifePath: number;
  heartDesire: number;
  intelligenceNumber: number;
  personalityNumber: number;
  missionNumber: number;
  maturityNumber: number;
  balanceNumber: number;
  attitudeNumber: number;
  personalYear: number;
  personalMonth: number;
  accessibilityPower: number;
  subconsciousSelf: string;
  worldYearEffect: number;
  peaks: {
    peak1: number; age1: number; year1: number;
    peak2: number; age2: number; year2: number;
    peak3: number; age3: number; year3: number;
    peak4: number; age4: number; year4: number;
  };
  challenges: {
    challenge1: number;
    challenge2: number;
    challenge3: number;
    challenge4: number;
  };
}

export interface SheetMeaning {
  type: string;
  number: number;
  meaning: string;
  english_meaning?: string;
  detail?: string;
}

export enum NumberType {
  LifePath = "Đường Đời",
  HeartDesire = "Nội Tâm (Linh Hồn)",
  Mission = "Sứ Mệnh",
  Personality = "Tương Tác (Nhân Cách)",
  Attitude = "Thái Độ",
  Maturity = "Trưởng Thành",
  BirthDay = "Ngày Sinh",
  Intelligence = "Trí Tuệ"
}

export interface ConnectionAnalysisResult {
  relationship: "Đồng hướng" | "Tương phản" | "Bổ sung" | "Trung tính" | "Lỗi";
  keywords: string;
  advice: string;
  growth: string;
  aiContent?: string; // HTML content from AI
}