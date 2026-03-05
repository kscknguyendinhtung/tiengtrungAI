import { useState } from "react";
import { AppConfig } from "../types";
import { Settings, ExternalLink, RefreshCw, Key } from "lucide-react";

interface Props {
  onSave: (config: AppConfig) => void;
  onSync: () => void;
}

export default function ConfigScreen({ onSave, onSync }: Props) {
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1wdRVB4pEoc3ohZEjZkriGcK9UjatbvmwogKIKp2GlCE/edit?usp=sharing");
  const [scriptUrl, setScriptUrl] = useState("https://script.google.com/macros/s/AKfycbxu9URxC4bXmvOqvQm9UwFif-exNAeCCnyY24D7IGhApERVNq7MK-llc2tX0iIa7IEzHg/exec");

  const handleSave = () => {
    if (sheetUrl && scriptUrl) {
      onSave({ sheetUrl, scriptUrl });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Cấu hình</h1>
            <p className="text-sm text-neutral-500 text-balance">Kết nối với Google Sheet để lưu trữ dữ liệu.</p>
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

          <div className="pt-4 space-y-3">
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
            
            <div className="text-xs text-neutral-400 text-center px-4">
              Nếu bạn gặp lỗi "Quota Exceeded", hãy sử dụng API Key cá nhân từ Google Cloud Project có bật Billing.
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-800 mb-2">Hướng dẫn nhanh:</h3>
          <ul className="text-xs text-neutral-500 space-y-2 list-disc pl-4">
            <li>Tạo Google Sheet mới, đặt tên các tab là "OCR" và "từ vựng".</li>
            <li>Mở Extensions {">"} Apps Script, dán code script được cung cấp.</li>
            <li>Deploy {">"} New Deployment {">"} Web App.</li>
            <li>Copy URL Web App dán vào ô trên.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
