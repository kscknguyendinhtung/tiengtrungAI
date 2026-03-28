import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Vocabulary, GrammarPoint, GrammarQuizQuestion } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

export const geminiService = {
  async performOCR(base64Image: string): Promise<OCRResult> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze this image containing Chinese text. 
      1. Extract all text (OCR).
      2. Split the text into meaningful sentences for learning.
      3. For each sentence, group characters into meaningful compound words (từ ghép) where applicable. Do not just list individual characters if they form a word together.
      4. For each sentence, provide Pinyin and Vietnamese translation.
      5. For each grouped word (từ ghép) in each sentence, provide its "Phiên âm bồi" (Vietnamese phonetic approximation) and basic Vietnamese meaning.
      
      Quy tắc "Phiên âm bồi":
      - Không dùng Pinyin chuẩn (ví dụ: không dùng 'Nǐ hǎo').
      - Sử dụng hoàn toàn bằng chữ cái và dấu thanh của tiếng Việt để mô tả âm thanh nghe được (ví dụ: 'Ní hảo').
      - Ưu tiên các từ gần gũi với cách phát âm của người Việt nhưng vẫn giữ được âm gốc của tiếng Trung.
      - q (bật hơi) -> ghi là "chi" hoặc "khia" (Ví dụ: Quán -> Choán)
      - x -> ghi là "xi" (Ví dụ: Xièxie -> Xiê xỉe)
      - zh/ch -> ghi là "tr" (Ví dụ: Zhōngguó -> Trung cuố)
      - r -> ghi là "r" hoặc "l" (Ví dụ: Rén -> Rấn)

      5. Extract an EXHAUSTIVE list of all unique vocabulary items found in the text. 
      6. IMPORTANT: You must extract EVERY meaningful word, especially technical terms, professional jargon (related to manufacturing, production, quality, personnel, business, etc.), verbs, nouns, and adjectives. 
      7. Aim for a comprehensive list (e.g., 15-30 words if the text is long). Do not be lazy.
      8. For each vocabulary item, provide FULL details: pinyin, phiên âm bồi (amBoi), nghĩa (meaning), hán việt (hanViet), chủ đề (topic), loại từ (wordType).
      
      Quy tắc phân loại:
      - Loại từ (wordType): Có thể là Động từ, Tính từ, Danh từ, Liên từ, Lượng từ, Nghi vấn từ, Trợ động từ, Trợ từ, Đại từ, Trạng từ, Giới từ, Thời gian, cảm nghĩ từ, mức độ từ, phương hướng từ... hoặc tự định nghĩa nếu cần.
      - Chủ đề (topic): Có thể là sản xuất, nhân sự, kinh doanh, chất lượng, Phương hướng, Thời gian... hoặc tự định nghĩa linh động theo ngữ cảnh.
      
      Return the result in JSON format matching this structure:
      {
        "originalText": "string",
        "sentences": [
          {
            "chinese": "string",
            "pinyin": "string",
            "meaning": "string",
            "words": [
              { "char": "string", "amBoi": "string", "meaning": "string" }
            ]
          }
        ],
        "words": [
          {
            "chinese": "string",
            "pinyin": "string",
            "amBoi": "string",
            "meaning": "string",
            "hanViet": "string",
            "wordType": "string",
            "topic": "string"
          }
        ]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { inlineData: { data: base64Image.split(",")[1], mimeType: "image/jpeg" } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || "{}") as OCRResult;
      // Ensure all word objects have required fields
      if (result.words) {
        result.words = result.words.map(w => ({
          ...w,
          isMastered: false,
          topic: w.topic || "Chung",
          wordType: w.wordType || "Chưa phân loại"
        }));
      }
      return result;
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw error;
    }
  },

  async extractVocabularyFromText(text: string): Promise<Vocabulary[]> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Phân tích đoạn văn tiếng Trung sau và trích xuất danh sách từ vựng quan trọng: "${text}".
      
      Yêu cầu:
      1. Trích xuất TẤT CẢ các từ vựng có nghĩa (từ đơn và từ ghép).
      2. Với mỗi từ, cung cấp đầy đủ: pinyin, phiên âm bồi (amBoi), nghĩa (meaning), hán việt (hanViet), chủ đề (topic), loại từ (wordType).
      3. KHÔNG ĐƯỢC để trống bất kỳ trường nào. Nếu không rõ, hãy suy luận dựa trên ngữ cảnh.
      
      Quy tắc "Phiên âm bồi":
      - Sử dụng hoàn toàn bằng chữ cái và dấu thanh của tiếng Việt để mô tả âm thanh (Ví dụ: 'Ní hảo').
      
      Trả về JSON array các đối tượng Vocabulary:
      [
        {
          "chinese": "string",
          "pinyin": "string",
          "amBoi": "string",
          "meaning": "string",
          "hanViet": "string",
          "wordType": "string",
          "topic": "string"
        }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const words = JSON.parse(response.text || "[]") as Vocabulary[];
      return words.map(w => ({ ...w, isMastered: false }));
    } catch (error) {
      console.error("Gemini Text Extraction Error:", error);
      return [];
    }
  },

  async enrichVocabulary(word: string): Promise<Partial<Vocabulary>> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Phân tích chi tiết từ tiếng Trung: "${word}".
      Yêu cầu: Cung cấp đầy đủ pinyin, phiên âm bồi (amBoi), nghĩa (meaning), hán việt (hanViet), chủ đề (topic), loại từ (wordType).
      KHÔNG ĐƯỢC để trống bất kỳ trường nào. Hãy cung cấp thông tin chính xác và đầy đủ nhất.
      
      Return JSON:
      {
        "chinese": "${word}",
        "pinyin": "string",
        "amBoi": "string",
        "meaning": "string",
        "hanViet": "string",
        "wordType": "string",
        "topic": "string"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "{}");
      return {
        ...data,
        chinese: word,
        isMastered: false
      };
    } catch (error) {
      console.error("Gemini Enrich Error:", error);
      return { chinese: word, isMastered: false };
    }
  },

  async analyzeGrammar(text: string): Promise<GrammarPoint[]> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Hãy phân tích ngữ pháp tiếng Trung đơn giản cho đoạn văn sau: "${text}".
      
      Yêu cầu:
      1. Tìm 2-3 cấu trúc ngữ pháp quan trọng nhất xuất hiện trong đoạn văn.
      2. Giải thích ngắn gọn bằng tiếng Việt.
      3. Lấy ví dụ minh họa TRỰC TIẾP từ chính đoạn văn trên (nếu có) hoặc ví dụ tương tự cực kỳ đơn giản.
      4. Cung cấp Pinyin cho các chữ Hán trong phần giải thích và ví dụ.
      
      Trả về JSON array:
      [
        { "structure": "string", "explanation": "string", "example": "string" }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Gemini Grammar Error:", error);
      return [];
    }
  },

  async performGrammarOCR(base64Image: string): Promise<GrammarPoint[]> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Phân tích hình ảnh chứa kiến thức ngữ pháp tiếng Trung sau.
      
      Yêu cầu:
      1. Trích xuất các cấu trúc ngữ pháp quan trọng nhất xuất hiện trong ảnh.
      2. Với mỗi cấu trúc, cung cấp:
         - structure: Tên cấu trúc (Ví dụ: "S + V + O").
         - explanation: Giải thích cách dùng bằng tiếng Việt.
         - example: Một ví dụ minh họa đơn giản (có kèm Pinyin).
      
      Trả về JSON array các đối tượng GrammarPoint:
      [
        { "structure": "string", "explanation": "string", "example": "string" }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { inlineData: { data: base64Image.split(",")[1], mimeType: "image/jpeg" } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Gemini Grammar OCR Error:", error);
      return [];
    }
  },

  async generateGrammarQuiz(points: GrammarPoint[]): Promise<GrammarQuizQuestion[]> {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const prompt = `
      Dựa trên danh sách các cấu trúc ngữ pháp sau, hãy tạo 5 câu hỏi trắc nghiệm để kiểm tra kiến thức:
      ${JSON.stringify(points)}
      
      Yêu cầu:
      1. Mỗi câu hỏi phải tập trung vào một cấu trúc ngữ pháp cụ thể.
      2. Bao gồm 2 loại câu hỏi:
         - "multiple-choice": Một câu tiếng Trung có chỗ trống (___). Cung cấp 4 lựa chọn (options) và Pinyin cho từng lựa chọn (optionPinyins).
         - "ordering": Một câu tiếng Trung hoàn chỉnh nhưng bị xáo trộn các từ/cụm từ. Cung cấp danh sách các từ bị xáo trộn trong "options". "answer" là câu hoàn chỉnh đúng.
      3. Cung cấp Pinyin cho câu hỏi (question) và đáp án (answer).
      4. Giải thích ngắn gọn tại sao chọn đáp án đó (explanation).
      
      Trả về JSON array các đối tượng GrammarQuizQuestion:
      [
        {
          "type": "multiple-choice" | "ordering",
          "question": "string",
          "pinyin": "string",
          "options": ["string", "string", "string", "string"],
          "optionPinyins": ["string", "string", "string", "string"], // Chỉ dành cho multiple-choice
          "answer": "string",
          "explanation": "string"
        }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Gemini Quiz Generation Error:", error);
      return [];
    }
  }
};
