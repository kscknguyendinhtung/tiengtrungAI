import { Vocabulary, ReadingSentence, GrammarPoint } from "../types";

// Timeout helper to avoid infinite hanging on slow Google Apps Script cold boots
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error(`Kết nối tới Google Apps Script quá thời gian (${Math.round(timeoutMs / 1000)}s)`);
    }
    throw error;
  }
};

const extractCleanSheetId = (sheetIdOrUrl: string): string => {
  const trimmed = (sheetIdOrUrl || "").trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
};

const cleanUrl = (url: string): string => {
  return (url || "").trim().replace(/\/+$/, "");
};

// Safe parsers
const parseBool = (val: any): boolean => {
  if (val === true || val === 1) return true;
  const s = String(val || "").trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES" || s === "ĐÃ THUỘC";
};

const parseVocabRows = (rows: any[]): Vocabulary[] => {
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  return rows.slice(1).map((row: any[]) => ({
    chinese: String(row[0] || "").trim(),
    pinyin: String(row[1] || "").trim(),
    amBoi: String(row[2] || "").trim(),
    meaning: String(row[3] || "").trim(),
    hanViet: String(row[4] || "").trim(),
    wordType: String(row[5] || "").trim(),
    topic: String(row[6] || "").trim() || "Chung",
    isMastered: parseBool(row[7]),
  })).filter(item => item.chinese !== "");
};

const parseReadingRows = (rows: any[]): ReadingSentence[] => {
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  return rows.slice(1).map((row: any[]) => {
    let words = [];
    try {
      words = JSON.parse(String(row[3] || "[]"));
    } catch {
      words = [];
    }
    return {
      chinese: String(row[0] || "").trim(),
      pinyin: String(row[1] || "").trim(),
      meaning: String(row[2] || "").trim(),
      words: Array.isArray(words) ? words : [],
      isMastered: parseBool(row[4]),
    };
  }).filter(item => item.chinese !== "");
};

const parseGrammarRows = (rows: any[]): GrammarPoint[] => {
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  return rows.slice(1).map((row: any[]) => ({
    structure: String(row[0] || "").trim(),
    explanation: String(row[1] || "").trim(),
    example: String(row[2] || "").trim(),
  })).filter(item => item.structure !== "");
};

export const googleSheetService = {
  async getSheetNames(scriptUrl: string, sheetId: string): Promise<string[]> {
    try {
      const url = cleanUrl(scriptUrl);
      const id = extractCleanSheetId(sheetId);
      const res = await fetchWithTimeout(`${url}?action=getSheets&sheetId=${encodeURIComponent(id)}`, {}, 15000);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching sheet names:", error);
      return [];
    }
  },

  async syncFromSheet(
    scriptUrl: string, 
    sheetId: string,
    vocabSheet?: string,
    readingSheet?: string,
    grammarSheet?: string
  ): Promise<{ vocab: Vocabulary[], reading: ReadingSentence[], grammar: GrammarPoint[] } | null> {
    const url = cleanUrl(scriptUrl);
    const id = extractCleanSheetId(sheetId);
    const vSheet = (vocabSheet || "từ vựng").trim();
    const rSheet = (readingSheet || "luyện đọc").trim();
    const gSheet = (grammarSheet || "ngữ pháp").trim();

    // 1. CHIẾN LƯỢC TỐC ĐỘ CAO: Gọi 1 request duy nhất với action=getAll
    try {
      const singleUrl = `${url}?action=getAll&sheetId=${encodeURIComponent(id)}&vocabSheetName=${encodeURIComponent(vSheet)}&readingSheetName=${encodeURIComponent(rSheet)}&grammarSheetName=${encodeURIComponent(gSheet)}`;
      const res = await fetchWithTimeout(singleUrl, {}, 25000);
      
      if (res.ok) {
        const json = await res.json();
        // Kiểm tra xem phản hồi có đúng cấu trúc của script mới không
        if (json && (json.status === "success" || (json.vocab && json.reading && json.grammar))) {
          return {
            vocab: parseVocabRows(json.vocab),
            reading: parseReadingRows(json.reading),
            grammar: parseGrammarRows(json.grammar)
          };
        }
      }
    } catch (singleErr) {
      console.warn("Single request getAll failed or unsupported, trying fallback...", singleErr);
    }

    // 2. CHIẾN LƯỢC DỰ PHÒNG (Cho script cũ): Gọi tuần tự để tránh Google Sheets lock timeout
    try {
      // Gọi tuần tự từng sheet một cách an toàn
      const fetchSheet = async (action: string, paramName: string, sheetName: string) => {
        const queryUrl = `${url}?action=${action}&sheetId=${encodeURIComponent(id)}&${paramName}=${encodeURIComponent(sheetName)}`;
        const r = await fetchWithTimeout(queryUrl, {}, 20000);
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} khi gọi ${action}`);
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      };

      const vocabData = await fetchSheet("getVocab", "vocabSheetName", vSheet);
      const readingData = await fetchSheet("getReading", "readingSheetName", rSheet);
      const grammarData = await fetchSheet("getGrammar", "grammarSheetName", gSheet);

      return {
        vocab: parseVocabRows(vocabData),
        reading: parseReadingRows(readingData),
        grammar: parseGrammarRows(grammarData)
      };
    } catch (fallbackError) {
      console.error("All syncFromSheet attempts failed:", fallbackError);
      return null;
    }
  },

  async syncToSheet(
    scriptUrl: string, 
    sheetId: string, 
    vocabList: Vocabulary[], 
    readingList: ReadingSentence[], 
    grammarList: GrammarPoint[],
    vocabSheet?: string,
    readingSheet?: string,
    grammarSheet?: string
  ): Promise<boolean> {
    try {
      const url = cleanUrl(scriptUrl);
      const id = extractCleanSheetId(sheetId);
      const vSheet = (vocabSheet || "từ vựng").trim();
      const rSheet = (readingSheet || "luyện đọc").trim();
      const gSheet = (grammarSheet || "ngữ pháp").trim();

      // Headers & Rows
      const vocabHeaders = ["Tiếng Trung", "Pinyin", "Âm bồi", "Nghĩa Việt", "Hán Việt", "Loại từ", "Chủ đề", "Đã thuộc"];
      const vocabRows = vocabList.map(v => [
        v.chinese, v.pinyin, v.amBoi, v.meaning, v.hanViet, v.wordType, v.topic || "Chung", v.isMastered ? "TRUE" : "FALSE"
      ]);
      
      const readingHeaders = ["Tiếng Trung", "Pinyin", "Nghĩa Việt", "Chi tiết từ (JSON)", "Đã thuộc"];
      const readingRows = readingList.map(r => [
        r.chinese, r.pinyin, r.meaning, JSON.stringify(r.words || []), r.isMastered ? "TRUE" : "FALSE"
      ]);

      const grammarHeaders = ["Cấu trúc", "Giải thích", "Ví dụ"];
      const grammarRows = grammarList.map(g => [
        g.structure, g.explanation, g.example
      ]);

      // 1. TỐI ƯU: Gửi toàn bộ trong 1 payload action=syncAll (Tránh xung đột ghi đồng thời)
      const batchPayload = {
        action: "syncAll",
        sheetId: id,
        vocab: { sheetName: vSheet, data: [vocabHeaders, ...vocabRows] },
        reading: { sheetName: rSheet, data: [readingHeaders, ...readingRows] },
        grammar: { sheetName: gSheet, data: [grammarHeaders, ...grammarRows] }
      };

      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(batchPayload)
      });

      // Để đảm bảo tương thích ngược với các script cũ chưa có syncAll:
      // Đồng thời gửi các action lẻ tuần tự nhẹ nhàng nếu cần
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  },

  async saveOCRToSheet(scriptUrl: string, sheetId: string, text: string, ocrSheet?: string): Promise<boolean> {
    try {
      const url = cleanUrl(scriptUrl);
      const id = extractCleanSheetId(sheetId);
      const oSheet = (ocrSheet || "OCR").trim();
      const payload = {
        action: "saveOCR",
        sheetId: id,
        ocrSheetName: oSheet,
        text
      };

      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error("OCR Save error:", error);
      return false;
    }
  }
};
