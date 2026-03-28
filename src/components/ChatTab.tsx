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
}

export default function ChatTab({ onError }: { onError: (error: any) => void }) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Chào bạn! Tôi là người bạn Trung Quốc của bạn. Chúng ta hãy cùng trò chuyện bằng tiếng Trung nhé! 你好！我是你的中国朋友。让我们用中文聊天吧！" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
  const [transcription, setTranscription] = useState("");
  const [aiTranscription, setAiTranscription] = useState("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcription, aiTranscription]);

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
        model: "gemini-3-flash-preview",
        contents: [...messages, userMsg].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: "Bạn là một người bạn Trung Quốc thân thiện, trò chuyện với người dùng bằng tiếng Trung (có kèm Pinyin và dịch tiếng Việt nếu cần thiết để hỗ trợ học tập). Hãy đối đáp tự nhiên, khuyến khích người dùng nói tiếng Trung nhiều hơn. Đừng chỉ dịch, hãy đặt câu hỏi và dẫn dắt câu chuyện."
        }
      });

      const modelMsg: Message = { role: "model", text: response.text || "" };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      onError(error);
    } finally {
      setIsSending(false);
    }
  };

  // Live API Implementation
  const startLiveSession = async () => {
    setLiveStatus("connecting");
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "Bạn là một người bạn Trung Quốc tên là Tiểu Minh. Hãy trò chuyện trực tiếp với người dùng bằng tiếng Trung một cách tự nhiên. Đừng dịch, hãy đối đáp như hai người bạn đang tán gẫu. Nếu người dùng nói sai, hãy sửa một cách nhẹ nhàng. Luôn trả lời bằng tiếng Trung.",
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setLiveStatus("active");
            setIsLiveActive(true);
            setupAudioCapture();
          },
          onmessage: async (message: any) => {
            // Handle audio output
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playAudioChunk(base64Audio);
            }
            
            // Handle transcription
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setAiTranscription(prev => prev + " " + message.serverContent.modelTurn.parts[0].text);
            }

            if (message.serverContent?.interrupted) {
              stopAudioPlayback();
            }
            
            if (message.serverContent?.turnComplete) {
              // Turn finished
            }
          },
          onclose: () => {
            stopLiveSession();
          },
          onerror: (error: any) => {
            console.error("Live API Error:", error);
            setLiveStatus("error");
            stopLiveSession();
          }
        }
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      setLiveStatus("error");
      onError(error);
    }
  };

  const stopLiveSession = () => {
    setIsLiveActive(false);
    setLiveStatus("idle");
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    stopAudioPlayback();
  };

  const setupAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (!sessionRef.current || liveStatus !== "active") return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Convert to Base64
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Audio capture error:", error);
      onError(error);
    }
  };

  const playAudioChunk = (base64Data: string) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    audioQueueRef.current.push(pcmData);
    
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, 16000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => processAudioQueue();
    source.start();
  };

  const stopAudioPlayback = () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 relative overflow-hidden">
      {/* Mode Switcher */}
      <div className="p-4 bg-white border-b border-neutral-200 flex gap-2 sticky top-0 z-10">
        <button 
          onClick={() => {
            if (isLiveActive) stopLiveSession();
            setMode("text");
          }}
          className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            mode === "text" ? "bg-emerald-600 text-white shadow-lg" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          Chatbox
        </button>
        <button 
          onClick={() => setMode("voice")}
          className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            mode === "voice" ? "bg-emerald-600 text-white shadow-lg" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          <Mic className="w-5 h-5" />
          Live Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === "text" ? (
          <>
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  msg.role === "user" 
                    ? "bg-emerald-600 text-white rounded-tr-none" 
                    : "bg-white text-neutral-800 rounded-tl-none border border-neutral-100"
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-70">
                    {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {msg.role === "user" ? "Bạn" : "Tiểu Minh"}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                </div>
              </motion.div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-neutral-100 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-8 py-12">
            <div className="relative">
              <motion.div 
                animate={isLiveActive ? { scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -inset-8 bg-emerald-600 rounded-full blur-3xl opacity-20"
              />
              <motion.div 
                animate={isLiveActive ? { rotate: 360 } : {}}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                className={`w-48 h-48 rounded-full border-4 border-dashed flex items-center justify-center ${
                  isLiveActive ? "border-emerald-500" : "border-neutral-200"
                }`}
              >
                <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                  isLiveActive ? "bg-emerald-600 text-white" : "bg-white text-neutral-300"
                }`}>
                  {isLiveActive ? <Volume2 className="w-20 h-20" /> : <Mic className="w-20 h-20" />}
                </div>
              </motion.div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-neutral-800">
                {liveStatus === "active" ? "Đang trò chuyện..." : "Trò chuyện trực tiếp"}
              </h3>
              <p className="text-neutral-500 max-w-xs mx-auto text-sm">
                {liveStatus === "active" 
                  ? "Hãy nói bất cứ điều gì bằng tiếng Trung với Tiểu Minh." 
                  : "Trò chuyện trực tiếp với AI như một người bạn bản xứ."}
              </p>
            </div>

            <div className="w-full max-w-sm bg-white p-6 rounded-[2.5rem] shadow-xl border border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Trạng thái</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    liveStatus === "active" ? "bg-emerald-500 animate-pulse" : 
                    liveStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-neutral-300"
                  }`} />
                  <span className="text-xs font-bold text-neutral-600">
                    {liveStatus === "active" ? "Đã kết nối" : 
                     liveStatus === "connecting" ? "Đang kết nối..." : "Chưa kết nối"}
                  </span>
                </div>
              </div>

              <button 
                onClick={isLiveActive ? stopLiveSession : startLiveSession}
                disabled={liveStatus === "connecting"}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${
                  isLiveActive 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {isLiveActive ? (
                  <>
                    <Square className="w-6 h-6" />
                    Kết thúc cuộc gọi
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Bắt đầu trò chuyện
                  </>
                )}
              </button>
            </div>

            {aiTranscription && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-emerald-50 p-4 rounded-2xl border border-emerald-100"
              >
                <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Tiểu Minh nói:</div>
                <div className="text-sm text-emerald-900 italic">"{aiTranscription}"</div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input Area (Text Mode Only) */}
      {mode === "text" && (
        <div className="p-4 bg-white border-t border-neutral-200 sticky bottom-0">
          <div className="flex gap-2 bg-neutral-100 p-2 rounded-2xl border border-neutral-200 focus-within:border-emerald-500 transition-all">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2"
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
      )}
    </div>
  );
}
