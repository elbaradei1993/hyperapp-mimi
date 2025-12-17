interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

// Type declarations for Puter.js global
declare global {
  const puter: {
    ai: {
      txt2speech: (text: string, options: {
        provider: string;
        model?: string;
        voice?: string;
        response_format?: string;
        instructions?: string;
      }) => Promise<HTMLAudioElement | {success: boolean, error: {message: string}}>;
      chat: (message: string, options?: {
        model?: string;
        stream?: boolean;
      }) => AsyncIterable<{ text?: string }> | Promise<string>;
    };
  };
}

// Minimal TTS Service using Puter.js OpenAI TTS (exactly as per documentation)
class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private readonly safetyVoice = 'alloy'; // Single consistent voice for safety assistant

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const { voice = this.safetyVoice } = options;

    return new Promise(async (resolve, reject) => {
      // Stop any ongoing speech
      this.stop();

      try {
        // Validate text
        if (!text || !text.trim()) {
          resolve();
          return;
        }

        // Check if Puter.js is available
        if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2speech) {
          throw new Error('OpenAI TTS not available - Puter.js not loaded');
        }

        // Generate audio using OpenAI TTS via Puter.js (exact example from docs)
        const ttsResult = await puter.ai.txt2speech(text, {
          provider: 'openai',
          model: 'gpt-4o-mini-tts',
          voice: voice,
          response_format: 'mp3',
          instructions: 'Speak clearly and confidently, with appropriate emphasis for safety information.',
        });

        // Check if the result is an error object
        if (ttsResult && typeof ttsResult === 'object' && 'success' in ttsResult && !ttsResult.success) {
          const errorObj = ttsResult as {success: boolean, error: {message: string}};
          throw new Error(`OpenAI TTS API error: ${errorObj.error?.message || 'Unknown TTS error'}`);
        }

        // Check if it's a valid HTMLAudioElement
        if (!(ttsResult instanceof HTMLAudioElement)) {
          throw new Error('Invalid TTS response format');
        }

        const audio = ttsResult;

        // Set up audio playback
        this.currentAudio = audio;

        // Handle audio events
        this.currentAudio.onended = () => {
          this.currentAudio = null;
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          console.error('OpenAI TTS audio error:', error);
          this.currentAudio = null;
          reject(new Error('Failed to play OpenAI TTS audio'));
        };

        // Start playback
        await this.currentAudio.play();

      } catch (error) {
        console.error('OpenAI TTS error:', error);
        this.currentAudio = null;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  isReady(): boolean {
    return typeof puter !== 'undefined' && puter.ai && typeof puter.ai.txt2speech === 'function';
  }

  getAvailableVoices(): string[] {
    return ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
  }

  getSafetyVoice(): string {
    return this.safetyVoice;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
