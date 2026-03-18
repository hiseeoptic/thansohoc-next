'use client';

import React, { useState, useEffect } from 'react';
import Calculator from '@/components/Calculator';
import ConnectionTool from '@/components/ConnectionTool';
import { Calculator as CalcIcon, Layers, Globe } from 'lucide-react';
import { fetchMeanings } from '@/services/googleSheetService';
import { SheetMeaning, CalculationResult } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'calc' | 'connect'>('calc');
  const [sheetData, setSheetData] = useState<SheetMeaning[]>([]);
  const [sharedResults, setSharedResults] = useState<CalculationResult | null>(null);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  useEffect(() => {
    fetchMeanings()
      .then(setSheetData)
      .catch((err) => console.error('Lỗi tải sheet data:', err));
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1c2c] via-[#2d1b33] to-[#0f172a] text-white font-sans selection:bg-purple-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6 text-center border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 tracking-tight">
          Mystic Numerology
        </h1>

        <button
          onClick={toggleLanguage}
          className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white hover:from-blue-500 hover:to-indigo-500 flex items-center gap-1 transition-all shadow-md hover:shadow-lg"
          title={language === 'vi' ? 'Chuyển sang English' : 'Switch to Vietnamese'}
        >
          <Globe size={18} />
          <span className="font-medium">{language === 'vi' ? 'EN' : 'VI'}</span>
        </button>
      </header>

      {/* Tabs Navigation */}
      <div className="flex justify-center gap-3 sm:gap-4 my-6 sm:my-8 px-4">
        <button
          onClick={() => setActiveTab('calc')}
          className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 border shadow-md text-sm sm:text-base ${
            activeTab === 'calc'
              ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/40 scale-105'
              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30'
          }`}
        >
          <CalcIcon size={18} className="sm:size-20" />
          {language === 'vi' ? 'Tra Cứu' : 'Query'}
        </button>

        <button
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all duration-300 border shadow-md text-sm sm:text-base ${
            activeTab === 'connect'
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/40 scale-105'
              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-white/30'
          }`}
        >
          <Layers size={18} className="sm:size-20" />
          {language === 'vi' ? 'Phân Tích Liên Kết' : 'Connection Analysis'}
        </button>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 flex-grow">
        <div className={`transition-opacity duration-300 ${activeTab === 'calc' ? 'block' : 'hidden'}`}>
          <Calculator setSharedResults={setSharedResults} language={language} sheetData={sheetData} />
        </div>

        <div className={`transition-opacity duration-300 ${activeTab === 'connect' ? 'block' : 'hidden'}`}>
          <ConnectionTool sheetData={sheetData} sharedResults={sharedResults} language={language} />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 sm:p-8 text-gray-500 text-xs border-t border-white/5 mt-auto">
        <p>© {new Date().getFullYear()} Mystic Numerology. Designed with Mystical Energy.</p>
        <div className="mt-4 flex justify-center gap-4 sm:gap-6 flex-wrap">
          <a
            href="https://m.me/nguyenduchoa87"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600/80 hover:bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-full transition shadow-md hover:shadow-lg"
          >
            {language === 'vi' ? 'Liên hệ Messenger' : 'Contact Messenger'}
          </a>
          <a
            href="https://zalo.me/0931767767"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600/80 hover:bg-green-600 text-white px-4 sm:px-5 py-2 rounded-full transition shadow-md hover:shadow-lg"
          >
            {language === 'vi' ? 'Liên hệ Zalo' : 'Contact Zalo'}
          </a>
        </div>
      </footer>
    </div>
  );
}
