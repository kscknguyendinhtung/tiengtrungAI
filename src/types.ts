export interface Vocabulary {
  chinese: string;
  pinyin: string;
  amBoi: string;
  meaning: string;
  hanViet: string;
  wordType: string;
  topic: string;
  isMastered: boolean;
  id?: string;
}

export interface OCRResult {
  originalText: string;
  sentences: ReadingSentence[];
  words: Vocabulary[];
}

export interface ReadingSentence {
  chinese: string;
  pinyin: string;
  meaning: string;
  words: ReadingWord[];
  isMastered: boolean;
}

export interface ReadingWord {
  char: string;
  amBoi: string;
  meaning: string;
}

export interface GrammarPoint {
  structure: string;
  explanation: string;
  example: string;
}

export interface GrammarQuizQuestion {
  type: "multiple-choice" | "ordering";
  question: string; // The sentence with a blank (multiple-choice) OR the full sentence (ordering)
  pinyin: string;   // Pinyin for the question sentence
  options: string[]; // 4 options (multiple-choice) OR scrambled words (ordering)
  optionPinyins?: string[]; // Pinyin for each option (multiple-choice)
  answer: string;    // The correct option (multiple-choice) OR the correct full sentence (ordering)
  explanation: string; // Why this is the answer
}

export interface AppConfig {
  sheetUrl: string;
  scriptUrl: string;
}
