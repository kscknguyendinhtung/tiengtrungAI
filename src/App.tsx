import React, { useState, useEffect } from "react";
import { 
  Camera, 
  BookOpen, 
  Languages, 
  Settings, 
  RefreshCw, 
  FileText,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Vocabulary, AppConfig, ReadingSentence, GrammarPoint } from "./types";
import { geminiService } from "./services/geminiService";
import { googleSheetService } from "./services/googleSheetService";

// Sub-components
import OCRTab from "./components/OCRTab";
import VocabTab from "./components/VocabTab";
import ReadingTab from "./components/ReadingTab";
import GrammarTab from "./components/GrammarTab";
import ConfigScreen from "./components/ConfigScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("ocr");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [readingSentences, setReadingSentences] = useState<ReadingSentence[]>([]);
  const [grammarPoints, setGrammarPoints] = useState<GrammarPoint[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedConfig = localStorage.getItem("tiengtrungAI_config");
    const savedVocab = localStorage.getItem("tiengtrungAI_vocab");
    const savedReading = localStorage.getItem("tiengtrungAI_reading");
    const savedGrammar = localStorage.getItem("tiengtrungAI_grammar");

    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedVocab) setVocabList(JSON.parse(savedVocab));
    if (savedReading) setReadingSentences(JSON.parse(savedReading));
    if (savedGrammar) setGrammarPoints(JSON.parse(savedGrammar));
  }, []);

  // Save to local storage
  useEffect(() => {
    if (config) localStorage.setItem("tiengtrungAI_config", JSON.stringify(config));
    localStorage.setItem("tiengtrungAI_vocab", JSON.stringify(vocabList));
    localStorage.setItem("tiengtrungAI_reading", JSON.stringify(readingSentences));
    localStorage.setItem("tiengtrungAI_grammar", JSON.stringify(grammarPoints));
  }, [config, vocabList, readingSentences, grammarPoints]);

  const handleSync = async () => {
    if (!config?.scriptUrl || !config?.sheetUrl) return;
    setIsSyncing(true);
    const sheetId = extractSheetId(config.sheetUrl);
    const { vocab, reading, grammar } = await googleSheetService.syncFromSheet(config.scriptUrl, sheetId);
    
    if (vocab.length > 0) setVocabList(vocab);
    if (reading.length > 0) setReadingSentences(reading);
    if (grammar.length > 0) setGrammarPoints(grammar);
    
    setIsSyncing(false);
  };

  const handleUpload = async () => {
    if (!config?.scriptUrl || !config?.sheetUrl) return;
    setIsSyncing(true);
    const sheetId = extractSheetId(config.sheetUrl);
    await googleSheetService.syncToSheet(config.scriptUrl, sheetId, vocabList, readingSentences, grammarPoints);
    setIsSyncing(false);
  };

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : url;
  };

  if (!config) {
    return <ConfigScreen onSave={setConfig} onSync={handleSync} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
            AI
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800">tiengtrungAI</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors disabled:opacity-50"
            title="Đồng bộ từ Sheet"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setConfig(null)}
            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors"
            title="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          {activeTab === "ocr" && (
            <OCRTab 
              key="ocr"
              config={config}
              onResult={(result) => {
                // Update Reading Sentences
                setReadingSentences(prev => [...result.sentences, ...prev]);
                
                // Update Vocabulary (avoid duplicates)
                const newVocab = result.words.filter(w => !vocabList.some(v => v.chinese === w));
                
                // Enrich vocabulary automatically
                Promise.all(newVocab.map(w => geminiService.enrichVocabulary(w))).then(enriched => {
                  const newItems: Vocabulary[] = enriched.map(item => ({
                    chinese: item.chinese || "",
                    pinyin: item.pinyin || "",
                    amBoi: item.amBoi || "",
                    meaning: item.meaning || "",
                    hanViet: item.hanViet || "",
                    wordType: item.wordType || "",
                    topic: item.topic || "Chung",
                    isMastered: false
                  }));
                  setVocabList(prev => [...prev, ...newItems]);
                });
                
                // Analyze grammar for the whole text
                geminiService.analyzeGrammar(result.originalText).then(points => {
                  setGrammarPoints(prev => [...points, ...prev]);
                });

                setActiveTab("reading");
              }}
            />
          )}
          {activeTab === "vocab" && (
            <VocabTab 
              key="vocab"
              vocabList={vocabList}
              setVocabList={setVocabList}
              onUpload={handleUpload}
              isSyncing={isSyncing}
            />
          )}
          {activeTab === "reading" && (
            <ReadingTab 
              key="reading"
              sentences={readingSentences}
              setSentences={setReadingSentences}
              vocabList={vocabList}
              onUpload={handleUpload}
              isSyncing={isSyncing}
              onAnalyzeGrammar={async (text) => {
                const points = await geminiService.analyzeGrammar(text);
                setGrammarPoints(prev => [...points, ...prev]);
                setActiveTab("grammar");
              }}
            />
          )}
          {activeTab === "grammar" && (
            <GrammarTab 
              key="grammar"
              points={grammarPoints}
              setPoints={setGrammarPoints}
              onUpload={handleUpload}
              isSyncing={isSyncing}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex justify-around items-center h-16 px-2 z-50">
        <NavButton 
          active={activeTab === "ocr"} 
          onClick={() => setActiveTab("ocr")} 
          icon={<Camera className="w-6 h-6" />} 
          label="Quét ảnh" 
        />
        <NavButton 
          active={activeTab === "vocab"} 
          onClick={() => setActiveTab("vocab")} 
          icon={<BookOpen className="w-6 h-6" />} 
          label="Từ vựng" 
        />
        <NavButton 
          active={activeTab === "reading"} 
          onClick={() => setActiveTab("reading")} 
          icon={<Languages className="w-6 h-6" />} 
          label="Luyện đọc" 
        />
        <NavButton 
          active={activeTab === "grammar"} 
          onClick={() => setActiveTab("grammar")} 
          icon={<FileText className="w-6 h-6" />} 
          label="Ngữ pháp" 
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${active ? 'text-emerald-600' : 'text-neutral-400'}`}
    >
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="absolute bottom-0 w-12 h-1 bg-emerald-600 rounded-t-full" />}
    </button>
  );
}

