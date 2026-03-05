import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Vocabulary, GrammarPoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async performOCR(base64Image: string): Promise<OCRResult> {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze this image containing Chinese text. 
      1. Extract all text (OCR).
      2. Split the text into meaningful sentences for learning.
      3. For each sentence, provide Pinyin and Vietnamese translation.
      4. For each character in each sentence, provide its "Phiên âm bồi" (Vietnamese phonetic approximation) and basic Vietnamese meaning.
      
      Quy tắc "Phiên âm bồi":
      - Không dùng Pinyin chuẩn (ví dụ: không dùng 'Nǐ hǎo').
      - Sử dụng hoàn toàn bằng chữ cái và dấu thanh của tiếng Việt để mô tả âm thanh nghe được (ví dụ: 'Ní hảo').
      - Ưu tiên các từ gần gũi với cách phát âm của người Việt nhưng vẫn giữ được âm gốc của tiếng Trung.
      - q (bật hơi) -> ghi là "chi" hoặc "khia" (Ví dụ: Quán -> Choán)
      - x -> ghi là "xi" (Ví dụ: Xièxie -> Xiê xỉe)
      - zh/ch -> ghi là "tr" (Ví dụ: Zhōngguó -> Trung cuố)
      - r -> ghi là "r" hoặc "l" (Ví dụ: Rén -> Rấn)

      5. Extract a list of unique individual words/vocabulary items found in the text.

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
        "words": ["string"]
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

      return JSON.parse(response.text || "{}") as OCRResult;
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw error;
    }
  },

  async enrichVocabulary(word: string): Promise<Partial<Vocabulary>> {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Bạn hãy đóng vai một chuyên gia ngôn ngữ giúp tôi phân tích từ tiếng Trung: "${word}".
      
      Quy tắc "Phiên âm bồi":
      - Không dùng Pinyin chuẩn (ví dụ: không dùng 'Nǐ hǎo').
      - Sử dụng hoàn toàn bằng chữ cái và dấu thanh của tiếng Việt để mô tả âm thanh nghe được (ví dụ: 'Ní hảo').
      - Ưu tiên các từ gần gũi với cách phát âm của người Việt nhưng vẫn giữ được âm gốc của tiếng Trung.
      - q (bật hơi) -> ghi là "chi" hoặc "khia" (Ví dụ: Quán -> Choán)
      - x -> ghi là "xi" (Ví dụ: Xièxie -> Xiê xỉe)
      - zh/ch -> ghi là "tr" (Ví dụ: Zhōngguó -> Trung cuố)
      - r -> ghi là "r" hoặc "l" (Ví dụ: Rén -> Rấn)

      Hãy phân tích: pinyin, phiên âm bồi (amBoi), nghĩa (meaning), hán việt (hanViet), chủ đề (topic), loại từ (wordType).

      Các giá trị gợi ý cho loại từ (wordType): Động từ, Tính từ, Danh từ, Liên từ, Lượng từ, Nghi vấn từ, Trợ động từ, Trợ từ, Đại từ, Trạng từ, Giới từ.
      Các giá trị gợi ý cho chủ đề (topic): sản xuất, cảm nghĩ từ, nhân sự, mức độ từ, phương hướng từ, kinh doanh, Phương hướng, Thời gian, chất lượng.

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

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini Enrich Error:", error);
      return { chinese: word };
    }
  },

  async analyzeGrammar(text: string): Promise<GrammarPoint[]> {
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
  }
};
