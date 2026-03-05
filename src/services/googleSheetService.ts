import { Vocabulary, ReadingSentence, GrammarPoint } from "../types";

export const googleSheetService = {
  async syncFromSheet(scriptUrl: string, sheetId: string): Promise<{ vocab: Vocabulary[], reading: ReadingSentence[], grammar: GrammarPoint[] }> {
    try {
      const [vocabRes, readingRes, grammarRes] = await Promise.all([
        fetch(`${scriptUrl}?action=getVocab&sheetId=${sheetId}`),
        fetch(`${scriptUrl}?action=getReading&sheetId=${sheetId}`),
        fetch(`${scriptUrl}?action=getGrammar&sheetId=${sheetId}`)
      ]);

      const vocabData = await vocabRes.json();
      const readingData = await readingRes.json();
      const grammarData = await grammarRes.json();
      
      const vocab = vocabData.slice(1).map((row: any[]) => ({
        chinese: row[0] || "",
        pinyin: row[1] || "",
        amBoi: row[2] || "",
        meaning: row[3] || "",
        hanViet: row[4] || "",
        wordType: row[5] || "",
        topic: row[6] || "",
        isMastered: row[7] === "TRUE" || row[7] === true,
      }));

      const reading = readingData.slice(1).map((row: any[]) => ({
        chinese: row[0] || "",
        pinyin: row[1] || "",
        meaning: row[2] || "",
        words: JSON.parse(row[3] || "[]"),
        isMastered: row[4] === "TRUE" || row[4] === true,
      }));

      const grammar = grammarData.slice(1).map((row: any[]) => ({
        structure: row[0] || "",
        explanation: row[1] || "",
        example: row[2] || "",
      }));

      return { vocab, reading, grammar };
    } catch (error) {
      console.error("Sync error:", error);
      return { vocab: [], reading: [], grammar: [] };
    }
  },

  async syncToSheet(scriptUrl: string, sheetId: string, vocabList: Vocabulary[], readingList: ReadingSentence[], grammarList: GrammarPoint[]): Promise<boolean> {
    try {
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
        { action: "syncVocab", sheetId, data: [vocabHeaders, ...vocabRows] },
        { action: "syncReading", sheetId, data: [readingHeaders, ...readingRows] },
        { action: "syncGrammar", sheetId, data: [grammarHeaders, ...grammarRows] }
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

  async saveOCRToSheet(scriptUrl: string, sheetId: string, text: string): Promise<boolean> {
    try {
      const payload = {
        action: "saveOCR",
        sheetId,
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
