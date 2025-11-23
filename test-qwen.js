// Quick test script for Qwen integration
import { chatbotService } from './src/services/chatbot.ts';

async function testQwenIntegration() {
  console.log('Testing Qwen integration...');

  try {
    // Test service availability
    const available = await chatbotService.isAvailable();
    console.log('Service available:', available);

    if (available) {
      // Test a simple query
      const response = await chatbotService.processQuery(
        'Is it safe to walk alone at night?',
        [40.7128, -74.0060], // NYC coordinates
        [] // Empty reports for testing
      );
      console.log('Qwen response:', response);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testQwenIntegration();
