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
    model: 'gemini-pro',
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
  {
    name: 'gemini',
    id: 'gemini-3',
    apiKey: process.env.GEMINI_API_KEY_3,
    dailyLimit: parseInt(process.env.GEMINI_FREE_LIMIT) || 50,
    model: 'gemini-pro',
    priority: 3,
  },
  
  // OpenAI providers
  {
    name: 'openai',
    id: 'openai-1',
    apiKey: process.env.OPENAI_API_KEY_1,
    dailyLimit: parseInt(process.env.OPENAI_FREE_LIMIT) || 20,
    model: 'gpt-3.5-turbo',
    priority: 4,
  },
  {
    name: 'openai',
    id: 'openai-2',
    apiKey: process.env.OPENAI_API_KEY_2,
    dailyLimit: parseInt(process.env.OPENAI_FREE_LIMIT) || 20,
    model: 'gpt-3.5-turbo',
    priority: 5,
  },
  
  // Anthropic providers
  {
    name: 'anthropic',
    id: 'anthropic-1',
    apiKey: process.env.ANTHROPIC_API_KEY_1,
    dailyLimit: parseInt(process.env.ANTHROPIC_FREE_LIMIT) || 10,
    model: 'claude-3-haiku-20240307',
    priority: 6,
  },
].filter(provider => provider.apiKey); // Only include providers with API keys

module.exports = { llmProviders };