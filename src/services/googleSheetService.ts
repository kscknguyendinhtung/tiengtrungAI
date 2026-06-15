import { Vocabulary, ReadingSentence, GrammarPoint } from "../types";

export const googleSheetService = {
  async getSheetNames(scriptUrl: string, sheetId: string): Promise<string[]> {
    try {
      const res = await fetch(`${scriptUrl}?action=getSheets&sheetId=${sheetId}`);
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
    try {
      const vSheet = vocabSheet || "từ vựng";
      const rSheet = readingSheet || "luyện đọc";
      const gSheet = grammarSheet || "ngữ pháp";

      const [vocabRes, readingRes, grammarRes] = await Promise.all([
        fetch(`${scriptUrl}?action=getVocab&sheetId=${sheetId}&vocabSheetName=${encodeURIComponent(vSheet)}`),
        fetch(`${scriptUrl}?action=getReading&sheetId=${sheetId}&readingSheetName=${encodeURIComponent(rSheet)}`),
        fetch(`${scriptUrl}?action=getGrammar&sheetId=${sheetId}&grammarSheetName=${encodeURIComponent(gSheet)}`)
      ]);

      if (!vocabRes.ok || !readingRes.ok || !grammarRes.ok) {
        throw new Error("HTTP responses were not all OK");
      }

      const vocabData = await vocabRes.json();
      const readingData = await readingRes.json();
      const grammarData = await grammarRes.json();

      if (!Array.isArray(vocabData) || !Array.isArray(readingData) || !Array.isArray(grammarData)) {
        throw new Error("Parsed data from sheets is not in expected table row format");
      }
      
      const vocab = vocabData.slice(1).map((row: any[]) => ({
        chinese: row[0] || "",
        pinyin: row[1] || "",
        amBoi: row[2] || "",
        meaning: row[3] || "",
        hanViet: row[4] || "",
        wordType: row[5] || "",
        topic: row[6] || "",
        isMastered: row[7] === "TRUE" || row[7] === true,
      })).filter(item => item.chinese && item.chinese.trim() !== "");

      const reading = readingData.slice(1).map((row: any[]) => {
        let words = [];
        try {
          words = JSON.parse(row[3] || "[]");
        } catch (e) {}
        return {
          chinese: row[0] || "",
          pinyin: row[1] || "",
          meaning: row[2] || "",
          words,
          isMastered: row[4] === "TRUE" || row[4] === true,
        };
      }).filter(item => item.chinese && item.chinese.trim() !== "");

      const grammar = grammarData.slice(1).map((row: any[]) => ({
        structure: row[0] || "",
        explanation: row[1] || "",
        example: row[2] || "",
      })).filter(item => item.structure && item.structure.trim() !== "");

      return { vocab, reading, grammar };
    } catch (error) {
      console.error("Sync error:", error);
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
      const vSheet = vocabSheet || "từ vựng";
      const rSheet = readingSheet || "luyện đọc";
      const gSheet = grammarSheet || "ngữ pháp";

      // Sync Vocab
      const vocabHeaders = ["Tiếng Trung", "Pinyin", "Âm bồi", "Nghĩa Việt", "Hán Việt", "Loại từ", "Chủ đề", "Đã thuộc"];
      const vocabRows = vocabList.map(v => [
        v.chinese, v.pinyin, v.amBoi, v.meaning, v.hanViet, v.wordType, v.topic, v.isMastered ? "TRUE" : "FALSE"
      ]);
      
      // Sync Reading
      const readingHeaders = ["Tiếng Trung", "Pinyin", "Nghĩa Việt", "Chi tiết từ (JSON)", "Đã thuộc"];
      const readingRows = readingList.map(r => [
        r.chinese, r.pinyin, r.meaning, JSON.stringify(r.words), r.isMastered ? "TRUE" : "FALSE"
      ]);

      // Sync Grammar
      const grammarHeaders = ["Cấu trúc", "Giải thích", "Ví dụ"];
      const grammarRows = grammarList.map(g => [
        g.structure, g.explanation, g.example
      ]);

      const payloads = [
        { action: "syncVocab", sheetId, vocabSheetName: vSheet, data: [vocabHeaders, ...vocabRows] },
        { action: "syncReading", sheetId, readingSheetName: rSheet, data: [readingHeaders, ...readingRows] },
        { action: "syncGrammar", sheetId, grammarSheetName: gSheet, data: [grammarHeaders, ...grammarRows] }
      ];

      await Promise.all(payloads.map(payload => 
        fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify(payload)
        })
      ));
      
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  },

  async saveOCRToSheet(scriptUrl: string, sheetId: string, text: string, ocrSheet?: string): Promise<boolean> {
    try {
      const oSheet = ocrSheet || "OCR";
      const payload = {
        action: "saveOCR",
        sheetId,
        ocrSheetName: oSheet,
        text
      };

      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error("OCR Save error:", error);
      return false;
    }
  }
};

