import React, { useState, useMemo } from "react";
import { Volume2, CheckCircle2, Trash2, FileText, ChevronRight, Play, Upload, ChevronLeft, Plus, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { ReadingSentence, ReadingWord, Vocabulary } from "../types";
import { ttsService } from "../services/ttsService";

interface Props {
  sentences: ReadingSentence[];
  setSentences: React.Dispatch<React.SetStateAction<ReadingSentence[]>>;
  vocabList: Vocabulary[];
  onUpload: () => void;
  isSyncing: boolean;
  onAnalyzeGrammar: (text: string) => void;
  onAddVocab: (word: string) => void;
  onError: (error: any) => Promise<boolean>;
  key?: string;
}

export default function ReadingTab({ sentences, setSentences, vocabList, onUpload, isSyncing, onAnalyzeGrammar, onAddVocab, onError }: Props) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [addingWord, setAddingWord] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        // 1. Try to find the longest match in vocabList
        const vocabMatch = findBestMatch(text, i);
        
        // 2. Try to find if the OCR result already has a grouped word starting here
        const ocrMatch = sentence.words.find(w => text.startsWith(w.char, i));

        // Prioritize the longer match
        if (vocabMatch && (!ocrMatch || vocabMatch.chinese.length >= ocrMatch.char.length)) {
          newWords.push({
            char: vocabMatch.chinese,
            amBoi: vocabMatch.amBoi,
            meaning: vocabMatch.meaning
          });
          i += vocabMatch.chinese.length;
        } else if (ocrMatch) {
          newWords.push({
            char: ocrMatch.char,
            amBoi: ocrMatch.amBoi,
            meaning: ocrMatch.meaning
          });
          i += ocrMatch.char.length;
        } else {
          // Fallback to single character
          newWords.push({
            char: text[i],
            amBoi: "",
            meaning: ""
          });
          i++;
        }
      }

      return { ...sentence, words: newWords };
    });
  }, [sentences, vocabList]);

  const speak = (text: string) => {
    ttsService.speak(text, "zh-CN", playbackSpeed);
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
          onClick={async () => {
            const allText = sentences.map(s => s.chinese).join(" ");
            setIsAnalyzing(true);
            try {
              await onAnalyzeGrammar(allText);
            } catch (error) {
              const handled = await onError(error);
              if (!handled) {
                alert("Có lỗi xảy ra khi phân tích ngữ pháp.");
              }
            } finally {
              setIsAnalyzing(false);
            }
          }}
          disabled={isAnalyzing}
          className="p-3 bg-white border border-neutral-200 rounded-2xl text-blue-600 hover:bg-blue-50 shadow-sm flex items-center gap-2 disabled:opacity-50"
          title="Phân tích ngữ pháp toàn bộ"
        >
          {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
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
                {sentence.words.map((word, j) => {
                  const isInVocab = vocabList.some(v => v.chinese === word.char);
                  return (
                    <div key={j} className="flex flex-col items-center group relative">
                      <span className="text-[10px] text-emerald-600 font-bold mb-1">{word.amBoi}</span>
                      <div className="relative">
                        <span 
                          className="text-3xl font-bold text-neutral-800 hover:text-emerald-600 transition-colors cursor-pointer"
                          onClick={() => speak(word.char)}
                        >
                          {word.char}
                        </span>
                        {!isInVocab && (
                          <button 
                            onClick={async () => {
                              setAddingWord(word.char);
                              await onAddVocab(word.char);
                              setAddingWord(null);
                            }}
                            disabled={addingWord === word.char}
                            className="absolute -top-2 -right-4 p-1 bg-emerald-100 text-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Thêm vào từ vựng"
                          >
                            <Plus className={`w-3 h-3 ${addingWord === word.char ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1">{word.meaning}</span>
                    </div>
                  );
                })}
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
                  onClick={async () => {
                    try {
                      await onAnalyzeGrammar(sentence.chinese);
                    } catch (error) {
                      const handled = await onError(error);
                      if (!handled) {
                        alert("Có lỗi xảy ra khi phân tích ngữ pháp.");
                      }
                    }
                  }}
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
