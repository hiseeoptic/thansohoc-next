// src/app/page.tsx
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
    fetchMeanings().then(setSheetData).catch(console.error);
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'vi' ? 'en' : 'vi');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1c2c] via-[#2d1b33] to-[#0f172a] text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="p-6 text-center border-b border-white/5 bg-black/10 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 tracking-tight">
          Mystic Numerology
        </h1>

        <button
          onClick={toggleLanguage}
          className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 flex items-center gap-1 transition"
          title={language === 'vi' ? 'Chuyển sang English' : 'Switch to Vietnamese'}
        >
          <Globe size={16} />
          {language === 'vi' ? 'EN' : 'VI'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex justify-center gap-4 my-8 px-4">
        <button
          onClick={() => setActiveTab('calc')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 border shadow-md ${
            activeTab === 'calc'
              ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/40'
              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
          }`}
        >
          <CalcIcon size={20} />
          {language === 'vi' ? 'Tra Cứu' : 'Query'}
        </button>

        <button
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 border shadow-md ${
            activeTab === 'connect'
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/40'
              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
          }`}
        >
          <Layers size={20} />
          {language === 'vi' ? 'Phân Tích Liên Kết' : 'Connection Analysis'}
        </button>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        {activeTab === 'calc' && (
          <Calculator 
            setSharedResults={setSharedResults} 
            language={language} 
            sheetData={sheetData} 
          />
        )}
        {activeTab === 'connect' && (
          <ConnectionTool 
            sheetData={sheetData} 
            sharedResults={sharedResults} 
            language={language} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center p-8 text-gray-500 text-sm border-t border-white/5 mt-auto">
        <p>© {new Date().getFullYear()} Mystic Numerology. Designed with Mystical Energy.</p>
        <div className="mt-4 flex justify-center gap-6">
          <a
            href="https://m.me/nguyenduchoa87"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600/80 hover:bg-blue-600 text-white px-5 py-2 rounded-full transition"
          >
            {language === 'vi' ? 'Liên hệ Messenger' : 'Contact Messenger'}
          </a>
          <a
            href="https://zalo.me/0931767767"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600/80 hover:bg-green-600 text-white px-5 py-2 rounded-full transition"
          >
            {language === 'vi' ? 'Liên hệ Zalo' : 'Contact Zalo'}
          </a>
        </div>
      </footer>
    </div>
  );
}
