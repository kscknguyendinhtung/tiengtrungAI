import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Mic, 
  MicOff, 
  MessageSquare, 
  Volume2, 
  VolumeX,
  RefreshCw,
  User,
  Bot,
  X,
  Play,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Modality } from "@google/genai";

interface Message {
  role: "user" | "model";
  text: string;
  pinyin?: string;
  meaning?: string;
}

export default function ChatTab({ onError }: { onError: (error: any) => void | Promise<any>; key?: string }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("chat_history");
    return saved ? JSON.parse(saved) : [
      { 
        role: "model", 
        text: "Chào bạn! Tôi là người bạn Trung Quốc của bạn. Chúng ta hãy cùng trò chuyện bằng tiếng Trung nhé!",
        pinyin: "Nǐ hǎo! Wǒ shì nǐ de Zhōngguó péngyǒu. Wǒmen ràng wǒmen yòng Zhōngwén liáotiān ba!",
        meaning: "Chào bạn! Tôi là người bạn Trung Quốc của bạn. Hãy để chúng ta trò chuyện bằng tiếng Trung nhé!"
      }
    ];
  });
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAutoSpeak, setIsAutoSpeak] = useState(() => {
    return localStorage.getItem("auto_speak") === "true";
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<number>(-1);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("chat_history", JSON.stringify(messages));
    localStorage.setItem("auto_speak", String(isAutoSpeak));

    if (isAutoSpeak && messages.length > 0) {
      const lastIndex = messages.length - 1;
      const lastMsg = messages[lastIndex];
      // Only speak if it's a model message and we haven't spoken this specific index yet
      if (lastMsg.role === "model" && lastSpokenRef.current !== lastIndex) {
        speak(lastMsg.text);
        lastSpokenRef.current = lastIndex;
      }
    }
  }, [messages, isAutoSpeak]);

  const clearChat = () => {
    const initialMsg: Message = { 
      role: "model", 
      text: "Chào bạn! Tôi là người bạn Trung Quốc của bạn. Chúng ta hãy cùng trò chuyện bằng tiếng Trung nhé!",
      pinyin: "Nǐ hǎo! Wǒ shì nǐ de Zhōngguó péngyǒu. Wǒmen ràng wǒmen yòng Zhōngwén liáotiān ba!",
      meaning: "Chào bạn! Tôi là người bạn Trung Quốc của bạn. Hãy để chúng ta trò chuyện bằng tiếng Trung nhé!"
    };
    setMessages([initialMsg]);
    lastSpokenRef.current = 0; // Set to 0 because we don't want to auto-speak the initial message again on clear
    localStorage.removeItem("chat_history");
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;
    
    const userMsg: Message = { role: "user", text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: [...messages, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `Bạn là một người bạn Trung Quốc thân thiện tên là Tiểu Minh. 
          Khi người dùng gửi tin nhắn (có thể là tiếng Trung hoặc tiếng Việt), hãy phản hồi bằng tiếng Trung một cách tự nhiên.
          
          QUAN TRỌNG: Bạn PHẢI trả về phản hồi dưới dạng JSON cho CẢ tin nhắn của người dùng vừa gửi và phản hồi của bạn.
          Cấu trúc JSON:
          {
            "userMessage": {
              "chinese": "Câu tiếng Trung tương ứng với những gì người dùng nói (nếu người dùng nói tiếng Việt thì dịch sang tiếng Trung, nếu nói tiếng Trung thì giữ nguyên)",
              "pinyin": "Pinyin của câu tiếng Trung đó",
              "meaning": "Nghĩa tiếng Việt của câu đó"
            },
            "modelResponse": {
              "chinese": "Câu trả lời của bạn bằng tiếng Trung",
              "pinyin": "Pinyin của câu trả lời đó",
              "meaning": "Nghĩa tiếng Việt của câu trả lời đó"
            }
          }
          
          Hãy đối đáp tự nhiên, khuyến khích người dùng nói tiếng Trung nhiều hơn. Đừng chỉ dịch, hãy đặt câu hỏi và dẫn dắt câu chuyện.`,
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || "{}");
      
      if (result.userMessage && result.modelResponse) {
        setMessages(prev => {
          const newMessages = [...prev];
          // Update the last user message with pinyin and meaning
          if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "user") {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              text: result.userMessage.chinese,
              pinyin: result.userMessage.pinyin,
              meaning: result.userMessage.meaning
            };
          }
          // Add model response
          newMessages.push({
            role: "model",
            text: result.modelResponse.chinese,
            pinyin: result.modelResponse.pinyin,
            meaning: result.modelResponse.meaning
          });
          return newMessages;
        });
      }
    } catch (error) {
      onError(error);
    } finally {
      setIsSending(false);
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Small delay to ensure browser speech engine is ready
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9; // Slightly slower for better clarity
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 relative overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-neutral-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800">Tiểu Minh (AI)</h3>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Đang trực tuyến</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAutoSpeak(!isAutoSpeak)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              isAutoSpeak 
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                : "bg-neutral-100 text-neutral-500 border border-neutral-200"
            }`}
            title={isAutoSpeak ? "Tắt tự động đọc" : "Bật tự động đọc"}
          >
            {isAutoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {isAutoSpeak ? "Auto On" : "Auto Off"}
          </button>
          <button 
            onClick={clearChat}
            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Xoá lịch sử chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm space-y-2 relative group ${
              msg.role === "user" 
                ? "bg-emerald-600 text-white rounded-tr-none" 
                : "bg-white text-neutral-800 rounded-tl-none border border-neutral-100"
            }`}>
              <div className="flex items-center justify-between gap-2 opacity-70">
                <div className="flex items-center gap-2">
                  {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {msg.role === "user" ? "Bạn" : "Tiểu Minh"}
                  </span>
                </div>
                <button 
                  onClick={() => speak(msg.text)}
                  className={`p-1 rounded-full transition-all ${
                    msg.role === "user" ? "hover:bg-white/20 text-white" : "hover:bg-neutral-100 text-emerald-600"
                  }`}
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="text-lg font-bold leading-tight">{msg.text}</div>
                {msg.pinyin && (
                  <div className={`text-xs font-medium italic ${msg.role === "user" ? "text-emerald-100" : "text-emerald-600"}`}>
                    {msg.pinyin}
                  </div>
                )}
                {msg.meaning && (
                  <div className={`text-xs border-t pt-1 mt-1 ${msg.role === "user" ? "border-white/20 text-white/80" : "border-neutral-100 text-neutral-500"}`}>
                    {msg.meaning}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-neutral-100 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-neutral-200 sticky bottom-0">
        <div className="flex gap-2 bg-neutral-100 p-2 rounded-2xl border border-neutral-200 focus-within:border-emerald-500 transition-all">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Nhập tiếng Trung hoặc tiếng Việt..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-base px-2"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
