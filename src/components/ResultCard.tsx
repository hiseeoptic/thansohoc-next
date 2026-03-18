import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { SheetMeaning } from '../types';
import { getMeaning } from '../services/googleSheetService';

interface ResultCardProps {
  label: string;
  value: number | string;
  typeKey: string;
  icon?: React.ReactNode;
  sheetData: SheetMeaning[];
  highlight?: boolean;
  language?: 'vi' | 'en';
}

const ResultCard: React.FC<ResultCardProps> = ({ label, value, typeKey, icon, sheetData, highlight, language = 'vi' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [meaning, setMeaning] = useState<string>('');

  useEffect(() => {
    if (isOpen && !meaning) {
        // Fetch specific meaning when opened
        const text = getMeaning(sheetData, typeKey, value, language);
        setMeaning(text);
    }
  }, [isOpen, sheetData, typeKey, value, meaning, language]);

  return (
    <div className={`mb-4 rounded-xl overflow-hidden transition-all duration-300 border ${highlight ? 'border-yellow-400/50 bg-yellow-900/10' : 'border-white/10 bg-white/5'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${highlight ? 'bg-yellow-500/20 text-yellow-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
            {icon || <Info size={20} />}
          </div>
          <div>
            <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold">{label}</h3>
            <div className="text-2xl font-bold text-white font-mono">{value}</div>
          </div>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-white/10 bg-black/20 text-gray-200 leading-relaxed text-sm md:text-base animate-fadeIn">
            <div dangerouslySetInnerHTML={{ __html: meaning.replace(/\n/g, '<br/>') }} />
        </div>
      )}
    </div>
  );
};

export default ResultCard;