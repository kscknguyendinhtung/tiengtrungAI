import React from "react";
import { Trash2, BookOpen, Upload, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { GrammarPoint } from "../types";
import { ttsService } from "../services/ttsService";

interface Props {
  points: GrammarPoint[];
  setPoints: React.Dispatch<React.SetStateAction<GrammarPoint[]>>;
  onUpload: () => void;
  isSyncing: boolean;
  key?: string;
}

export default function GrammarTab({ points, setPoints, onUpload, isSyncing }: Props) {
  const deletePoint = (index: number) => {
    if (confirm("Xóa mục này?")) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  const speak = (text: string) => {
    // Basic regex to extract Chinese characters from the example string if it contains Vietnamese/Pinyin
    // However, usually the example field in GrammarPoint is the Chinese sentence.
    ttsService.speak(text, "zh-CN");
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
        {points.length === 0 && (
          <div className="text-center py-20 text-neutral-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            Chưa có phân tích ngữ pháp. <br/> Hãy nhấn vào biểu tượng văn bản ở tab Luyện đọc.
          </div>
        )}
      </div>
    </motion.div>
  );
}
