import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  RotateCcw, 
  Link as LinkIcon, 
  Split, 
  ArrowRightLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Play,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Vocabulary } from "../types";
import { geminiService } from "../services/geminiService";

interface GameData {
  related: { chinese: string; pinyin: string; meaning: string; reason: string; hanViet: string }[];
  antonyms: { chinese: string; pinyin: string; meaning: string; hanViet: string }[];
  characterAnalysis: { char: string; components?: string; meaning: string; examples: { chinese: string; pinyin: string; meaning: string; hanViet: string }[] }[];
}

type GameView = 'explore' | 'quiz';
type QuizMode = 'zh-vi' | 'vi-zh';

interface MillionaireGameProps {
  vocabList: Vocabulary[];
  filteredVocab: Vocabulary[];
  onBack: () => void;
  onError: (error: any) => void;
}

const MillionaireQuiz = ({ vocabList, filteredVocab, onBack, onError }: MillionaireGameProps) => {
  const [quizMode, setQuizMode] = useState<QuizMode>('zh-vi');
  const [status, setStatus] = useState<'idle' | 'playing' | 'result' | 'gameover'>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Vocabulary | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [score, setScore] = useState(0);
  const [timerLimit, setTimerLimit] = useState(3);
  const [timeLeft, setTimeLeft] = useState(3);
  const [streak, setStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const speak = (text: string, lang = 'zh-CN') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const generateQuestion = () => {
    if (filteredVocab.length < 4) {
      alert("Cần ít nhất 4 từ trong danh sách lọc để bắt đầu trò chơi.");
      onBack();
      return;
    }

    const question = filteredVocab[Math.floor(Math.random() * filteredVocab.length)];
    const correct = quizMode === 'zh-vi' ? question.meaning : question.chinese;
    
    let distractors = vocabList
      .filter(v => v.chinese !== question.chinese)
      .map(v => (quizMode === 'zh-vi' ? v.meaning : v.chinese));
    
    distractors = Array.from(new Set(distractors)).sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [...distractors, correct].sort(() => Math.random() - 0.5);
    
    setCurrentQuestion(question);
    setCorrectAnswer(correct);
    setOptions(allOptions);
    setTimeLeft(timerLimit);
    setSelectedAnswer(null);
    setStatus('playing');
  };

  useEffect(() => {
    if (status === 'playing' && currentQuestion) {
      speak(currentQuestion.chinese);
    }
  }, [currentQuestion, status]);

  useEffect(() => {
    let timer: any;
    if (status === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAnswer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleAnswer = (answer: string | null) => {
    setSelectedAnswer(answer);
    if (answer === correctAnswer) {
      setScore(prev => prev + (streak + 1) * 100);
      setStreak(prev => prev + 1);
      setStatus('result');
      setTimeout(() => generateQuestion(), 1000);
    } else {
      setStatus('gameover');
    }
  };

  if (status === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-10 space-y-4 sm:space-y-8 animate-in fade-in zoom-in duration-300 w-full max-w-sm mx-auto">
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-200">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-amber-400" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 text-amber-500 animate-pulse w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        
        <div className="text-center space-y-1 sm:space-y-2 px-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-neutral-800">Ai là Triệu phú?</h3>
          <p className="text-sm sm:text-base text-neutral-500 font-medium">Thử thách phản xạ với mốc {timerLimit} giây</p>
        </div>

        <div className="w-full px-6 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest block text-center">Chế độ chơi</span>
            <div className="bg-neutral-100 p-1 rounded-2xl flex">
              <button 
                onClick={() => setQuizMode('zh-vi')}
                className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${quizMode === 'zh-vi' ? 'bg-white shadow text-indigo-600' : 'text-neutral-500'}`}
              >
                Hán → Việt
              </button>
              <button 
                onClick={() => setQuizMode('vi-zh')}
                className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${quizMode === 'vi-zh' ? 'bg-white shadow text-indigo-600' : 'text-neutral-500'}`}
              >
                Việt → Hán
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest block text-center">Thời gian suy nghĩ</span>
            <div className="flex justify-between gap-2">
              {[3, 5, 10, 15].map(sec => (
                <button
                  key={sec}
                  onClick={() => {
                    setTimerLimit(sec);
                    setTimeLeft(sec);
                  }}
                  className={`flex-1 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all border-2 ${timerLimit === sec ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-neutral-100 text-neutral-400'}`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button 
              onClick={generateQuestion}
              className="w-full py-4 sm:py-5 bg-indigo-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-bold text-lg sm:text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
            >
              Bắt đầu <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <button onClick={onBack} className="w-full py-2 text-neutral-400 font-bold text-sm hover:text-neutral-600 transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-10 duration-500 w-full max-w-sm mx-auto">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
          <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10 text-rose-600" />
        </div>
        <div className="text-center px-4">
          <h3 className="text-3xl sm:text-4xl font-black text-neutral-800 mb-2">GameOver!</h3>
          <p className="text-sm sm:text-base text-neutral-500 font-medium italic">Bạn đã dừng chân tại mốc</p>
          <p className="text-4xl sm:text-5xl font-black text-indigo-600 mt-2 sm:mt-4">${score.toLocaleString()}</p>
        </div>

        <div className="w-full px-6 space-y-3 sm:space-y-4">
          <button 
            onClick={generateQuestion}
            className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:shadow-indigo-100 transition-all"
          >
            Chơi lại ngay
          </button>
          <button onClick={onBack} className="w-full py-2 sm:py-3 text-neutral-400 font-bold text-sm hover:text-neutral-600 transition-colors">
            Về màn hình chính
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-10 py-2 sm:py-6 max-w-md mx-auto h-full flex flex-col overflow-y-auto sm:overflow-hidden">
      <div className="flex justify-between items-center px-4 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tiền thưởng</span>
          <span className="text-2xl font-black text-amber-500 tracking-tighter">${score.toLocaleString()}</span>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
           <svg className="w-full h-full -rotate-90">
             <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
             <circle 
               cx="32" cy="32" r="28" fill="none" 
               stroke={timeLeft > (timerLimit / 3) ? "#6366f1" : "#f43f5e"} 
               strokeWidth="6"
               strokeDasharray={176}
               strokeDashoffset={176 - (176 * timeLeft / timerLimit)}
               className="transition-all duration-1000 ease-linear"
             />
           </svg>
           <span className={`absolute text-xl font-black ${timeLeft > 1 ? 'text-indigo-600' : 'text-rose-600'}`}>{timeLeft}s</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Chuỗi thắng</span>
          <div className="flex gap-1">
             {[...Array(5)].map((_, i) => (
               <div key={i} className={`w-2 h-2 rounded-full ${i < streak % 5 ? 'bg-indigo-500' : 'bg-neutral-200'}`} />
             ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 sm:gap-12 px-2 min-h-0">
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl border-b-4 sm:border-b-8 border-indigo-100 text-center relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-6 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Câu hỏi</div>
          <h4 className="text-2xl sm:text-4xl font-black text-neutral-800 break-words leading-tight">
            {quizMode === 'zh-vi' ? currentQuestion?.chinese : currentQuestion?.meaning}
          </h4>
          {quizMode === 'zh-vi' ? (
            <div className="mt-4 space-y-2">
              <p className="text-xl font-bold text-indigo-500 italic">{currentQuestion?.pinyin}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-400 font-medium italic">Chọn chữ Hán tương ứng</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:gap-4 overflow-y-auto pr-1">
          {options.map((opt, i) => {
            const optPinyin = quizMode === 'vi-zh' ? vocabList.find(v => v.chinese === opt)?.pinyin : null;
            let btnClass = "bg-white border-2 border-neutral-100 text-neutral-600";
            if (selectedAnswer === opt) {
              btnClass = opt === correctAnswer ? "bg-emerald-500 border-emerald-500 text-white scale-105" : "bg-rose-500 border-rose-500 text-white";
            } else if (selectedAnswer && opt === correctAnswer) {
              btnClass = "bg-emerald-50 border-emerald-500 text-emerald-600";
            }

            return (
              <button
                key={i}
                disabled={status !== 'playing'}
                onClick={() => handleAnswer(opt)}
                className={`w-full py-3 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-center transition-all flex items-center justify-between group min-h-[4rem] sm:h-22 ${btnClass} active:scale-95`}
              >
                <div className="flex items-center gap-3 sm:gap-4 w-full">
                   <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 ${selectedAnswer === opt ? 'bg-white/20' : 'bg-neutral-100 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                      {String.fromCharCode(65 + i)}
                   </div>
                   <div className="flex-1 text-center min-w-0">
                     <span className="block leading-tight truncate sm:whitespace-normal">{opt}</span>
                     {optPinyin && <span className={`block text-[10px] sm:text-xs italic font-medium truncate ${selectedAnswer === opt ? 'text-white/80' : 'text-indigo-400'}`}>{optPinyin}</span>}
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface GameTabProps {
  vocabList: Vocabulary[];
  onError: (error: any) => void | Promise<any>;
  onAddVocab?: (word: string) => Promise<void>;
  onToggleMastery?: (chinese: string) => Promise<void>;
  key?: string;
  // Filter Props
  searchQuery?: string;
  filterStatus?: "all" | "mastered" | "unmastered";
  sortOrder?: "newest" | "alpha";
  selectedWordTypes?: string[];
  selectedTopics?: string[];
}

interface WordCardProps {
  key?: string;
  word: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  reason?: string;
  isAI?: boolean;
  vocabList: Vocabulary[];
  onAddVocab?: (word: string) => Promise<void>;
  onToggleMastery?: (chinese: string) => Promise<void>;
  onExplore: (word: string) => void;
}

const WordCard = ({ 
  word, 
  pinyin, 
  hanViet, 
  meaning, 
  reason, 
  vocabList, 
  onAddVocab, 
  onToggleMastery,
  onExplore
}: WordCardProps) => {
  const vocabItem = vocabList.find(v => v.chinese === word);
  const inNotebook = !!vocabItem;
  const isMastered = vocabItem?.isMastered || false;

  return (
    <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-4">
        <button 
          onClick={() => onExplore(word)}
          className="flex-1 flex items-center gap-4 text-left"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-colors ${inNotebook ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {word}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-neutral-800 italic">{pinyin}</span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase">({hanViet})</span>
            </div>
            <p className="text-sm text-neutral-600 font-medium line-clamp-1">{meaning}</p>
            {reason && <p className="text-[10px] text-emerald-500 font-bold mt-1 bg-emerald-50 px-1.5 py-0.5 rounded inline-block uppercase">{reason}</p>}
          </div>
        </button>
        
        <div className="flex items-center gap-2 pt-1">
          {inNotebook ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleMastery?.(word);
              }}
              className={`p-2 rounded-lg transition-colors ${isMastered ? 'text-emerald-500 bg-emerald-50' : 'text-neutral-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
              title={isMastered ? "Đã thuộc" : "Đánh dấu đã thuộc"}
            >
              <CheckCircle2 className={`w-5 h-5 ${isMastered ? 'fill-current' : ''}`} />
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddVocab?.(word);
              }}
              className="p-2 text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Thêm vào sổ tay"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function GameTab({ 
  vocabList, 
  onError, 
  onAddVocab, 
  onToggleMastery,
  searchQuery = "",
  filterStatus = "all",
  sortOrder = "newest",
  selectedWordTypes = [],
  selectedTopics = []
}: GameTabProps) {
  const [view, setView] = useState<GameView>('explore');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentWord, setCurrentWord] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GameData | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [orderMode, setOrderMode] = useState<'random' | 'sequential'>('random');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Apply filtered inventory from VocabTab
  const filteredVocab = useMemo(() => {
    let list = [...vocabList];

    if (searchQuery) {
      list = list.filter(v => 
        v.chinese.includes(searchQuery) || 
        v.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterStatus === "mastered") {
      list = list.filter(v => v.isMastered);
    } else if (filterStatus === "unmastered") {
      list = list.filter(v => !v.isMastered);
    }
    
    if (selectedWordTypes.length > 0) {
      list = list.filter(v => selectedWordTypes.includes(v.wordType));
    }
    
    if (selectedTopics.length > 0) {
      list = list.filter(v => selectedTopics.includes(v.topic));
    }

    // Sort
    if (sortOrder === "alpha") {
      list.sort((a, b) => a.chinese.localeCompare(b.chinese, 'zh-Hans-CN'));
    } else {
      list.reverse();
    }

    // Game Specific: Exclude sentences and long words
    return list.filter(v => v.wordType !== "Mẫu câu" && v.chinese.length < 7);
  }, [vocabList, searchQuery, filterStatus, sortOrder, selectedWordTypes, selectedTopics]);

  const speakSequence = async (elements: { text: string, lang: 'zh-CN' | 'vi-VN' }[]) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => 
      v.lang.toLowerCase().includes("zh-cn") || 
      v.lang.toLowerCase().includes("zh-tw") || 
      v.name.toLowerCase().includes("chinese")
    );
    const viVoice = voices.find(v => 
      v.lang.toLowerCase().includes("vi-vn") || 
      v.name.toLowerCase().includes("vietnamese")
    );

    for (const item of elements) {
      if (!item.text) continue;
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = item.lang;
        if (item.lang === 'zh-CN' && zhVoice) utterance.voice = zhVoice;
        if (item.lang === 'vi-VN' && viVoice) utterance.voice = viVoice;
        utterance.rate = item.lang === 'zh-CN' ? 0.85 : 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      await new Promise(resolve => setTimeout(resolve, item.lang === 'zh-CN' ? 400 : 200));
    }
  };

  useEffect(() => {
    if (data && !loading) {
      const items: { text: string, lang: 'zh-CN' | 'vi-VN' }[] = [
        { text: currentWord, lang: 'zh-CN' }
      ];
      
      data.characterAnalysis.forEach(char => {
        items.push({ text: `Phân tích chữ ${char.char}`, lang: 'vi-VN' });
        items.push({ text: char.char, lang: 'zh-CN' });
        
        const notebookWords = vocabList
          .filter(v => v.chinese.includes(char.char) && v.chinese !== currentWord && v.wordType !== "Mẫu câu" && v.chinese.length < 7)
          .map(v => v.chinese);
        
        notebookWords.forEach(w => items.push({ text: w, lang: 'zh-CN' }));
        char.examples.forEach(ex => items.push({ text: ex.chinese, lang: 'zh-CN' }));
      });

      if (data.related.length > 0) {
        items.push({ text: "Liên tưởng mở rộng", lang: 'vi-VN' });
        data.related.forEach(rel => items.push({ text: rel.chinese, lang: 'zh-CN' }));
      }

      if (data.antonyms.length > 0) {
        items.push({ text: "Từ trái nghĩa", lang: 'vi-VN' });
        data.antonyms.forEach(ant => items.push({ text: ant.chinese, lang: 'zh-CN' }));
      }

      speakSequence(items);
    }
  }, [data, loading, currentWord, vocabList]);

  const exploreWord = async (word: string) => {
    if (!word) return;
    setLoading(true);
    setCurrentWord(word);
    setSearchTerm("");
    
    try {
      const existingWords = vocabList.map(v => v.chinese);
      const result = await geminiService.getRelatedWords(word, existingWords);
      setData(result);
      if (!history.includes(word)) {
        setHistory(prev => [word, ...prev].slice(0, 5));
      }
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (filteredVocab.length === 0) return;

    if (orderMode === 'random') {
      const randomWord = filteredVocab[Math.floor(Math.random() * filteredVocab.length)].chinese;
      exploreWord(randomWord);
    } else {
      const nextIdx = (currentIndex + 1) % filteredVocab.length;
      setCurrentIndex(nextIdx);
      exploreWord(filteredVocab[nextIdx].chinese);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto h-full flex flex-col ${view === 'quiz' ? 'p-0' : 'p-4 space-y-6'}`}>
      {/* Mode Switcher */}
      <div className={`bg-neutral-100 p-1 rounded-2xl flex w-full max-w-sm mx-auto shadow-inner shrink-0 ${view === 'quiz' ? 'mt-4 mx-4 w-[calc(100%-2rem)]' : ''}`}>
        <button 
          onClick={() => setView('explore')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${view === 'explore' ? 'bg-white shadow text-emerald-600' : 'text-neutral-500'}`}
        >
          <Sparkles className="w-4 h-4" /> Thám hiểm
        </button>
        <button 
          onClick={() => setView('quiz')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${view === 'quiz' ? 'bg-white shadow text-indigo-600' : 'text-neutral-500'}`}
        >
          <Trophy className="w-4 h-4" /> Triệu phú
        </button>
      </div>

      {view === 'quiz' ? (
        <MillionaireQuiz 
          vocabList={vocabList} 
          filteredVocab={filteredVocab} 
          onBack={() => setView('explore')} 
          onError={(err: any) => onError(err)}
        />
      ) : (
        <>
          {/* Search & Controls */}
      <div className="space-y-4">
        <div className="relative group">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && exploreWord(searchTerm)}
            placeholder="Nhập từ hoặc chữ Hán để thám hiểm..."
            className="w-full pl-12 pr-12 py-3 bg-white border-2 border-neutral-100 rounded-2xl shadow-sm focus:border-emerald-500 focus:ring-0 transition-all text-base"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-emerald-500" />
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-100 rounded-full text-emerald-600 transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setOrderMode('random')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${orderMode === 'random' ? 'bg-white shadow text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Ngẫu nhiên
          </button>
          <button 
            onClick={() => setOrderMode('sequential')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${orderMode === 'sequential' ? 'bg-white shadow text-emerald-600' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Cố định (Sổ tay)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 space-y-4 text-neutral-500">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="font-medium animate-pulse">Đang thám hiểm từ vựng...</p>
          </motion.div>
        ) : data ? (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Root Word */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-neutral-50 text-center relative overflow-hidden">
               <div className="absolute top-4 right-4 group">
                  {vocabList.find(v => v.chinese === currentWord) ? (
                    <button 
                      onClick={() => onToggleMastery?.(currentWord)}
                      className={`p-3 rounded-2xl transition-all ${vocabList.find(v => v.chinese === currentWord)?.isMastered ? 'bg-emerald-500 text-white shadow-lg' : 'bg-neutral-100 text-neutral-300 hover:text-emerald-500'}`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                  ) : (
                    <button onClick={() => onAddVocab?.(currentWord)} className="p-3 bg-neutral-50 text-neutral-400 rounded-2xl hover:text-emerald-600"><BookOpen className="w-6 h-6" /></button>
                  )}
               </div>
               <h2 className="text-6xl font-bold text-neutral-800 mb-2">{currentWord}</h2>
               <div className="space-y-1">
                 <p className="text-xl text-emerald-600 font-bold uppercase tracking-widest">{vocabList.find(v => v.chinese === currentWord)?.hanViet || "HÁN VIỆT"}</p>
                 <p className="text-lg text-neutral-500 italic">{vocabList.find(v => v.chinese === currentWord)?.pinyin || ""}</p>
                 <p className="text-lg text-neutral-400 font-medium">{vocabList.find(v => v.chinese === currentWord)?.meaning || ""}</p>
               </div>
            </div>

            {/* Analysis Sections */}
            {data.characterAnalysis.map((char, charIdx) => (
              <div key={charIdx} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl font-bold text-indigo-600 border border-indigo-100">{char.char}</div>
                  <div className="flex-1">
                    <p className="font-bold text-neutral-800 text-lg uppercase tracking-tight">{char.meaning}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pl-4">
                  {/* Notebook Words for this char */}
                  {vocabList.filter(v => v.chinese.includes(char.char) && v.chinese !== currentWord && v.wordType !== "Mẫu câu" && v.chinese.length < 7).map((v, i) => (
                    <WordCard 
                      key={`nb-${charIdx}-${i}`} 
                      word={v.chinese} 
                      pinyin={v.pinyin} 
                      hanViet={v.hanViet} 
                      meaning={v.meaning}
                      vocabList={vocabList}
                      onAddVocab={onAddVocab}
                      onToggleMastery={onToggleMastery}
                      onExplore={exploreWord}
                    />
                  ))}
                  {/* AI Examples for this char */}
                  {char.examples.map((ex, i) => (
                    <WordCard 
                      key={`ex-${charIdx}-${i}`} 
                      word={ex.chinese} 
                      pinyin={ex.pinyin} 
                      hanViet={ex.hanViet} 
                      meaning={ex.meaning} 
                      isAI 
                      vocabList={vocabList}
                      onAddVocab={onAddVocab}
                      onToggleMastery={onToggleMastery}
                      onExplore={exploreWord}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Related Words Section */}
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 px-2">
                  <LinkIcon className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-neutral-800">Liên tưởng mở rộng</h3>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 {data.related.map((rel, i) => (
                   <WordCard 
                     key={`rel-${i}`} 
                     word={rel.chinese} 
                     pinyin={rel.pinyin} 
                     hanViet={rel.hanViet} 
                     meaning={rel.meaning} 
                     reason={rel.reason} 
                     isAI 
                     vocabList={vocabList}
                     onAddVocab={onAddVocab}
                     onToggleMastery={onToggleMastery}
                     onExplore={exploreWord}
                   />
                 ))}
               </div>
            </div>

            {/* Antonyms Section */}
            {data.antonyms.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 px-2">
                  <ArrowRightLeft className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-neutral-800">Từ trái nghĩa</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   {data.antonyms.map((ant, i) => (
                     <WordCard 
                       key={`ant-${i}`} 
                       word={ant.chinese} 
                       pinyin={ant.pinyin} 
                       hanViet={ant.hanViet} 
                       meaning={ant.meaning} 
                       isAI 
                       vocabList={vocabList}
                       onAddVocab={onAddVocab}
                       onToggleMastery={onToggleMastery}
                       onExplore={exploreWord}
                     />
                   ))}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-6">
              <button onClick={handleNext} className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                Tiếp theo <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h4 className="text-2xl font-bold text-neutral-800">Khám phá từ vựng</h4>
              <p className="text-neutral-500 max-w-xs">Gợi ý từ vựng liên quan, trái nghĩa và phân tích từng chữ Hán để bạn mở rộng vốn từ nhanh chóng.</p>
            </div>
            <button onClick={handleNext} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" /> Bắt đầu thám hiểm
            </button>
          </motion.div>
        )}
      </AnimatePresence>
     </>
    )}
    </div>
  );
}
