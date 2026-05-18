const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const llmProviders = [
  // Gemini providers
  {
    name: 'gemini',
    id: 'gemini-1',
    apiKey: process.env.GEMINI_API_KEY_1,
    dailyLimit: parseInt(process.env.GEMINI_FREE_LIMIT) || 50,
    model: 'gemini-3-flash-preview',
    priority: 1,
  },
  {
    name: 'gemini',
    id: 'gemini-2',
    apiKey: process.env.GEMINI_API_KEY_2,
    dailyLimit: parseInt(process.env.GEMINI_FREE_LIMIT) || 50,
    model: 'gemini-2.5-flash',
    priority: 2,
  },
].filter(provider => provider.apiKey); // Only include providers with API keys

module.exports = { llmProviders };
