export const ttsService = {
  speak(text: string, lang: "zh-CN" | "vi-VN" = "zh-CN", rate: number = 1) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    // Try to find a better voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => v.lang.startsWith(lang) && (v.name.includes("Google") || v.name.includes("Premium")));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  },

  stop() {
    window.speechSynthesis.cancel();
  }
};
