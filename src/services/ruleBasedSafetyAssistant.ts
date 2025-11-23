import { ttsService } from './tts';
import type { Report } from '../types';
import { calculateSafetyScore, getSafetyLevel, getSafetyTrend, calculateSafetyTrends } from '../lib/safetyAnalytics';

interface SafetyContext {
  currentLocation?: [number, number];
  nearbyReports: Report[];
  safetyScore: number;
  safetyLevel: string;
  safetyTrend: string;
  recentIncidents: Report[];
  timeOfDay: string;
}

interface ConversationContext {
  lastTopic?: string;
  questionCount: number;
  safetyConcerns: string[];
  conversationHistory: string[];
  userPreferences?: {
    cautiousLevel: 'low' | 'medium' | 'high';
    transportationMode?: string;
  };
}

interface SafetyResponse {
  message: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  suggestions: string[];
  followUpQuestion?: string;
  topic: string;
}

/**
 * Enhanced Conversational Safety Assistant
 * Provides intelligent, context-aware safety advice with conversation memory
 */
class EnhancedSafetyAssistant {
  private conversationContext: ConversationContext = {
    questionCount: 0,
    safetyConcerns: [],
    conversationHistory: []
  };

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

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay = 'day';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      currentLocation: userLocation || undefined,
      nearbyReports,
      safetyScore,
      safetyLevel: safetyLevel.description,
      safetyTrend,
      recentIncidents,
      timeOfDay
    };
  }

  /**
   * Analyze user query and provide intelligent safety response
   */
  async processQuery(
    userMessage: string,
    userLocation: [number, number] | null,
    nearbyReports: Report[]
  ): Promise<string> {
    const context = this.generateSafetyContext(userLocation, nearbyReports);
    const response = this.generateIntelligentResponse(userMessage.toLowerCase(), context);

    // Update conversation context
    this.updateConversationContext(userMessage, response);

    // Return the response text - TTS is handled by the UI component
    return response.message;
  }

  /**
   * Generate intelligent, context-aware response
   */
  private generateIntelligentResponse(message: string, context: SafetyContext): SafetyResponse {
    // Analyze user intent and extract key information
    const intent = this.analyzeUserIntent(message);
    const entities = this.extractEntities(message);

    // Handle emergency situations first
    if (intent.emergency || context.recentIncidents.length > 2) {
      return this.getEmergencyResponse(context, intent);
    }

    // Handle based on primary intent
    switch (intent.primary) {
      case 'safety_assessment':
        return this.getSafetyAssessmentResponse(context, intent, entities);
      case 'route_planning':
        return this.getRoutePlanningResponse(context, intent, entities);
      case 'time_specific':
        return this.getTimeSpecificResponse(context, intent, entities);
      case 'general_safety':
        return this.getGeneralSafetyResponse(context, intent);
      case 'greeting':
        return this.getGreetingResponse(context, intent);
      case 'gratitude':
        return this.getGratitudeResponse(context);
      default:
        return this.getContextualResponse(context, intent, entities);
    }
  }

  /**
   * Analyze user intent from message
   */
  private analyzeUserIntent(message: string): any {
    const emergencyKeywords = ['emergency', 'danger', 'help', 'attack', 'crime', 'fire', 'accident', 'medical', 'hurt'];
    const safetyKeywords = ['safe', 'safety', 'dangerous', 'risk', 'caution', 'worry', 'scared', 'concerned', 'unsafe'];
    const routeKeywords = ['walk', 'walking', 'route', 'path', 'way', 'go to', 'get to', 'travel', 'journey'];
    const timeKeywords = ['night', 'dark', 'late', 'early', 'morning', 'evening', 'afternoon'];
    const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'];
    const gratitudeKeywords = ['thank', 'thanks', 'appreciate', 'grateful'];

    return {
      emergency: emergencyKeywords.some(keyword => message.includes(keyword)),
      safety_assessment: safetyKeywords.some(keyword => message.includes(keyword)),
      route_planning: routeKeywords.some(keyword => message.includes(keyword)),
      time_specific: timeKeywords.some(keyword => message.includes(keyword)),
      greeting: greetingKeywords.some(keyword => message.includes(keyword)),
      gratitude: gratitudeKeywords.some(keyword => message.includes(keyword)),
      primary: this.determinePrimaryIntent(message, {
        emergency: emergencyKeywords,
        safety_assessment: safetyKeywords,
        route_planning: routeKeywords,
        time_specific: timeKeywords,
        greeting: greetingKeywords,
        gratitude: gratitudeKeywords
      })
    };
  }

  /**
   * Determine the primary intent from competing keywords
   */
  private determinePrimaryIntent(message: string, intentGroups: Record<string, string[]>): string {
    // Emergency always takes priority
    if (intentGroups.emergency.some(keyword => message.includes(keyword))) {
      return 'emergency';
    }

    // Check other intents
    for (const [intent, keywords] of Object.entries(intentGroups)) {
      if (intent !== 'emergency' && keywords.some(keyword => message.includes(keyword))) {
        return intent;
      }
    }

    return 'general_safety';
  }

  /**
   * Extract entities from user message
   */
  private extractEntities(message: string): any {
    return {
      transportation: this.extractTransportation(message),
      destination: this.extractDestination(message),
      timeReference: this.extractTimeReference(message)
    };
  }

  private extractTransportation(message: string): string | null {
    const transportModes = ['walk', 'walking', 'drive', 'driving', 'bike', 'cycling', 'bus', 'train', 'subway', 'taxi', 'uber'];
    return transportModes.find(mode => message.includes(mode)) || null;
  }

  private extractDestination(message: string): string | null {
    // Simple destination extraction - could be enhanced
    const destinationPatterns = [
      /to (.+?)(?:\?|$|at|by)/i,
      /going to (.+?)(?:\?|$|at|by)/i,
      /heading to (.+?)(?:\?|$|at|by)/i
    ];

    for (const pattern of destinationPatterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private extractTimeReference(message: string): string | null {
    const timeRefs = ['now', 'right now', 'tonight', 'this evening', 'tomorrow', 'later'];
    return timeRefs.find(ref => message.includes(ref)) || null;
  }

  /**
   * Get varied safety assessment responses
   */
  private getSafetyAssessmentResponse(context: SafetyContext, intent: any, entities: any): SafetyResponse {
    const score = context.safetyScore;
    const variations = this.getSafetyAssessmentVariations(score, context);

    // Select variation based on conversation context
    const variationIndex = this.conversationContext.questionCount % variations.length;
    const selectedVariation = variations[variationIndex];

    let message = selectedVariation.message;
    let followUpQuestion = selectedVariation.followUp;

    // Add incident information if relevant
    if (context.recentIncidents.length > 0 && !message.includes('reports')) {
      message += ` There have been ${context.recentIncidents.length} recent safety reports in the last 24 hours.`;
    }

    return {
      message,
      priority: score < 40 ? 'high' : score < 60 ? 'medium' : 'low',
      suggestions: this.getSafetySuggestions(score, context.timeOfDay, entities.transportation),
      followUpQuestion,
      topic: 'safety_assessment'
    };
  }

  /**
   * Get multiple variations for safety assessments
   */
  private getSafetyAssessmentVariations(score: number, context: SafetyContext): Array<{message: string, followUp?: string}> {
    if (score >= 80) {
      return [
        {
          message: `Your area shows a strong safety score of ${score} out of 100. This is generally a secure location with good community vigilance.`,
          followUp: "What specific aspect of safety are you most concerned about?"
        },
        {
          message: `With a safety rating of ${score}/100, this area appears quite safe. The community reports indicate good situational awareness here.`,
          followUp: "Is there anything particular making you feel cautious?"
        },
        {
          message: `I'm seeing a ${score} out of 100 safety score for your location - that's in the good range. Most people feel comfortable here.`,
          followUp: "Would you like me to check safety tips for your planned activities?"
        }
      ];
    } else if (score >= 60) {
      return [
        {
          message: `Your location has a moderate safety score of ${score}/100. While generally okay, it's worth staying alert to your surroundings.`,
          followUp: "What time of day will you be out, or what activity are you planning?"
        },
        {
          message: `This area rates ${score} out of 100 for safety - decent but not exceptional. Standard safety precautions are recommended.`,
          followUp: "Are you walking, driving, or using public transport?"
        },
        {
          message: `The safety score here is ${score}/100, which means taking normal precautions makes sense. Stay aware of your environment.`,
          followUp: "Would you like specific safety tips for your situation?"
        }
      ];
    } else if (score >= 40) {
      return [
        {
          message: `Caution advised - your area has a safety score of ${score}/100, indicating some risks are present. Extra awareness is recommended.`,
          followUp: "What route or activity are you planning? I can give specific advice."
        },
        {
          message: `This location rates ${score}/100 for safety, which suggests being more vigilant than usual. Trust your instincts and take precautions.`,
          followUp: "Are you alone or with others? That affects the safety recommendations."
        },
        {
          message: `With a ${score}/100 safety score, this area needs careful attention. Consider traveling with others or choosing well-lit routes.`,
          followUp: "What's your destination or purpose for being out?"
        }
      ];
    } else {
      return [
        {
          message: `Warning: This area has a low safety score of ${score}/100. Exercise significant caution and consider alternative routes or timing.`,
          followUp: "Can you tell me more about what you're planning to do?"
        },
        {
          message: `The safety rating here is ${score}/100, which is concerning. I strongly recommend extra precautions or reconsidering your plans.`,
          followUp: "Is this urgent, or could you adjust your timing or route?"
        },
        {
          message: `This location scores only ${score}/100 for safety. Please prioritize your security and consider safer alternatives if possible.`,
          followUp: "Would you like me to suggest safer nearby areas or routes?"
        }
      ];
    }
  }

  /**
   * Get route planning responses
   */
  private getRoutePlanningResponse(context: SafetyContext, intent: any, entities: any): SafetyResponse {
    const transportation = entities.transportation || 'walking';
    const timeAdvice = this.getTimeBasedAdvice(context.timeOfDay);

    let message = `Planning a ${transportation} route? ${timeAdvice} `;

    if (context.safetyScore >= 70) {
      message += `Your area is generally safe, but staying aware of your surroundings is always smart.`;
    } else if (context.safetyScore >= 50) {
      message += `This area needs some caution. Consider sticking to main roads and well-lit areas.`;
    } else {
      message += `This route has safety concerns. I recommend finding a safer alternative or traveling with others.`;
    }

    return {
      message,
      priority: context.safetyScore < 50 ? 'high' : 'medium',
      suggestions: this.getRouteSafetySuggestions(transportation, context),
      followUpQuestion: "Can you tell me your starting point and destination?",
      topic: 'route_planning'
    };
  }

  /**
   * Get time-specific responses
   */
  private getTimeSpecificResponse(context: SafetyContext, intent: any, entities: any): SafetyResponse {
    const timeAdvice = this.getDetailedTimeAdvice(context.timeOfDay, context.safetyScore);

    return {
      message: timeAdvice,
      priority: context.timeOfDay === 'night' || context.safetyScore < 50 ? 'high' : 'medium',
      suggestions: this.getTimeBasedSuggestions(context.timeOfDay, context.safetyScore),
      followUpQuestion: "What activity will you be doing at this time?",
      topic: 'time_specific'
    };
  }

  /**
   * Get detailed time-based advice
   */
  private getDetailedTimeAdvice(timeOfDay: string, safetyScore: number): string {
    const timeAdvices = {
      night: [
        `At night, visibility and safety change significantly. ${safetyScore >= 60 ? 'While your area is relatively safe' : 'Given the safety concerns here'}, I recommend staying in well-lit areas and avoiding isolated spots.`,
        `Nighttime presents unique safety challenges. ${safetyScore >= 60 ? 'Your location is generally okay after dark' : 'This area becomes riskier at night'}, so plan routes that keep you visible and near other people.`,
        `Dark hours require extra vigilance. ${safetyScore >= 60 ? 'Stick to main streets and well-lit paths' : 'Consider postponing non-essential travel or finding safer alternatives'}.`
      ],
      evening: [
        `As evening approaches, lighting conditions change. ${safetyScore >= 60 ? 'Your area remains reasonably safe' : 'Safety concerns increase'}, so stay alert to your surroundings.`,
        `Evening time brings transition - be mindful of changing light. ${safetyScore >= 60 ? 'Continue normal precautions' : 'Exercise additional caution'} as visibility decreases.`,
        `The evening hours need attention to safety details. ${safetyScore >= 60 ? 'Well-lit areas are your best choice' : 'Consider completing your plans earlier or finding better-lit alternatives'}.`
      ],
      morning: [
        `Morning hours are generally safer, but traffic and construction can be concerns. ${safetyScore >= 60 ? 'Your area is safe for morning activities' : 'Even in morning, stay aware of local conditions'}.`,
        `Early day travel has its own considerations. ${safetyScore >= 60 ? 'Morning is a good time to be out' : 'Morning doesn\'t eliminate all safety concerns'}, so maintain awareness.`,
        `Morning activities benefit from good visibility. ${safetyScore >= 60 ? 'Take advantage of the safer conditions' : 'Don\'t get complacent - safety first'}.`
      ]
    };

    const advices = timeAdvices[timeOfDay as keyof typeof timeAdvices] || timeAdvices.evening;
    return advices[this.conversationContext.questionCount % advices.length];
  }

  /**
   * Get greeting responses
   */
  private getGreetingResponse(context: SafetyContext, intent: any): SafetyResponse {
    const timeGreeting = this.getTimeBasedGreeting(context.timeOfDay);
    const safetyStatus = context.safetyScore >= 70 ? 'looking good' : context.safetyScore >= 50 ? 'moderate' : 'requiring some attention';

    const greetings = [
      `${timeGreeting}! I'm here to help you stay safe. Your current area is ${safetyStatus} with a safety score of ${context.safetyScore}/100.`,
      `${timeGreeting}! Safety first - that's my priority. I see your location has a ${context.safetyScore}/100 safety rating, which is ${safetyStatus}.`,
      `${timeGreeting}! Ready to help you navigate safely. Your area currently rates ${context.safetyScore}/100 for safety.`
    ];

    return {
      message: greetings[this.conversationContext.questionCount % greetings.length],
      priority: 'low',
      suggestions: ['Ask about current safety conditions', 'Get route safety advice', 'Learn about local safety trends'],
      followUpQuestion: "What safety concerns can I help you with today?",
      topic: 'greeting'
    };
  }

  /**
   * Get gratitude responses
   */
  private getGratitudeResponse(context: SafetyContext): SafetyResponse {
    const responses = [
      "You're welcome! Safety is important, and I'm glad I could help.",
      "Happy to assist! Stay safe out there - that's what matters most.",
      "My pleasure! Remember, your safety is the top priority."
    ];

    return {
      message: responses[this.conversationContext.questionCount % responses.length],
      priority: 'low',
      suggestions: ['Ask about other safety topics', 'Check safety for different routes', 'Learn emergency preparedness'],
      topic: 'gratitude'
    };
  }

  /**
   * Get emergency responses
   */
  private getEmergencyResponse(context: SafetyContext, intent: any): SafetyResponse {
    if (context.recentIncidents.length > 2) {
      return {
        message: `Alert! There are ${context.recentIncidents.length} recent safety incidents in your area. Please stay aware of your surroundings and consider moving to a safer location immediately. If you're in immediate danger, call emergency services right away.`,
        priority: 'emergency',
        suggestions: [
          'Call emergency services: 911 (US) or local equivalent',
          'Move to a well-lit, populated area',
          'Stay with trusted people',
          'Share your location with emergency contacts'
        ],
        topic: 'emergency'
      };
    } else {
      return {
        message: `If you're experiencing an emergency, please call your local emergency services immediately. I'm here to help you understand the current safety situation and provide guidance.`,
        priority: 'emergency',
        suggestions: [
          'Call emergency services right away',
          'Move to a safe location',
          'Contact trusted friends or family',
          'Use emergency alert features on your phone'
        ],
        topic: 'emergency'
      };
    }
  }

  /**
   * Get general safety responses
   */
  private getGeneralSafetyResponse(context: SafetyContext, intent: any): SafetyResponse {
    const responses = [
      `I'm here to help you stay safe in your community. Your current area has a safety score of ${context.safetyScore} out of 100. I can provide information about local safety conditions, recent incidents, and safety tips.`,
      `Safety is my top priority! Your location currently rates ${context.safetyScore}/100 for safety. I can help with safety assessments, route planning, and general safety advice.`,
      `Let me help you navigate safely. I see your area has a safety score of ${context.safetyScore}/100. I can provide personalized safety recommendations based on current conditions.`
    ];

    return {
      message: responses[this.conversationContext.questionCount % responses.length],
      priority: 'low',
      suggestions: [
        'Current safety conditions',
        'Recent safety reports',
        'Safety tips for your area',
        'Emergency preparedness'
      ],
      followUpQuestion: "What would you like to know about safety in your area?",
      topic: 'general_safety'
    };
  }

  /**
   * Get contextual responses based on conversation history
   */
  private getContextualResponse(context: SafetyContext, intent: any, entities: any): SafetyResponse {
    // If we have conversation history, provide more contextual responses
    if (this.conversationContext.lastTopic) {
      return this.getFollowUpResponse(context, this.conversationContext.lastTopic);
    }

    // Default to general safety response
    return this.getGeneralSafetyResponse(context, intent);
  }

  /**
   * Get follow-up responses based on previous topic
   */
  private getFollowUpResponse(context: SafetyContext, lastTopic: string): SafetyResponse {
    const followUps = {
      safety_assessment: {
        message: `Following up on the safety assessment - your area maintains a ${context.safetyScore}/100 safety score. Have your safety concerns changed, or would you like more specific advice?`,
        followUpQuestion: "What specific safety information do you need?"
      },
      route_planning: {
        message: `Regarding your route planning - the safety conditions are still ${context.safetyScore >= 60 ? 'generally favorable' : 'requiring attention'}. Have you decided on your route yet?`,
        followUpQuestion: "Can you share your planned route?"
      },
      time_specific: {
        message: `About the timing you mentioned - ${this.getTimeBasedAdvice(context.timeOfDay)}. Is this still relevant to your current plans?`,
        followUpQuestion: "What's changed with your timing?"
      }
    };

    const followUp = followUps[lastTopic as keyof typeof followUps] || followUps.safety_assessment;

    return {
      message: followUp.message,
      priority: 'low',
      suggestions: this.getSafetySuggestions(context.safetyScore, context.timeOfDay),
      followUpQuestion: followUp.followUpQuestion,
      topic: lastTopic
    };
  }

  /**
   * Update conversation context
   */
  private updateConversationContext(userMessage: string, response: SafetyResponse): void {
    this.conversationContext.questionCount++;
    this.conversationContext.lastTopic = response.topic;
    this.conversationContext.conversationHistory.push(userMessage);

    // Keep only recent history
    if (this.conversationContext.conversationHistory.length > 5) {
      this.conversationContext.conversationHistory = this.conversationContext.conversationHistory.slice(-5);
    }
  }

  /**
   * Get time-based advice
   */
  private getTimeBasedAdvice(timeOfDay: string): string {
    switch (timeOfDay) {
      case 'night':
        return 'At night, stick to well-lit areas and consider having someone accompany you.';
      case 'evening':
        return 'In the evening, stay aware of changing light conditions and plan well-lit routes.';
      case 'morning':
        return 'During morning hours, be cautious of traffic and construction in your area.';
      default:
        return 'During daytime hours, stay alert to your surroundings.';
    }
  }

  /**
   * Get time-based greeting
   */
  private getTimeBasedGreeting(timeOfDay: string): string {
    switch (timeOfDay) {
      case 'morning':
        return 'Good morning';
      case 'afternoon':
        return 'Good afternoon';
      case 'evening':
        return 'Good evening';
      case 'night':
        return 'Hello';
      default:
        return 'Hello';
    }
  }

  /**
   * Get safety suggestions based on score and time
   */
  private getSafetySuggestions(score: number, timeOfDay: string, transportation?: string | null): string[] {
    const suggestions = [];

    if (score < 60) {
      suggestions.push('Avoid isolated areas and walk with others when possible');
      suggestions.push('Keep emergency contacts easily accessible');
      suggestions.push('Trust your instincts and leave if something feels wrong');
    }

    if (timeOfDay === 'night' || timeOfDay === 'evening') {
      suggestions.push('Use well-lit routes and stay in populated areas');
      suggestions.push('Let someone know your plans and expected return time');
    }

    if (transportation) {
      suggestions.push(`Stay aware while ${transportation} and follow local traffic rules`);
    }

    if (score >= 70) {
      suggestions.push('Continue practicing good awareness habits');
      suggestions.push('Help improve community safety by reporting concerns');
    }

    suggestions.push('Regularly check the community safety map for updates');

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Get route safety suggestions
   */
  private getRouteSafetySuggestions(transportation: string, context: SafetyContext): string[] {
    const suggestions = [];

    if (transportation.includes('walk')) {
      suggestions.push('Choose routes with good lighting and pedestrian traffic');
      suggestions.push('Avoid shortcuts through alleys or isolated areas');
      if (context.timeOfDay === 'night') {
        suggestions.push('Consider having someone walk with you or stay on the line');
      }
    } else if (transportation.includes('drive')) {
      suggestions.push('Check traffic conditions and road safety');
      suggestions.push('Avoid distracted driving and stay alert');
    }

    suggestions.push('Share your route with trusted contacts');
    suggestions.push('Have emergency contacts readily available');

    return suggestions;
  }

  /**
   * Get time-based suggestions
   */
  private getTimeBasedSuggestions(timeOfDay: string, safetyScore: number): string[] {
    const suggestions = [];

    if (timeOfDay === 'night') {
      suggestions.push('Carry a phone with emergency features enabled');
      suggestions.push('Avoid isolated areas and stick to main routes');
      suggestions.push('Let someone know your expected arrival time');
    } else if (timeOfDay === 'evening') {
      suggestions.push('Be mindful of changing light conditions');
      suggestions.push('Plan routes that remain well-lit');
    }

    if (safetyScore < 60) {
      suggestions.push('Consider traveling with others');
      suggestions.push('Have emergency plans ready');
    }

    return suggestions;
  }

  /**
   * Check if the service is available (always true for rule-based)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Clear conversation context
   */
  clearContext(): void {
    this.conversationContext = {
      questionCount: 0,
      safetyConcerns: [],
      conversationHistory: []
    };
  }
}

// Export singleton instance
export const ruleBasedSafetyAssistant = new EnhancedSafetyAssistant();
export default ruleBasedSafetyAssistant;
