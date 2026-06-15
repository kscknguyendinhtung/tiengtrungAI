import { useState, useEffect } from "react";
import { AppConfig } from "../types";
import { Settings, RefreshCw, Key, ChevronDown, ChevronUp, Check, AlertCircle } from "lucide-react";
import { googleSheetService } from "../services/googleSheetService";

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

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : url;
  };

  const handleScanSheets = async () => {
    if (!sheetUrl || !scriptUrl) {
      return;
    }
    setIsScanning(true);
    setScanError(null);
    try {
      const sheetId = extractSheetId(sheetUrl);
      const sheetNames = await googleSheetService.getSheetNames(scriptUrl, sheetId);
      if (sheetNames && sheetNames.length > 0) {
        setAvailableSheets(sheetNames);
        setShowAdvanced(true);

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
        setScanError("Không thể tải được danh sách tab. Vui lòng kiểm tra quyền chia sẻ của Google Sheet (Bất kỳ ai có liên kết) và URL Apps Script.");
      }
    } catch (e) {
      console.error(e);
      setScanError("Lỗi kết nối đến Google Apps Script. Vui lòng kiểm tra kỹ URL.");
    } finally {
      setIsScanning(false);
    }
  };

  // Automatic sheet scanning hook
  useEffect(() => {
    if (sheetUrl && scriptUrl && sheetUrl.startsWith("http") && scriptUrl.startsWith("http")) {
      const delayDebounce = setTimeout(() => {
        handleScanSheets();
      }, 800);
      return () => clearTimeout(delayDebounce);
    }
  }, [sheetUrl, scriptUrl]);

  const handleSave = () => {
    if (sheetUrl && scriptUrl) {
      onSave({ 
        sheetUrl, 
        scriptUrl,
        vocabSheetName,
        readingSheetName,
        grammarSheetName,
        ocrSheetName
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
                    onClick={handleScanSheets}
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
                  <select
                    value={vocabSheetName}
                    onChange={(e) => {
                      if (e.target.value) setVocabSheetName(e.target.value);
                    }}
                    disabled={isScanning}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                  >
                    {availableSheets.length > 0 ? (
                      availableSheets.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                        <option value="từ vựng">từ vựng (Mặc định)</option>
                        <option value="">-- Đang quét danh sách tab... --</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Reading Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Luyện đọc</label>
                  <select
                    value={readingSheetName}
                    onChange={(e) => {
                      if (e.target.value) setReadingSheetName(e.target.value);
                    }}
                    disabled={isScanning}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                  >
                    {availableSheets.length > 0 ? (
                      availableSheets.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                        <option value="luyện đọc">luyện đọc (Mặc định)</option>
                        <option value="">-- Đang quét danh sách tab... --</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Grammar Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Ngữ pháp</label>
                  <select
                    value={grammarSheetName}
                    onChange={(e) => {
                      if (e.target.value) setGrammarSheetName(e.target.value);
                    }}
                    disabled={isScanning}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                  >
                    {availableSheets.length > 0 ? (
                      availableSheets.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                        <option value="ngữ pháp">ngữ pháp (Mặc định)</option>
                        <option value="">-- Đang quét danh sách tab... --</option>
                      </>
                    )}
                  </select>
                </div>

                {/* OCR Tab */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tab Nhật ký OCR</label>
                  <select
                    value={ocrSheetName}
                    onChange={(e) => {
                      if (e.target.value) setOcrSheetName(e.target.value);
                    }}
                    disabled={isScanning}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                  >
                    {availableSheets.length > 0 ? (
                      availableSheets.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                        <option value="OCR">OCR (Mặc định)</option>
                        <option value="">-- Đang quét danh sách tab... --</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}
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

        <div className="mt-6 pt-5 border-t border-neutral-100">
          <h3 className="text-xs font-bold text-neutral-800 mb-2">Hướng dẫn chi tiết:</h3>
          <ul className="text-[11px] text-neutral-500 space-y-1.5 list-disc pl-4">
            <li>Tạo một file Google Sheet mới.</li>
            <li>Tại Google Sheet, mở <b>Extensions &gt; Apps Script</b>.</li>
            <li>Dán toàn bộ nội dung trong file <b>google-script.gs</b> (bên dưới) vào trình soạn thảo.</li>
            <li>Nhấp <b>Deploy &gt; New Deployment</b>, chọn loại là <b>Web App</b>.</li>
            <li>Đặt quyền truy cập: "Execute as: Me" và "Who has access: Anyone".</li>
            <li>Sao chép URL Web App vừa sinh ra dán vào ô trên.</li>
            <li>Click mở panel "Chọn Tab tương tác" để kiểm tra dải sheet có trong file.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
