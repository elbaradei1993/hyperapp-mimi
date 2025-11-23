import OpenAI from 'openai';
import type { Report } from '../types';
import { calculateSafetyScore, getSafetyLevel, getSafetyTrend, calculateSafetyTrends } from '../lib/safetyAnalytics';

interface SafetyContext {
  currentLocation?: [number, number];
  nearbyReports: Report[];
  safetyScore: number;
  safetyLevel: string;
  safetyTrend: string;
  recentIncidents: Report[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Qwen1.5-1.8B Chat Service for local inference
 */
class QwenChatService {
  private model = import.meta.env.VITE_OLLAMA_MODEL || 'qwen:1.8b-chat-v1.5-q4_0';
  private host = import.meta.env.VITE_OLLAMA_HOST || 'http://localhost:11434';

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Process query with Qwen model
   */
  async processQuery(
    userMessage: string,
    context: SafetyContext,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    // Qwen/Ollama is not available in browser environment
    // This method should not be called in production builds
    throw new Error('Qwen service is not available in browser environment');
  }

  /**
   * Create Qwen-optimized prompt
   */
  private createQwenPrompt(
    userMessage: string,
    context: SafetyContext,
    history: ChatMessage[]
  ): string {
    const recentHistory = history.slice(-4); // Last 4 messages for context

    const historyText = recentHistory.length > 0
      ? `\nRecent conversation:\n${recentHistory.map(msg =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')}\n`
      : '';

    const recentIncidentsText = context.recentIncidents.length > 0
      ? `${context.recentIncidents.length} concerning reports in last 24 hours`
      : 'No recent concerning reports';

    return `You are Mimi, a friendly safety assistant for a community safety app.

SAFETY CONTEXT:
- Location: ${context.currentLocation ? `${context.currentLocation[0].toFixed(4)}, ${context.currentLocation[1].toFixed(4)}` : 'Unknown'}
- Safety Score: ${context.safetyScore}/100 (${context.safetyLevel})
- Safety Trend: ${context.safetyTrend}
- Total Reports: ${context.nearbyReports.length}
- ${recentIncidentsText}

${historyText}
Current user question: ${userMessage}

Provide a complete, helpful response about safety. Include specific advice and be conversational. Give a full answer in 2-3 complete sentences that end properly.`;
  }
}

class ChatbotService {
  private openai: OpenAI | null = null;
  private qwenService = new QwenChatService();
  private conversationHistory: ChatMessage[] = [];
  private readonly MAX_HISTORY = 10;

  constructor() {
    // Lazy initialization to avoid errors when API key is missing
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true // For client-side usage
      });
    }
  }

  /**
   * Generate safety context from current data
   */
  private generateSafetyContext(
    userLocation: [number, number] | null,
    nearbyReports: Report[]
  ): SafetyContext {
    const safetyScore = calculateSafetyScore(nearbyReports);
    const safetyLevel = getSafetyLevel(safetyScore);
    const trends = calculateSafetyTrends(nearbyReports, 24);
    const safetyTrend = getSafetyTrend(trends);

    // Get recent incidents (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentIncidents = nearbyReports.filter(report =>
      new Date(report.created_at) > oneDayAgo &&
      (report.vibe_type === 'dangerous' || report.vibe_type === 'suspicious' || report.emergency)
    );

    return {
      currentLocation: userLocation || undefined,
      nearbyReports,
      safetyScore,
      safetyLevel: safetyLevel.description,
      safetyTrend,
      recentIncidents
    };
  }

  /**
   * Create system prompt with safety context
   */
  private createSystemPrompt(context: SafetyContext): string {
    const recentIncidentsText = context.recentIncidents.length > 0
      ? `Recent concerning reports: ${context.recentIncidents.length} incidents in the last 24 hours`
      : 'No recent concerning reports';

    return `You are a helpful safety assistant for a community safety app called Mimi. You help users understand safety conditions in their area and provide safety tips based on community reports.

CURRENT SAFETY CONTEXT:
- Location: ${context.currentLocation ? `${context.currentLocation[0].toFixed(4)}, ${context.currentLocation[1].toFixed(4)}` : 'Unknown'}
- Safety Score: ${context.safetyScore}/100 (${context.safetyLevel})
- Safety Trend: ${context.safetyTrend}
- Total Reports: ${context.nearbyReports.length}
- ${recentIncidentsText}

SAFETY GUIDELINES:
- Be helpful and informative about safety
- Provide specific, actionable safety tips
- If safety score is low (< 40), emphasize caution and suggest alternatives
- For emergency situations, direct users to call emergency services immediately
- Use community report data to give accurate, real-time information
- Be culturally sensitive and location-aware
- Keep responses concise but informative (under 200 words)
- Always prioritize user safety

RESPONSE STYLE:
- Speak naturally and conversationally, like a helpful friend
- Use the user's language and be culturally appropriate
- Be reassuring but realistic about safety concerns
- End with specific safety recommendations when appropriate
- If you don't have enough data, be honest about limitations

CAPABILITIES:
- Answer questions about current safety conditions
- Provide safety tips for different situations
- Explain safety trends and patterns
- Help users understand community reports
- Guide users on safe navigation and activities`;
  }

  /**
   * Process user query and generate response
   */
  async processQuery(
    userMessage: string,
    userLocation: [number, number] | null,
    nearbyReports: Report[]
  ): Promise<string> {
    // Generate safety context
    const context = this.generateSafetyContext(userLocation, nearbyReports);

    // Add user message to history
    this.addToHistory('user', userMessage);

    // Try Qwen first (primary)
    if (import.meta.env.VITE_ENABLE_QWEN !== 'false') {
      try {
        const qwenAvailable = await this.qwenService.isAvailable();
        if (qwenAvailable) {
          const response = await this.qwenService.processQuery(
            userMessage,
            context,
            this.conversationHistory
          );

          // Add response to history
          this.addToHistory('assistant', response);
          return response;
        }
      } catch (error) {
        console.warn('Qwen service failed, falling back to OpenAI:', error);
      }
    }

    // Fallback to OpenAI
    if (!this.openai) {
      return 'I\'m sorry, but the voice chat service is not configured yet. Please contact support to enable this feature.';
    }

    try {
      // Create messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.createSystemPrompt(context)
        },
        ...this.conversationHistory.slice(-this.MAX_HISTORY).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective model
        messages,
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response right now. Please try again.';

      // Add response to history
      this.addToHistory('assistant', response);

      return response;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      // Check for quota exceeded error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        return 'I\'m sorry, but the AI service is currently at capacity. This happens when many people are using the service at once. Please try again in a few minutes, or contact support if the issue persists.';
      }

      return 'I\'m sorry, I\'m having trouble connecting right now. Please check your internet connection and try again in a moment.';
    }
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });

    // Keep only recent messages
    if (this.conversationHistory.length > this.MAX_HISTORY) {
      this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    // Check Qwen availability first
    if (import.meta.env.VITE_ENABLE_QWEN !== 'false') {
      try {
        const qwenAvailable = await this.qwenService.isAvailable();
        if (qwenAvailable) return true;
      } catch (error) {
        console.warn('Qwen service check failed:', error);
      }
    }

    // Fallback to OpenAI availability
    return !!import.meta.env.VITE_OPENAI_API_KEY;
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();
export default chatbotService;
