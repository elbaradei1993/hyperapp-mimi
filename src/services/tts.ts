interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

// Enhanced Web Speech API TTS Service with better voice selection and natural speech patterns
class EnhancedWebSpeechTTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const { speed = 0.9, pitch = 1.0, volume = 0.8 } = options;

    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();
      this.isSpeaking = true;

      // Process text for natural speech
      const processedText = this.processTextForNaturalSpeech(text);
      const chunks = this.splitTextIntoNaturalChunks(processedText);

      let currentChunkIndex = 0;

      const speakNextChunk = () => {
        if (!this.isSpeaking || currentChunkIndex >= chunks.length) {
          this.isSpeaking = false;
          resolve();
          return;
        }

        const chunk = chunks[currentChunkIndex];
        currentChunkIndex++;

        this.currentUtterance = new SpeechSynthesisUtterance(chunk);
        this.currentUtterance.rate = Math.max(0.1, Math.min(10, speed));
        this.currentUtterance.pitch = Math.max(0, Math.min(2, pitch));
        this.currentUtterance.volume = Math.max(0, Math.min(1, volume));
        this.currentUtterance.lang = 'en-US';

        // Select the best available voice
        const voice = this.selectBestVoice();
        if (voice) {
          this.currentUtterance.voice = voice;
        }

        // Add natural speech variations
        this.addNaturalSpeechVariations(this.currentUtterance, currentChunkIndex, chunks.length);

        this.currentUtterance.onend = () => {
          // Natural pause between chunks
          if (currentChunkIndex < chunks.length) {
            const pauseDuration = this.calculateNaturalPause(chunk, chunks[currentChunkIndex]);
            setTimeout(speakNextChunk, pauseDuration);
          } else {
            this.isSpeaking = false;
            resolve();
          }
        };

        this.currentUtterance.onerror = (error) => {
          // Don't treat "interrupted" as a real error - it's expected when cancelling speech
          if (error.error !== 'interrupted') {
            console.error('TTS error:', error);
            this.isSpeaking = false;
            reject(error);
          } else {
            // Interrupted is normal - just clean up
            this.isSpeaking = false;
            resolve();
          }
        };

        speechSynthesis.speak(this.currentUtterance);
      };

      speakNextChunk();
    });
  }

  stop(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isSpeaking = false;
  }

  isReady(): boolean {
    return 'speechSynthesis' in window;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices();
  }

  private processTextForNaturalSpeech(text: string): string {
    let processed = text
      // Convert numbers to more natural speech
      .replace(/(\d+)/g, (match) => {
        const num = parseInt(match);
        if (num < 10) return match;
        return match;
      })
      // Handle abbreviations more naturally
      .replace(/\b(\w)\.(\w)\./g, '$1 $2') // A.M. -> A M
      .replace(/\b(\w+)\./g, (match, abbr) => {
        // Keep common abbreviations as they are
        const keepAsIs = ['Mr', 'Mrs', 'Dr', 'Inc', 'Ltd', 'Corp'];
        return keepAsIs.includes(abbr) ? abbr + '.' : abbr;
      });

    return processed;
  }

  private splitTextIntoNaturalChunks(text: string): string[] {
    // Split by sentences but keep related thoughts together
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If adding this sentence would make the chunk too long, or if it's a question,
      // start a new chunk for more natural speech pacing
      const isQuestion = trimmedSentence.includes('?');
      const wouldBeTooLong = currentChunk.length + trimmedSentence.length + 1 > 120;

      if (wouldBeTooLong || isQuestion) {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
          currentChunk = trimmedSentence;
        } else {
          chunks.push(trimmedSentence + (isQuestion ? '?' : '.'));
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  private addNaturalSpeechVariations(utterance: SpeechSynthesisUtterance, chunkIndex: number, totalChunks: number): void {
    // Add slight variations to make speech sound more natural
    const baseRate = utterance.rate;
    const basePitch = utterance.pitch;

    // Slight variations for more human-like speech
    utterance.rate = baseRate * (0.95 + Math.random() * 0.1); // ±5% variation
    utterance.pitch = basePitch * (0.98 + Math.random() * 0.04); // ±2% variation

    // Adjust volume slightly for emphasis on first/last chunks
    if (chunkIndex === 1) {
      utterance.volume *= 1.05; // Slightly louder for start
    } else if (chunkIndex === totalChunks) {
      utterance.volume *= 0.95; // Slightly softer for end
    }
  }

  private selectBestVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices();

    // Priority order for better voices
    const preferredVoiceNames = [
      'Microsoft Zira', // Windows - clear female voice
      'Google US English', // Chrome - natural
      'Samantha', // macOS - clear
      'Alex', // macOS male
      'Daniel', // iOS
      'Karen', // macOS
      'Susan', // iOS
      'Victoria' // iOS
    ];

    // First try to find preferred voices
    for (const preferredName of preferredVoiceNames) {
      const voice = voices.find(v =>
        v.name.includes(preferredName) && v.lang.startsWith('en')
      );
      if (voice) return voice;
    }

    // Fallback to any English voice that's not known to be robotic
    const fallbackVoice = voices.find(v =>
      v.lang.startsWith('en') &&
      !v.name.toLowerCase().includes('zira') && // Avoid robotic Zira
      !v.name.toLowerCase().includes('hazel') && // Avoid robotic Hazel
      !v.name.toLowerCase().includes('david') // Avoid robotic David
    );

    if (fallbackVoice) return fallbackVoice;

    // Last resort: any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  private calculateNaturalPause(currentChunk: string, nextChunk: string): number {
    // Calculate natural pause duration based on content
    let pauseMs = 200; // Base pause

    // Longer pause after questions
    if (currentChunk.includes('?')) pauseMs += 300;

    // Longer pause after exclamations
    if (currentChunk.includes('!')) pauseMs += 200;

    // Shorter pause if next chunk continues the thought
    if (nextChunk && (nextChunk.toLowerCase().startsWith('and') ||
                      nextChunk.toLowerCase().startsWith('but') ||
                      nextChunk.toLowerCase().startsWith('or'))) {
      pauseMs -= 100;
    }

    // Add some natural variation
    pauseMs += (Math.random() - 0.5) * 100; // ±50ms variation

    return Math.max(100, pauseMs); // Minimum 100ms pause
  }
}

// Main TTS Service - Enhanced Web Speech API with better voice selection and chunking
class TTSService {
  private enhancedWebSpeechService = new EnhancedWebSpeechTTSService();

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    await this.enhancedWebSpeechService.speak(text, options);
  }

  stop(): void {
    this.enhancedWebSpeechService.stop();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.enhancedWebSpeechService.getAvailableVoices();
  }

  isReady(): boolean {
    return this.enhancedWebSpeechService.isReady();
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
