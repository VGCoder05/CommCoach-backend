const { llmProviders } = require('../config/llmConfig');
const LLMUsage = require('../models/LLMUsage');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class LLMRotationManager {
  constructor() {
    this.providers = llmProviders.sort((a, b) => a.priority - b.priority);
  }

  // Get today's date at midnight for consistent daily tracking
  getTodayDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // Get or create usage record for a provider today
  async getUsageRecord(providerId) {
    const today = this.getTodayDate();
    
    let usage = await LLMUsage.findOne({
      providerId,
      date: today,
    });

    if (!usage) {
      usage = await LLMUsage.create({
        providerId,
        date: today,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
      });
    }

    return usage;
  }

  // Check if provider has quota remaining
  async hasQuotaRemaining(provider) {
    const usage = await this.getUsageRecord(provider.id);
    return usage.requestCount < provider.dailyLimit;
  }

  // Get next available provider
  async getAvailableProvider() {
    for (const provider of this.providers) {
      const hasQuota = await this.hasQuotaRemaining(provider);
      if (hasQuota) {
        return provider;
      }
    }
    throw new Error('All LLM providers have reached their daily limits. Please try again tomorrow.');
  }

  // Increment usage count
  async incrementUsage(providerId, success = true) {
    const usage = await this.getUsageRecord(providerId);
    
    usage.requestCount += 1;
    if (success) {
      usage.successCount += 1;
    } else {
      usage.errorCount += 1;
    }
    usage.lastUsed = new Date();
    
    await usage.save();
  }

  // Make API call with automatic rotation
  async callLLM(prompt, retryCount = 0) {
    const maxRetries = this.providers.length;

    if (retryCount >= maxRetries) {
      throw new Error('All LLM providers failed or reached limits');
    }

    try {
      const provider = await this.getAvailableProvider();
      console.log(`🤖 Using LLM provider: ${provider.id} (${provider.name})`);

      let response;

      // Call appropriate API based on provider type
      if (provider.name === 'gemini') {
        response = await this.callGemini(provider, prompt);
      } else if (provider.name === 'openai') {
        response = await this.callOpenAI(provider, prompt);
      } else if (provider.name === 'anthropic') {
        response = await this.callAnthropic(provider, prompt);
      }

      // Mark as successful
      await this.incrementUsage(provider.id, true);

      return {
        data: response,
        provider: provider.id,
      };

    } catch (error) {
      console.error(`❌ Provider ${provider?.id} failed:`, error.message);
      
      if (provider) {
        await this.incrementUsage(provider.id, false);
      }

      // Retry with next provider
      return this.callLLM(prompt, retryCount + 1);
    }
  }

  // Gemini API call
  async callGemini(provider, prompt) {
    const genAI = new GoogleGenerativeAI(provider.apiKey);
    const model = genAI.getGenerativeModel({ model: provider.model });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return this.parseJSON(text);
  }

  // OpenAI API call
  async callOpenAI(provider, prompt) {
    const openai = new OpenAI({ apiKey: provider.apiKey });

    const completion = await openai.chat.completions.create({
      model: provider.model,
      messages: [
        { role: 'system', content: 'You are a communication coach. Return responses in valid JSON format.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;
    return this.parseJSON(text);
  }

  // Anthropic API call
  async callAnthropic(provider, prompt) {
    const anthropic = new Anthropic({ apiKey: provider.apiKey });

    const message = await anthropic.messages.create({
      model: provider.model,
      max_tokens: 2048,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const text = message.content[0].text;
    return this.parseJSON(text);
  }

  // Parse JSON from response (handles markdown code blocks)
  parseJSON(text) {
    try {
      // Remove markdown code blocks if present
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('JSON parse error:', error.message);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  // Get usage statistics (for admin dashboard)
  async getUsageStats() {
    const today = this.getTodayDate();
    const stats = await LLMUsage.find({ date: today });

    return this.providers.map(provider => {
      const usage = stats.find(s => s.providerId === provider.id);
      return {
        id: provider.id,
        name: provider.name,
        used: usage ? usage.requestCount : 0,
        limit: provider.dailyLimit,
        remaining: provider.dailyLimit - (usage ? usage.requestCount : 0),
        success: usage ? usage.successCount : 0,
        errors: usage ? usage.errorCount : 0,
      };
    });
  }
}

module.exports = new LLMRotationManager();