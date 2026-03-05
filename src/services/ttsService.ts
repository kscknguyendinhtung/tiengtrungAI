export const ttsService = {
  speak(text: string, lang: "zh-CN" | "vi-VN" = "zh-CN", rate: number = 1) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    const attemptSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a preferred voice (Google/Premium)
        let voice = voices.find(v => 
          v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()) && 
          (v.name.includes("Google") || v.name.includes("Premium") || v.name.includes("Enhanced"))
        );

        // Fallback to any voice matching the language
        if (!voice) {
          voice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()));
        }

        // Special fallback for Chinese on iOS (often zh-CN, zh-HK, zh-TW)
        if (!voice && lang === "zh-CN") {
          voice = voices.find(v => v.lang.toLowerCase().startsWith("zh"));
        }

        if (voice) {
          utterance.voice = voice;
          // Some browsers need the lang to match the voice exactly
          utterance.lang = voice.lang;
        }
      }
      window.speechSynthesis.speak(utterance);
    };

    // On some browsers (like Safari), voices are loaded asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        attemptSpeak();
        // Remove listener to avoid multiple triggers
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      attemptSpeak();
    }
  },

  stop() {
    window.speechSynthesis.cancel();
  }
};
