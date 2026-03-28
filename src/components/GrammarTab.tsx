import React, { useState, useRef } from "react";
import { Trash2, BookOpen, Upload, Volume2, Image as ImageIcon, Brain, X, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GrammarPoint, GrammarQuizQuestion } from "../types";
import { ttsService } from "../services/ttsService";
import { geminiService } from "../services/geminiService";

interface Props {
  points: GrammarPoint[];
  setPoints: React.Dispatch<React.SetStateAction<GrammarPoint[]>>;
  onUpload: () => void;
  isSyncing: boolean;
  key?: string;
}

export default function GrammarTab({ points, setPoints, onUpload, isSyncing }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<GrammarQuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userOrdering, setUserOrdering] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deletePoint = (index: number) => {
    if (confirm("Xóa mục này?")) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  const speak = (text: string) => {
    ttsService.speak(text, "zh-CN");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const newPoints = await geminiService.performGrammarOCR(base64);
        setPoints(prev => [...prev, ...newPoints]);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Grammar OCR Error:", error);
      alert("Có lỗi xảy ra khi quét ảnh ngữ pháp.");
      setIsScanning(false);
    }
  };

  const startQuiz = async () => {
    if (points.length < 2) {
      alert("Cần ít nhất 2 cấu trúc ngữ pháp để tạo bài test.");
      return;
    }
    setIsGeneratingQuiz(true);
    try {
      const questions = await geminiService.generateGrammarQuiz(points);
      setQuizQuestions(questions);
      setCurrentQuizIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setUserOrdering([]);
      setShowExplanation(false);
      setShowQuiz(true);
    } catch (error) {
      alert("Không thể tạo bài test lúc này.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    if (option === quizQuestions[currentQuizIndex].answer) {
      setScore(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const handleOrderingClick = (word: string) => {
    if (selectedAnswer) return;
    if (userOrdering.includes(word)) {
      setUserOrdering(prev => prev.filter(w => w !== word));
    } else {
      const newOrdering = [...userOrdering, word];
      setUserOrdering(newOrdering);
      
      // Check if all words are selected
      if (newOrdering.length === quizQuestions[currentQuizIndex].options.length) {
        const finalSentence = newOrdering.join("");
        setSelectedAnswer(finalSentence);
        if (finalSentence === quizQuestions[currentQuizIndex].answer) {
          setScore(prev => prev + 1);
        }
        setShowExplanation(true);
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setUserOrdering([]);
      setShowExplanation(false);
    } else {
      // Quiz finished
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="text-left space-y-1">
          <h2 className="text-2xl font-bold text-neutral-800">Phân tích Ngữ pháp</h2>
          <p className="text-neutral-500 text-sm">AI phân tích các cấu trúc quan trọng.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="p-3 bg-white border border-neutral-200 rounded-2xl text-emerald-600 hover:bg-neutral-50 disabled:opacity-50 shadow-sm"
            title="Quét ảnh ngữ pháp"
          >
            {isScanning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </button>
          <button 
            onClick={startQuiz}
            disabled={isGeneratingQuiz || points.length === 0}
            className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100"
            title="Làm bài test"
          >
            {isGeneratingQuiz ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
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
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="space-y-4 pb-20">
        {points.map((point, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Cấu trúc
                </div>
                <button onClick={() => deletePoint(i)} className="text-neutral-300 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-neutral-800">{point.structure}</h3>
              
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                  {point.explanation}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ví dụ</div>
                  <button 
                    onClick={() => speak(point.example)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-lg font-medium text-emerald-600">{point.example}</div>
              </div>
            </div>
          </motion.div>
        ))}
        {points.length === 0 && !isScanning && (
          <div className="text-center py-20 text-neutral-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            Chưa có phân tích ngữ pháp. <br/> Hãy nhấn vào biểu tượng văn bản ở tab Luyện đọc <br/> hoặc quét ảnh ngữ pháp.
          </div>
        )}
        {isScanning && (
          <div className="text-center py-20 text-emerald-600 animate-pulse font-bold">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin opacity-20" />
            Đang quét ảnh ngữ pháp...
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowQuiz(false)}
                className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Câu hỏi {currentQuizIndex + 1} / {quizQuestions.length}</span>
                  <span className="text-xs font-bold text-neutral-400">Đúng: {score}</span>
                </div>
                <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                    className="bg-emerald-500 h-full"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-sm text-neutral-400 font-medium italic">{quizQuestions[currentQuizIndex].pinyin}</div>
                  <div className="text-3xl font-bold text-neutral-800">
                    {quizQuestions[currentQuizIndex].type === "ordering" ? "Sắp xếp các từ sau:" : quizQuestions[currentQuizIndex].question}
                  </div>
                </div>

                {quizQuestions[currentQuizIndex].type === "ordering" && (
                  <div className="min-h-[60px] p-4 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-wrap gap-2 items-center justify-center">
                    {userOrdering.map((word, idx) => (
                      <motion.span 
                        key={idx}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                      >
                        {word}
                      </motion.span>
                    ))}
                    {userOrdering.length === 0 && <span className="text-neutral-300 text-sm">Chưa có từ nào được chọn</span>}
                  </div>
                )}

                <div className="grid gap-3">
                  {quizQuestions[currentQuizIndex].type === "multiple-choice" ? (
                    quizQuestions[currentQuizIndex].options.map((option, idx) => {
                      const isCorrect = option === quizQuestions[currentQuizIndex].answer;
                      const isSelected = option === selectedAnswer;
                      const pinyin = quizQuestions[currentQuizIndex].optionPinyins?.[idx];
                      
                      let bgColor = "bg-neutral-50 border-neutral-100 hover:bg-neutral-100";
                      let textColor = "text-neutral-700";
                      
                      if (selectedAnswer) {
                        if (isCorrect) {
                          bgColor = "bg-emerald-100 border-emerald-200";
                          textColor = "text-emerald-700";
                        } else if (isSelected) {
                          bgColor = "bg-red-100 border-red-200";
                          textColor = "text-red-700";
                        } else {
                          bgColor = "bg-neutral-50 border-neutral-100 opacity-50";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(option)}
                          disabled={!!selectedAnswer}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${bgColor} ${textColor}`}
                        >
                          <div className="flex flex-col">
                            {pinyin && <span className="text-[10px] opacity-60 italic">{pinyin}</span>}
                            <span className="font-bold">{option}</span>
                          </div>
                          {selectedAnswer && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                          {selectedAnswer && isSelected && !isCorrect && <AlertCircle className="w-5 h-5" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quizQuestions[currentQuizIndex].options.map((word, idx) => {
                        const isUsed = userOrdering.includes(word);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleOrderingClick(word)}
                            disabled={!!selectedAnswer || isUsed}
                            className={`px-4 py-2 rounded-xl border-2 font-bold transition-all ${
                              isUsed 
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-300' 
                                : 'bg-white border-neutral-200 text-neutral-700 hover:border-emerald-500'
                            }`}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {showExplanation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 p-4 rounded-2xl border border-blue-100"
                  >
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">Giải thích & Đáp án</div>
                    <div className="text-sm font-bold text-emerald-700 mb-1">{quizQuestions[currentQuizIndex].answer}</div>
                    <p className="text-sm text-blue-800">{quizQuestions[currentQuizIndex].explanation}</p>
                  </motion.div>
                )}

                {selectedAnswer && (
                  <button 
                    onClick={currentQuizIndex === quizQuestions.length - 1 ? () => setShowQuiz(false) : nextQuestion}
                    className="w-full py-4 bg-neutral-800 text-white font-bold rounded-2xl shadow-lg hover:bg-neutral-900 transition-all"
                  >
                    {currentQuizIndex === quizQuestions.length - 1 ? "Hoàn thành" : "Tiếp theo"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
