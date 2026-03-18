import { SheetMeaning } from '../types';

const SHEET_ID = '1-aRNnvyv70nx_dsrEOR1_nO3l6643LjOaQh6uHm6rpE';
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/Sheet1`;

// Cache to prevent too many requests
let cachedData: SheetMeaning[] | null = null;
let fetchPromise: Promise<SheetMeaning[]> | null = null;

export const fetchMeanings = async (): Promise<SheetMeaning[]> => {
  if (cachedData) return cachedData;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch sheet data');
      }
      const data = await response.json();
      cachedData = data;
      return data as SheetMeaning[];
    } catch (error) {
      console.error("Error fetching meanings:", error);
      return [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const getMeaning = (data: SheetMeaning[], key: string, number: number | string, lang: 'vi' | 'en'): string => {
  // Handle string numbers like "1, 5" for Subconscious
  const numStr = number.toString();
  
  const found = data.find(row => row.type === key && row.number.toString() === numStr);
  
  if (found) {
    return lang === 'en' ? (found.english_meaning || found.meaning) : found.meaning;
  }
  
  return lang === 'en' ? "Meaning updating..." : "Đang cập nhật nội dung...";
};