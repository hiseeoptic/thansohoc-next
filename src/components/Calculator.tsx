import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Globe, Sparkles, Heart, Brain, 
  Activity, Crown, Scale, Zap, Target 
} from 'lucide-react';
import * as Utils from '@/utils/numerologyUtils';
import { CalculationResult, SheetMeaning } from '@/types';
import { fetchMeanings, getMeaning } from '@/services/googleSheetService';
import ResultCard from './ResultCard';
interface CalculatorProps {
  setSharedResults: (results: CalculationResult | null) => void;
  language: 'vi' | 'en';
  sheetData: SheetMeaning[];
}

const Calculator: React.FC<CalculatorProps> = ({ setSharedResults, language, sheetData }) => {
  const [name, setName] = useState('');
  // Separate states for Day, Month, Year
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  
  const [worldYear, setWorldYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (Number(val) >= 1 && Number(val) <= 31)) {
      setDay(val);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (Number(val) >= 1 && Number(val) <= 12)) {
      setMonth(val);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (val.length <= 4 && /^\d*$/.test(val))) {
      setYear(val);
    }
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !day || !month || !year) return;

    // Construct date string in DD-MM-YYYY format for Utils
    const birthdate = `${day}-${month}-${year}`;

    const lifePath = Utils.calculateLifePath(birthdate);
    const mission = Utils.calculateMissionNumber(name);
    const { peaks, challenges } = Utils.calculatePeaksAndChallenges(birthdate, lifePath);

    const calcResult: CalculationResult = {
      lifePath,
      heartDesire: Utils.calculateHeartDesire(name),
      intelligenceNumber: Utils.calculateIntelligenceNumber(name),
      personalityNumber: Utils.calculatePersonalityNumber(name),
      missionNumber: mission,
      maturityNumber: Utils.calculateMaturityNumber(lifePath, mission),
      balanceNumber: Utils.calculateBalanceNumber(name),
      attitudeNumber: Utils.calculateAttitudeNumber(birthdate),
      personalYear: Utils.calculatePersonalYear(birthdate, worldYear),
      personalMonth: Utils.calculatePersonalMonth(birthdate, worldYear, new Date().getMonth() + 1),
      accessibilityPower: Utils.calculateAccessibilityPower(name),
      subconsciousSelf: Utils.calculateSubconsciousSelf(name),
      worldYearEffect: (worldYear % 9) || 9,
      peaks,
      challenges
    };

    setResult(calcResult);
    setViewYear(worldYear);
    setSharedResults(calcResult);
  };

  const handleViewYearChange = (y: number) => {
    setViewYear(y);
    if (result && day && month && year) {
        const birthdate = `${day}-${month}-${year}`;
        const newPy = Utils.calculatePersonalYear(birthdate, y);
        setResult(prev => prev ? { ...prev, personalYear: newPy } : null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      {/* Input Section */}
      <div className="glass-panel p-6 rounded-2xl mb-8 shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
          {language === 'vi' ? 'Nhập thông tin tra cứu' : 'Enter query information'}
        </h2>
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold flex items-center gap-2">
                <User size={16} /> {language === 'vi' ? 'Họ và Tên (Không dấu)' : 'Full Name (No accents)'}
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'vi' ? 'NGUYEN VAN A' : 'NGUYEN VAN A'}
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors uppercase"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold flex items-center gap-2">
                <Calendar size={16} /> {language === 'vi' ? 'Ngày sinh (DD - MM - YYYY)' : 'Birth date (DD - MM - YYYY)'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input 
                  type="number" 
                  value={day}
                  onChange={handleDayChange}
                  placeholder={language === 'vi' ? 'Ngày' : 'Day'}
                  min="1" max="31"
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <input 
                  type="number" 
                  value={month}
                  onChange={handleMonthChange}
                  placeholder={language === 'vi' ? 'Tháng' : 'Month'}
                  min="1" max="12"
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <input 
                  type="number" 
                  value={year}
                  onChange={handleYearChange}
                  placeholder={language === 'vi' ? 'Năm' : 'Year'}
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-center text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-gray-300 text-sm font-semibold flex items-center gap-2">
                <Globe size={16} /> {language === 'vi' ? 'Năm thế giới' : 'World Year'}
              </label>
            <input 
              type="number" 
              value={worldYear}
              onChange={(e) => setWorldYear(parseInt(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition-all active:scale-95"
          >
            {language === 'vi' ? 'Tra Cứu Ngay' : 'Query Now'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="animate-fadeIn space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard label={language === 'vi' ? "Đường Đời (Life Path)" : "Life Path"} value={result.lifePath} typeKey="lifePath" icon={<Target />} sheetData={sheetData} highlight language={language} />
            <ResultCard label={language === 'vi' ? "Sứ Mệnh (Mission)" : "Mission"} value={result.missionNumber} typeKey="missionNumber" icon={<Crown />} sheetData={sheetData} highlight language={language} />
            <ResultCard label={language === 'vi' ? "Nội Tâm (Soul)" : "Soul"} value={result.heartDesire} typeKey="heartDesire" icon={<Heart />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Tương Tác (Personality)" : "Personality"} value={result.personalityNumber} typeKey="personalityNumber" icon={<User />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Trưởng Thành (Maturity)" : "Maturity"} value={result.maturityNumber} typeKey="maturityNumber" icon={<Activity />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Thái Độ (Attitude)" : "Attitude"} value={result.attitudeNumber} typeKey="attitudeNumber" icon={<Zap />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Cân Bằng (Balance)" : "Balance"} value={result.balanceNumber} typeKey="balanceNumber" icon={<Scale />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Trí Tuệ (Intelligence)" : "Intelligence"} value={result.intelligenceNumber} typeKey="intelligenceNumber" icon={<Brain />} sheetData={sheetData} language={language} />
            <ResultCard label={language === 'vi' ? "Số Lặp (Subconscious)" : "Subconscious"} value={result.subconsciousSelf} typeKey="subconsciousSelf" icon={<Sparkles />} sheetData={sheetData} language={language} />
          </div>

          {/* Personal Year Toolbox */}
          <div className="glass-panel p-6 rounded-2xl border border-yellow-500/30">
            <h3 className="text-xl font-bold text-yellow-200 mb-4 flex items-center gap-2">
              <Calendar /> {language === 'vi' ? 'Vận Hạn Năm Cá Nhân' : 'Personal Year Fortune'}
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <select 
                value={viewYear} 
                onChange={(e) => handleViewYearChange(parseInt(e.target.value))}
                className="bg-black/30 border border-white/20 text-white rounded p-2"
              >
                {Array.from({ length: 10 }, (_, i) => worldYear - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span className="text-gray-400 italic text-sm">
                {viewYear < new Date().getFullYear() ? (language === 'vi' ? '(Quá khứ)' : '(Past)') : viewYear > new Date().getFullYear() ? (language === 'vi' ? '(Tương lai)' : '(Future)') : (language === 'vi' ? '(Hiện tại)' : '(Present)')}
              </span>
            </div>
            
            <div className="text-center py-4 bg-yellow-900/20 rounded-xl mb-4">
                <div className="text-4xl font-bold text-yellow-400">{result.personalYear}</div>
                <div className="text-sm text-yellow-200/70">{language === 'vi' ? 'Năm Cá Nhân' : 'Personal Year'}</div>
            </div>
             <div className="p-4 bg-black/20 rounded-lg text-sm text-gray-300">
               {/* Just a simple dynamic text as placeholder since sheet fetching handles specific keys */}
               {getMeaning(sheetData, 'personalYear', result.personalYear, language)}
             </div>
          </div>

          {/* Peaks Table */}
          <div className="glass-panel p-6 rounded-2xl overflow-x-auto">
             <h3 className="text-xl font-bold text-purple-200 mb-4">{language === 'vi' ? 'Kim Tự Tháp Đỉnh Cao' : 'Pyramid Peaks'}</h3>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="text-purple-300 border-b border-white/10">
                   <th className="p-3">{language === 'vi' ? 'Giai đoạn' : 'Phase'}</th>
                   <th className="p-3">{language === 'vi' ? 'Độ tuổi / Năm' : 'Age / Year'}</th>
                   <th className="p-3">{language === 'vi' ? 'Đỉnh Cao' : 'Peak'}</th>
                   <th className="p-3">{language === 'vi' ? 'Thách Thức' : 'Challenge'}</th>
                 </tr>
               </thead>
               <tbody className="text-gray-300">
                  {[1,2,3,4].map((i: any) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-semibold">{language === 'vi' ? `Giai đoạn ${i}` : `Phase ${i}`}</td>
                      <td className="p-3">{(result.peaks as any)[`age${i}`]} {language === 'vi' ? 'tuổi /' : 'age /'} {(result.peaks as any)[`year${i}`]}</td>
                      <td className="p-3 text-yellow-400 font-bold">{(result.peaks as any)[`peak${i}`]}</td>
                      <td className="p-3 text-red-400">{(result.challenges as any)[`challenge${i}`]}</td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;
