import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Volume2, 
  LayoutGrid, 
  CreditCard,
  ArrowRightLeft,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  SortAsc,
  Clock,
  Edit2,
  Play,
  Pause,
  Settings2,
  Image as ImageIcon,
  Type as TypeIcon,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Vocabulary } from "../types";
import { geminiService } from "../services/geminiService";
import { ttsService } from "../services/ttsService";

interface Props {
  vocabList: Vocabulary[];
  setVocabList: React.Dispatch<React.SetStateAction<Vocabulary[]>>;
  onUpload: () => void;
  isSyncing: boolean;
  onError: (error: any) => Promise<boolean>;
  key?: string;
}

export default function VocabTab({ vocabList, setVocabList, onUpload, isSyncing, onError }: Props) {
  const [viewMode, setViewMode] = useState<"table" | "flashcard">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "mastered" | "unmastered">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "alpha">("newest");
  const [selectedWordTypes, setSelectedWordTypes] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Vocabulary | null>(null);
  const [initialFlashcardIndex, setInitialFlashcardIndex] = useState(0);
  const [addMode, setAddMode] = useState<"single" | "text" | "image">("single");
  const [newWord, setNewWord] = useState("");
  const [newText, setNewText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Word Types and Topics
  const WORD_TYPES = useMemo(() => {
    const types = new Set(vocabList.map(v => v.wordType).filter(Boolean));
    return Array.from(types).sort();
  }, [vocabList]);

  const TOPICS = useMemo(() => {
    const topics = new Set(vocabList.map(v => v.topic).filter(Boolean));
    return Array.from(topics).sort();
  }, [vocabList]);

  const filteredList = useMemo(() => {
    let list = [...vocabList];

    // Filter by search
    if (searchQuery) {
      list = list.filter(v => 
        v.chinese.includes(searchQuery) || 
        v.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === "mastered") {
      list = list.filter(v => v.isMastered);
    } else if (filterStatus === "unmastered") {
      list = list.filter(v => !v.isMastered);
    }

    // Filter by Word Type
    if (selectedWordTypes.length > 0) {
      list = list.filter(v => selectedWordTypes.includes(v.wordType));
    }

    // Filter by Topic
    if (selectedTopics.length > 0) {
      list = list.filter(v => selectedTopics.includes(v.topic));
    }

    // Sort
    if (sortOrder === "alpha") {
      list.sort((a, b) => a.chinese.localeCompare(b.chinese, 'zh-Hans-CN'));
    } else {
      list.reverse();
    }

    return list;
  }, [vocabList, searchQuery, filterStatus, sortOrder, selectedWordTypes, selectedTopics]);

  const handleAddWord = async () => {
    if (addMode === "single") {
      if (!newWord) return;
      setIsAdding(true);
      try {
        const details = await geminiService.enrichVocabulary(newWord);
        const newItem: Vocabulary = {
          chinese: newWord,
          pinyin: details.pinyin || "",
          amBoi: details.amBoi || "",
          meaning: details.meaning || "",
          hanViet: details.hanViet || "",
          wordType: details.wordType || "Chưa phân loại",
          topic: details.topic || "Chung",
          isMastered: false
        };
        setVocabList(prev => [...prev, newItem]);
        setNewWord("");
        setShowAddModal(false);
      } catch (error) {
        const handled = await onError(error);
        if (!handled) alert("Có lỗi xảy ra khi phân tích từ vựng.");
      } finally {
        setIsAdding(false);
      }
    } else if (addMode === "text") {
      if (!newText) return;
      setIsAdding(true);
      try {
        const words = await geminiService.extractVocabularyFromText(newText);
        setVocabList(prev => [...prev, ...words]);
        setNewText("");
        setShowAddModal(false);
      } catch (error) {
        const handled = await onError(error);
        if (!handled) alert("Có lỗi xảy ra khi trích xuất từ vựng.");
      } finally {
        setIsAdding(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAdding(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const result = await geminiService.performOCR(base64);
        if (result.words) {
          setVocabList(prev => [...prev, ...result.words]);
        }
        setShowAddModal(false);
        setIsAdding(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      const handled = await onError(error);
      if (!handled) alert("Có lỗi xảy ra khi quét ảnh.");
      setIsAdding(false);
    }
  };

  const toggleMasteredByWord = (word: string) => {
    setVocabList(prev => prev.map(v => 
      v.chinese === word ? { ...v, isMastered: !v.isMastered } : v
    ));
  };

  const deleteWordByWord = (word: string) => {
    if (confirm(`Xóa từ "${word}"?`)) {
      setVocabList(prev => prev.filter(v => v.chinese !== word));
    }
  };

  const deleteAll = () => {
    if (confirm("Bạn có chắc chắn muốn xóa TẤT CẢ từ vựng?")) {
      setVocabList([]);
    }
  };

  const handleEdit = (item: Vocabulary) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleSelectWord = (item: Vocabulary) => {
    const index = filteredList.findIndex(v => v.chinese === item.chinese);
    if (index !== -1) {
      setInitialFlashcardIndex(index);
      setViewMode("flashcard");
    }
  };

  const toggleWordTypeFilter = (type: string) => {
    setSelectedWordTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleTopicFilter = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const saveEdit = () => {
    if (!editingItem) return;
    setVocabList(prev => prev.map(v => v.chinese === editingItem.chinese ? editingItem : v));
    setShowEditModal(false);
    setEditingItem(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4"
    >
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm từ vựng, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button 
            onClick={deleteAll}
            className="p-2 bg-white border border-neutral-200 text-neutral-300 hover:text-red-500 rounded-xl shadow-sm transition-colors"
            title="Xóa tất cả"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-200 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-all ${viewMode === "table" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setInitialFlashcardIndex(0);
                  setViewMode("flashcard");
                }}
                className={`p-2 rounded-lg transition-all ${viewMode === "flashcard" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
              >
                <CreditCard className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-neutral-200 p-1 rounded-xl">
              <button 
                onClick={() => setFilterStatus(prev => prev === "all" ? "unmastered" : prev === "unmastered" ? "mastered" : "all")}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${filterStatus !== "all" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
                title="Lọc trạng thái"
              >
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">
                  {filterStatus === "all" ? "Tất cả" : filterStatus === "mastered" ? "Đã thuộc" : "Chưa thuộc"}
                </span>
              </button>
              <button 
                onClick={() => setSortOrder(prev => prev === "newest" ? "alpha" : "newest")}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${sortOrder === "alpha" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
                title="Sắp xếp"
              >
                {sortOrder === "newest" ? <Clock className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase">
                  {sortOrder === "newest" ? "Mới" : "A-Z"}
                </span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={onUpload}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Lên Sheet
          </button>
        </div>

        {/* Multi-select Filters */}
        <div className="space-y-2">
          {WORD_TYPES.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase py-1">Loại từ:</span>
              {WORD_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleWordTypeFilter(type)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    selectedWordTypes.includes(type) 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-white text-neutral-500 border-neutral-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
          {TOPICS.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase py-1">Chủ đề:</span>
              {TOPICS.map(topic => (
                <button
                  key={topic}
                  onClick={() => toggleTopicFilter(topic)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    selectedTopics.includes(topic) 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-neutral-500 border-neutral-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <TableView 
            key="table"
            list={filteredList} 
            onToggleMastered={toggleMasteredByWord}
            onDelete={deleteWordByWord}
            onEdit={handleEdit}
            onSelect={handleSelectWord}
          />
        ) : (
          <FlashcardView 
            key="flashcard"
            list={filteredList} 
            onToggleMastered={toggleMasteredByWord}
            onEdit={handleEdit}
            initialIndex={initialFlashcardIndex}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Sửa từ vựng</h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Chữ Hán</label>
                <input 
                  type="text" 
                  value={editingItem.chinese}
                  disabled
                  className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Pinyin</label>
                  <input 
                    type="text" 
                    value={editingItem.pinyin}
                    onChange={(e) => setEditingItem({...editingItem, pinyin: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Phiên âm bồi</label>
                  <input 
                    type="text" 
                    value={editingItem.amBoi}
                    onChange={(e) => setEditingItem({...editingItem, amBoi: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Nghĩa tiếng Việt</label>
                <input 
                  type="text" 
                  value={editingItem.meaning}
                  onChange={(e) => setEditingItem({...editingItem, meaning: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Hán Việt</label>
                  <input 
                    type="text" 
                    value={editingItem.hanViet}
                    onChange={(e) => setEditingItem({...editingItem, hanViet: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Loại từ</label>
                  <input 
                    type="text" 
                    value={editingItem.wordType}
                    onChange={(e) => setEditingItem({...editingItem, wordType: e.target.value})}
                    className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase">Chủ đề</label>
                <input 
                  type="text" 
                  value={editingItem.topic}
                  onChange={(e) => setEditingItem({...editingItem, topic: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button 
                onClick={saveEdit}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-2xl"
              >
                Lưu thay đổi
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Thêm từ vựng mới</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6" /></button>
            </div>

            <div className="flex bg-neutral-100 p-1 rounded-2xl mb-6">
              <button 
                onClick={() => setAddMode("single")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${addMode === "single" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
              >
                <Plus className="w-4 h-4" /> Từ đơn
              </button>
              <button 
                onClick={() => setAddMode("text")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${addMode === "text" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
              >
                <TypeIcon className="w-4 h-4" /> Đoạn văn
              </button>
              <button 
                onClick={() => setAddMode("image")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${addMode === "image" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-500'}`}
              >
                <ImageIcon className="w-4 h-4" /> Hình ảnh
              </button>
            </div>

            {addMode === "single" && (
              <input 
                type="text" 
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Nhập chữ Hán..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            )}

            {addMode === "text" && (
              <textarea 
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Dán đoạn văn tiếng Trung vào đây để AI tự trích xuất từ vựng..."
                className="w-full h-32 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                autoFocus
              />
            )}

            {addMode === "image" && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl mb-6 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                <ImageIcon className="w-10 h-10 text-neutral-300 mb-2" />
                <span className="text-sm text-neutral-500 font-medium">Nhấn để chọn ảnh</span>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}

            {addMode !== "image" && (
              <button 
                onClick={handleAddWord}
                disabled={isAdding || (addMode === "single" ? !newWord : !newText)}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
              >
                {isAdding ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    AI Tự động phân tích
                  </>
                )}
              </button>
            )}

            {addMode === "image" && isAdding && (
              <div className="flex items-center justify-center gap-3 text-emerald-600 font-bold">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Đang quét ảnh...
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function TableView({ list, onToggleMastered, onDelete, onEdit, onSelect }: { list: Vocabulary[], onToggleMastered: (word: string) => void, onDelete: (word: string) => void, onEdit: (item: Vocabulary) => void, onSelect: (item: Vocabulary) => void, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {list.map((item, i) => (
        <div 
          key={i}
          className={`bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-4 transition-all ${item.isMastered ? 'opacity-60 grayscale-[0.5]' : ''}`}
        >
          <button onClick={() => onToggleMastered(item.chinese)}>
            {item.isMastered ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-neutral-300" />}
          </button>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(item)}>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-neutral-800">{item.chinese}</span>
              <span className="text-xs text-neutral-400 font-medium">{item.pinyin}</span>
            </div>
            <div className="text-sm text-neutral-600 truncate">{item.meaning}</div>
            <div className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-bold">{item.topic} • {item.wordType}</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(item)} className="p-2 text-neutral-300 hover:text-emerald-500">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(item.chinese)} className="p-2 text-neutral-300 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {list.length === 0 && (
        <div className="text-center py-20 text-neutral-400">Chưa có từ vựng nào.</div>
      )}
    </motion.div>
  );
}

function FlashcardView({ list, onToggleMastered, onEdit, initialIndex = 0 }: { list: Vocabulary[], onToggleMastered: (word: string) => void, onEdit: (item: Vocabulary) => void, initialIndex?: number, key?: string }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayDelay, setAutoPlayDelay] = useState(4); // seconds
  const [frontSide, setFrontSide] = useState<"chinese" | "meaning">("chinese");

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsFlipped(false);
  }, [initialIndex]);

  // Initialize shuffle order
  useEffect(() => {
    setShuffleOrder(Array.from({ length: list.length }, (_, i) => i));
  }, [list.length]);

  const displayIndex = shuffleOrder[currentIndex] ?? currentIndex;
  const currentItem = list[displayIndex];

  const speak = (text: string, lang: "zh-CN" | "vi-VN" = "zh-CN") => {
    ttsService.speak(text, lang);
  };

  // Auto-play logic
  useEffect(() => {
    let timer: any;
    if (isAutoPlaying && currentItem) {
      timer = setTimeout(() => {
        if (!isFlipped) {
          setIsFlipped(true);
        } else {
          setIsFlipped(false);
          setCurrentIndex((prev) => (prev + 1) % list.length);
        }
      }, autoPlayDelay * 1000);
    }
    return () => clearTimeout(timer);
  }, [isAutoPlaying, isFlipped, currentIndex, list.length, autoPlayDelay]);

  // Auto-speak on flip
  useEffect(() => {
    if (currentItem) {
      if (isFlipped) {
        // Speak the back side
        if (frontSide === "chinese") {
          speak(currentItem.meaning, "vi-VN");
        } else {
          speak(currentItem.chinese, "zh-CN");
        }
      } else {
        // Speak the front side
        if (frontSide === "chinese") {
          speak(currentItem.chinese, "zh-CN");
        } else {
          speak(currentItem.meaning, "vi-VN");
        }
      }
    }
  }, [isFlipped, currentItem, frontSide]);

  const handleShuffle = () => {
    const newOrder = [...shuffleOrder].sort(() => Math.random() - 0.5);
    setShuffleOrder(newOrder);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % list.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  if (!currentItem) return <div className="text-center py-20 text-neutral-400">Chưa có từ vựng để học.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <span className="text-sm font-bold text-neutral-500">{currentIndex + 1} / {list.length}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 rounded-lg px-1 py-1 gap-1">
            <button 
              onClick={() => setFrontSide("chinese")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${frontSide === "chinese" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-400'}`}
            >
              Hán
            </button>
            <button 
              onClick={() => setFrontSide("meaning")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${frontSide === "meaning" ? 'bg-white shadow-sm text-emerald-600' : 'text-neutral-400'}`}
            >
              Việt
            </button>
          </div>
          <div className="flex items-center bg-neutral-100 rounded-lg px-2 py-1 gap-2">
            <button 
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`p-1 rounded-md transition-colors ${isAutoPlaying ? 'bg-emerald-600 text-white' : 'text-neutral-400'}`}
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <select 
              value={autoPlayDelay}
              onChange={(e) => setAutoPlayDelay(Number(e.target.value))}
              className="bg-transparent text-[10px] font-bold outline-none"
            >
              <option value={3}>3s</option>
              <option value={4}>4s</option>
              <option value={5}>5s</option>
            </select>
          </div>
          <button 
            onClick={handleShuffle} 
            className="p-2 rounded-lg bg-neutral-100 text-neutral-400 hover:text-emerald-600 transition-colors"
            title="Trộn thẻ"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEdit(currentItem)}
            className="p-2 rounded-lg bg-neutral-100 text-neutral-400 hover:text-emerald-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        className="relative h-80 perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div 
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-full h-full relative preserve-3d"
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-xl border border-neutral-200 flex flex-col items-center justify-center p-8 text-center">
            {frontSide === "chinese" ? (
              <>
                <div className="text-6xl font-bold text-neutral-800 mb-4">{currentItem.chinese}</div>
                <div className="text-lg text-emerald-600 font-medium">{currentItem.pinyin}</div>
                <div className="text-xl text-neutral-400 mt-4 italic font-bold" style={{ fontSize: '150%' }}>{currentItem.amBoi}</div>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-neutral-800 mb-2">{currentItem.meaning}</div>
                <div className="text-xl text-neutral-400 font-medium">{currentItem.hanViet}</div>
              </>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); speak(frontSide === "chinese" ? currentItem.chinese : currentItem.meaning, frontSide === "chinese" ? "zh-CN" : "vi-VN"); }}
              className="absolute top-6 right-6 p-2 bg-neutral-50 rounded-full text-neutral-300 hover:text-emerald-600"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-emerald-600 rounded-[2rem] shadow-xl text-white flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            {frontSide === "chinese" ? (
              <>
                <div className="text-3xl font-bold mb-2">{currentItem.meaning}</div>
                <div className="text-lg opacity-80 font-medium">{currentItem.hanViet}</div>
              </>
            ) : (
              <>
                <div className="text-5xl font-bold mb-4">{currentItem.chinese}</div>
                <div className="text-xl opacity-90">{currentItem.pinyin}</div>
                <div className="text-lg opacity-70 italic mt-2">{currentItem.amBoi}</div>
              </>
            )}
            <div className="mt-6 px-4 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest">
              {currentItem.wordType}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); speak(frontSide === "chinese" ? currentItem.meaning : currentItem.chinese, frontSide === "chinese" ? "vi-VN" : "zh-CN"); }}
              className="absolute top-6 left-6 p-2 bg-white/10 rounded-full text-white/50 hover:text-white"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button onClick={prevCard} className="p-4 bg-white rounded-full shadow-md text-neutral-600"><ChevronLeft className="w-8 h-8" /></button>
        <button 
          onClick={() => onToggleMastered(currentItem.chinese)}
          className={`p-4 rounded-full shadow-md transition-all ${currentItem.isMastered ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-neutral-300'}`}
        >
          <CheckCircle2 className="w-8 h-8" />
        </button>
        <button onClick={nextCard} className="p-4 bg-white rounded-full shadow-md text-neutral-600"><ChevronRight className="w-8 h-8" /></button>
      </div>
    </div>
  );
}
