import { useState, useEffect } from "react";
import { AppConfig } from "../types";
import { Settings, RefreshCw, Key, ChevronDown, ChevronUp, Check, AlertCircle, Volume2, Play, Copy, Zap } from "lucide-react";
import { googleSheetService } from "../services/googleSheetService";
import { ttsService } from "../services/ttsService";
import { GOOGLE_APPS_SCRIPT_CODE } from "../constants/googleScriptCode";

interface Props {
  initialConfig?: AppConfig | null;
  onSave: (config: AppConfig) => void;
  onSync: () => void;
}

export default function ConfigScreen({ initialConfig, onSave, onSync }: Props) {
  const [sheetUrl, setSheetUrl] = useState(
    initialConfig?.sheetUrl || "https://docs.google.com/spreadsheets/d/1wdRVB4pEoc3ohZEjZkriGcK9UjatbvmwogKIKp2GlCE/edit?usp=sharing"
  );
  const [scriptUrl, setScriptUrl] = useState(
    initialConfig?.scriptUrl || "https://script.google.com/macros/s/AKfycbxu9URxC4bXmvOqvQm9UwFif-exNAeCCnyY24D7IGhApERVNq7MK-llc2tX0iIa7IEzHg/exec"
  );

  // Custom sheet names configuration
  const [vocabSheetName, setVocabSheetName] = useState(initialConfig?.vocabSheetName || "từ vựng");
  const [readingSheetName, setReadingSheetName] = useState(initialConfig?.readingSheetName || "luyện đọc");
  const [grammarSheetName, setGrammarSheetName] = useState(initialConfig?.grammarSheetName || "ngữ pháp");
  const [ocrSheetName, setOcrSheetName] = useState(initialConfig?.ocrSheetName || "OCR");

  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const [volume, setVolume] = useState(() => ttsService.getVolume());

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ttsService.setVolume(newVol);
  };

  const handleTestAudio = () => {
    ttsService.speak("你好！Đây là mức âm lượng " + Math.round(volume * 100) + " phần trăm.", "zh-CN", 1, volume);
  };

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : url;
  };

  const handleScanSheets = async (isManualParam?: any) => {
    const isManual = isManualParam === true;
    if (!sheetUrl || !scriptUrl) {
      return;
    }
    setIsScanning(true);
    if (isManual) {
      setScanError(null);
    }
    try {
      const sheetId = extractSheetId(sheetUrl);
      const sheetNames = await googleSheetService.getSheetNames(scriptUrl, sheetId);
      if (sheetNames && sheetNames.length > 0) {
        setAvailableSheets(sheetNames);
        setShowAdvanced(true);
        if (isManual) {
          setScanError(null);
        }

        const findBestMatch = (keywords: string[], fallback: string) => {
          const match = sheetNames.find(name => 
            keywords.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))
          );
          return match || sheetNames[0] || fallback;
        };

        setVocabSheetName(prev => {
          if (sheetNames.includes(prev)) return prev;
          return findBestMatch(["từ vựng", "vocab", "word", "từ"], prev);
        });

        setReadingSheetName(prev => {
          if (sheetNames.includes(prev)) return prev;
          return findBestMatch(["luyện đọc", "reading", "sentence", "đọc"], prev);
        });

        setGrammarSheetName(prev => {
          if (sheetNames.includes(prev)) return prev;
          return findBestMatch(["ngữ pháp", "grammar", "cấu trúc", "sentence"], prev);
        });

        setOcrSheetName(prev => {
          if (sheetNames.includes(prev)) return prev;
          return findBestMatch(["ocr", "quét", "nhật ký", "image"], prev);
        });
      } else {
        if (isManual) {
          setScanError("Không thể tải được danh sách tab. Vui lòng kiểm tra quyền chia sẻ của Google Sheet (Bất kỳ ai có liên kết) và URL Apps Script.");
        }
      }
    } catch (e) {
      console.error(e);
      if (isManual) {
        setScanError("Lỗi kết nối đến Google Apps Script. Vui lòng kiểm tra kỹ URL.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Automatic sheet scanning hook
  useEffect(() => {
    if (sheetUrl && scriptUrl && sheetUrl.startsWith("http") && scriptUrl.startsWith("http")) {
      const delayDebounce = setTimeout(() => {
        handleScanSheets(false);
      }, 1200); // slightly increased delay for better typing response
      return () => clearTimeout(delayDebounce);
    }
  }, [sheetUrl, scriptUrl]);

  const handleSave = () => {
    const cleanSheet = sheetUrl.trim();
    const cleanScript = scriptUrl.trim();
    if (cleanSheet && cleanScript) {
      onSave({ 
        sheetUrl: cleanSheet, 
        scriptUrl: cleanScript,
        vocabSheetName: vocabSheetName.trim() || "từ vựng",
        readingSheetName: readingSheetName.trim() || "luyện đọc",
        grammarSheetName: grammarSheetName.trim() || "ngữ pháp",
        ocrSheetName: ocrSheetName.trim() || "OCR"
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-neutral-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-800">Cấu hình kết nối</h1>
            <p className="text-xs md:text-sm text-neutral-500">Kết nối với Google Sheet để đồng bộ kho dữ liệu tiếng Trung của bạn.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Link Google Sheet</label>
            <input 
              type="text" 
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Link Script (Web App URL)</label>
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>

          {/* Collapsible Advanced Settings for custom sheet selection */}
          <div className="border border-neutral-100 rounded-xl p-3 bg-neutral-50/50">
            <button 
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex justify-between items-center text-sm font-semibold text-neutral-700 py-1"
            >
              <span className="flex items-center gap-2">Chọn Tab (Worksheet) tương tác</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="pt-4 space-y-3 border-t border-neutral-100 mt-2">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleScanSheets(true)}
                    disabled={isScanning}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
                    Dò tìm danh sách tab tự động
                  </button>
                </div>

                {scanError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{scanError}</span>
                  </div>
                )}

                {availableSheets.length > 0 && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg flex items-center gap-1.5 mb-2">
                    <Check className="w-3.5 h-3.5" />
                    Đã tải {availableSheets.length} tab từ file Google Sheet!
                  </div>
                )}

                {/* Vocabulary Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Từ vựng</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={vocabSheetName}
                      onChange={(e) => setVocabSheetName(e.target.value)}
                      placeholder='Mặc định: "từ vựng"'
                      className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    {availableSheets.length > 0 && (
                      <select
                        value={availableSheets.includes(vocabSheetName) ? vocabSheetName : ""}
                        onChange={(e) => {
                          if (e.target.value) setVocabSheetName(e.target.value);
                        }}
                        className="px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm max-w-[150px] focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Chọn tab --</option>
                        {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* Reading Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Luyện đọc</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={readingSheetName}
                      onChange={(e) => setReadingSheetName(e.target.value)}
                      placeholder='Mặc định: "luyện đọc"'
                      className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    {availableSheets.length > 0 && (
                      <select
                        value={availableSheets.includes(readingSheetName) ? readingSheetName : ""}
                        onChange={(e) => {
                          if (e.target.value) setReadingSheetName(e.target.value);
                        }}
                        className="px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm max-w-[150px] focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Chọn tab --</option>
                        {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* Grammar Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Ngữ pháp</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={grammarSheetName}
                      onChange={(e) => setGrammarSheetName(e.target.value)}
                      placeholder='Mặc định: "ngữ pháp"'
                      className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    {availableSheets.length > 0 && (
                      <select
                        value={availableSheets.includes(grammarSheetName) ? grammarSheetName : ""}
                        onChange={(e) => {
                          if (e.target.value) setGrammarSheetName(e.target.value);
                        }}
                        className="px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm max-w-[150px] focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Chọn tab --</option>
                        {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* OCR Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Nhật ký OCR</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={ocrSheetName}
                      onChange={(e) => setOcrSheetName(e.target.value)}
                      placeholder='Mặc định: "OCR"'
                      className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    {availableSheets.length > 0 && (
                      <select
                        value={availableSheets.includes(ocrSheetName) ? ocrSheetName : ""}
                        onChange={(e) => {
                          if (e.target.value) setOcrSheetName(e.target.value);
                        }}
                        className="px-2 py-2 bg-white border border-neutral-200 rounded-lg text-sm max-w-[150px] focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">-- Chọn tab --</option>
                        {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Volume Settings */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Âm lượng phát âm (TTS)</span>
              </label>
              <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                {Math.round(volume * 100)}%
              </span>
            </div>
            
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.05" 
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-1.5">
                {[0.8, 1.0, 1.2, 1.5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleVolumeChange(v)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${Math.abs(volume - v) < 0.03 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    {Math.round(v * 100)}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleTestAudio}
                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                title="Nghe thử mức âm lượng hiện tại"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Nghe thử
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button 
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
            >
              Lưu cấu hình
            </button>
            
            <button 
              onClick={async () => {
                if (window.aistudio) {
                  await window.aistudio.openSelectKey();
                } else {
                  alert("Tính năng này chỉ khả dụng trong môi trường AI Studio.");
                }
              }}
              className="w-full bg-white border border-neutral-200 text-neutral-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Cấu hình API Key cá nhân
            </button>
            
            <div className="text-[11px] text-neutral-400 text-center px-4">
              Nếu bạn gặp lỗi "Quota Exceeded", hãy sử dụng API Key cá nhân từ Google Cloud Project có bật Billing.
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-neutral-100 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                Mã Google Apps Script Chuẩn
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? "Đã chép!" : "Sao chép mã"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Mã Apps Script tiêu chuẩn kết nối trực tiếp với các sheet <b>từ vựng</b>, <b>luyện đọc</b> và <b>ngữ pháp</b> trên Google Sheet của bạn.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-neutral-800 mb-2">Hướng dẫn triển khai:</h3>
            <ul className="text-[11px] text-neutral-600 space-y-1.5 list-disc pl-4">
              <li>Mở file Google Sheet của bạn &gt; <b>Tiện ích mở rộng (Extensions) &gt; Apps Script</b>.</li>
              <li>Bấm <b>"Sao chép mã"</b> ở trên và dán đè toàn bộ vào trình soạn thảo Apps Script.</li>
              <li>Nhấp <b>Triển khai (Deploy) &gt; Quản lý bản triển khai (Manage deployments)</b>.</li>
              <li>Bấm biểu tượng <b>Cây bút (Chỉnh sửa)</b> &gt; chọn Phiên bản: <b>"Phiên bản mới" (New version)</b> &gt; Nhấn <b>Triển khai</b>.</li>
              <li>(Hoặc nếu lần đầu: Triển khai mới &gt; Loại "Ứng dụng web" &gt; Ai có quyền truy cập: "Bất kỳ ai").</li>
              <li>Dán link URL Web App sinh ra vào ô cấu hình ở trên và lưu lại.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
