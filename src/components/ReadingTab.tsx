import React, { useState, useMemo } from "react";
import { Volume2, CheckCircle2, Trash2, FileText, ChevronRight, Play, Upload, ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { ReadingSentence, ReadingWord, Vocabulary } from "../types";

interface Props {
  sentences: ReadingSentence[];
  setSentences: React.Dispatch<React.SetStateAction<ReadingSentence[]>>;
  vocabList: Vocabulary[];
  onUpload: () => void;
  isSyncing: boolean;
  onAnalyzeGrammar: (text: string) => void;
  key?: string;
}

export default function ReadingTab({ sentences, setSentences, vocabList, onUpload, isSyncing, onAnalyzeGrammar }: Props) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Helper to find the best match in vocabList for a given string starting at index
  const findBestMatch = (text: string, startIndex: number) => {
    let bestMatch: Vocabulary | null = null;
    let maxLength = 0;

    // Try to find the longest matching word from vocabList starting at startIndex
    for (const vocab of vocabList) {
      if (text.startsWith(vocab.chinese, startIndex)) {
        if (vocab.chinese.length > maxLength) {
          maxLength = vocab.chinese.length;
          bestMatch = vocab;
        }
      }
    }
    return bestMatch;
  };

  // Process sentences to use vocabList data and handle compound words
  const processedSentences = useMemo(() => {
    return sentences.map(sentence => {
      const text = sentence.chinese;
      const newWords: ReadingWord[] = [];
      let i = 0;

      while (i < text.length) {
        const match = findBestMatch(text, i);
        if (match) {
          newWords.push({
            char: match.chinese,
            amBoi: match.amBoi,
            meaning: match.meaning
          });
          i += match.chinese.length;
        } else {
          // If no match in vocab, try to find in existing sentence.words or just use the char
          const existingWord = sentence.words.find(w => w.char === text[i]);
          newWords.push({
            char: text[i],
            amBoi: existingWord?.amBoi || "",
            meaning: existingWord?.meaning || ""
          });
          i++;
        }
      }

      return { ...sentence, words: newWords };
    });
  }, [sentences, vocabList]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = playbackSpeed;
    window.speechSynthesis.speak(utterance);
  };

  const toggleMastered = (index: number) => {
    const newList = [...sentences];
    newList[index].isMastered = !newList[index].isMastered;
    setSentences(newList);
  };

  const deleteSentence = (index: number) => {
    if (confirm("Xóa câu này?")) {
      setSentences(sentences.filter((_, i) => i !== index));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center justify-between bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm">
          <span className="text-sm font-bold text-neutral-500">Tốc độ: {playbackSpeed}x</span>
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.1" 
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="w-24 accent-emerald-600"
          />
        </div>
        <button 
          onClick={() => {
            const allText = sentences.map(s => s.chinese).join(" ");
            onAnalyzeGrammar(allText);
          }}
          className="p-3 bg-white border border-neutral-200 rounded-2xl text-blue-600 hover:bg-blue-50 shadow-sm flex items-center gap-2"
          title="Phân tích ngữ pháp toàn bộ"
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs font-bold">Ngữ pháp</span>
        </button>
        <button 
          onClick={onUpload}
          disabled={isSyncing}
          className="p-3 bg-white border border-neutral-200 rounded-2xl text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 shadow-sm"
          title="Lưu lên Sheet"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {processedSentences.map((sentence, i) => (
          <div 
            key={i}
            className={`bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden transition-all ${sentence.isMastered ? 'opacity-60' : ''}`}
          >
            <div className="p-6 space-y-6">
              {/* Word-by-word display */}
              <div className="flex flex-wrap gap-x-4 gap-y-8 justify-center">
                {sentence.words.map((word, j) => (
                  <div key={j} className="flex flex-col items-center cursor-pointer" onClick={() => speak(word.char)}>
                    <span className="text-[10px] text-emerald-600 font-bold mb-1">{word.amBoi}</span>
                    <span className="text-3xl font-bold text-neutral-800 hover:text-emerald-600 transition-colors">{word.char}</span>
                    <span className="text-[10px] text-neutral-400 mt-1">{word.meaning}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-neutral-50">
                <div className="text-sm text-emerald-600 font-medium text-center">{sentence.pinyin}</div>
                <div className="text-base text-neutral-700 font-bold text-center italic">"{sentence.meaning}"</div>
              </div>
            </div>

            <div className="bg-neutral-50 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => speak(sentence.chinese)}
                  className="p-2 bg-white rounded-xl shadow-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
                <button 
                  onClick={() => onAnalyzeGrammar(sentence.chinese)}
                  className="p-2 bg-white rounded-xl shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Phân tích ngữ pháp"
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleMastered(i)}
                  className={`p-2 rounded-xl shadow-sm transition-colors ${sentence.isMastered ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-300'}`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => deleteSentence(i)}
                  className="p-2 bg-white rounded-xl shadow-sm text-neutral-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {sentences.length === 0 && (
          <div className="text-center py-20 text-neutral-400">Chưa có nội dung luyện đọc. Hãy quét ảnh để bắt đầu.</div>
        )}
      </div>
    </motion.div>
  );
}
