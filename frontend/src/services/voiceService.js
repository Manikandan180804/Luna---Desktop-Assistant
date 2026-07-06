/**
 * voiceService.js
 * Local Voice Capabilities utilizing Web Speech API:
 * - Speech-to-Text (STT) via webkitSpeechRecognition
 * - Text-to-Speech (TTS) via window.speechSynthesis
 * - Background Wake Word Detection ("Luna")
 */

// ─── Text-to-Speech (TTS) ───────────────────────────────────────────────────
export function speakText(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      return reject(new Error('Speech synthesis not supported in this browser.'));
    }

    // Cancel any active speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice
    const voices = window.speechSynthesis.getVoices();
    if (options.voiceName) {
      const selected = voices.find(v => v.name === options.voiceName);
      if (selected) utterance.voice = selected;
    } else if (options.language) {
      // Map display language to standard locales
      const langMap = {
        English: 'en-US',
        Spanish: 'es-ES',
        French: 'fr-FR',
        German: 'de-DE',
        Chinese: 'zh-CN',
        Hindi: 'hi-IN',
        Portuguese: 'pt-PT',
        Japanese: 'ja-JP'
      };
      const locale = langMap[options.language] || 'en-US';
      const selected = voices.find(v => v.lang.startsWith(locale));
      if (selected) utterance.voice = selected;
    }

    // Standard styling & pace params
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (err) => reject(err);

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function getAvailableVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().map(v => ({
    name: v.name,
    lang: v.lang,
    default: v.default
  }));
}

// ─── Speech Recognition (STT) & Wake Word ────────────────────────────────────
export class VoiceRecognition {
  constructor(options = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser.');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = options.continuous !== false;
    this.recognition.interimResults = options.interimResults !== false;
    this.recognition.lang = options.lang || 'en-US';

    this.isListening = false;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) this.onEndCallback();
    };
  }

  start() {
    if (this.isListening) return;
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
    }
  }

  stop() {
    if (!this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('Recognition stop error:', e);
    }
  }
}
