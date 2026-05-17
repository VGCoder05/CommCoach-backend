const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('../models/Question');
const connectDB = require('../config/db');

dotenv.config();
connectDB();

const sampleQuestions = [
  {
    title: 'What is the Virtual DOM in React?',
    description: 'Explain what the Virtual DOM is and why React uses it.',
    category: 'react',
    difficulty: 'intermediate',
    tags: ['react', 'performance', 'dom'],
    expectedTime: 120,
  },
  {
    title: 'Explain closures in JavaScript',
    description: 'What is a closure and provide an example of when you would use one.',
    category: 'javascript',
    difficulty: 'intermediate',
    tags: ['javascript', 'fundamentals', 'scope'],
    expectedTime: 150,
  },
  {
    title: 'What is the difference between let, const, and var?',
    description: 'Explain the differences and when to use each.',
    category: 'javascript',
    difficulty: 'beginner',
    tags: ['javascript', 'es6', 'variables'],
    expectedTime: 90,
  },
  {
    title: 'Explain React Hooks',
    description: 'What are React Hooks and why were they introduced?',
    category: 'react',
    difficulty: 'intermediate',
    tags: ['react', 'hooks', 'functional-components'],
    expectedTime: 120,
  },
  {
    title: 'What is event delegation?',
    description: 'Explain event delegation and its benefits.',
    category: 'javascript',
    difficulty: 'intermediate',
    tags: ['javascript', 'events', 'dom'],
    expectedTime: 100,
  },
  {
    title: 'Describe the concept of RESTful APIs',
    description: 'What makes an API RESTful?',
    category: 'system-design',
    difficulty: 'intermediate',
    tags: ['api', 'rest', 'http'],
    expectedTime: 150,
  },
  {
    title: 'What is database indexing?',
    description: 'Explain database indexes and when to use them.',
    category: 'database',
    difficulty: 'intermediate',
    tags: ['database', 'performance', 'sql'],
    expectedTime: 120,
  },
  {
    title: 'Tell me about yourself',
    description: 'Give a professional introduction.',
    category: 'behavioral',
    difficulty: 'beginner',
    tags: ['behavioral', 'interview'],
    expectedTime: 120,
  },
  {
    title: 'Describe a challenging project you worked on',
    description: 'Talk about a difficult project and how you overcame obstacles.',
    category: 'behavioral',
    difficulty: 'intermediate',
    tags: ['behavioral', 'experience'],
    expectedTime: 180,
  },
  {
    title: 'What is the event loop in Node.js?',
    description: 'Explain how the event loop works in Node.js.',
    category: 'nodejs',
    difficulty: 'advanced',
    tags: ['nodejs', 'async', 'event-loop'],
    expectedTime: 180,
  },
  {
    title: 'Explain promises vs async/await',
    description: 'What are the differences and when to use each?',
    category: 'javascript',
    difficulty: 'intermediate',
    tags: ['javascript', 'async', 'promises'],
    expectedTime: 150,
  },
  {
    title: 'What is load balancing?',
    description: 'Explain load balancing and common strategies.',
    category: 'system-design',
    difficulty: 'advanced',
    tags: ['system-design', 'scalability', 'infrastructure'],
    expectedTime: 180,
  },
  {
    title: 'What are higher-order functions?',
    description: 'Explain higher-order functions with examples.',
    category: 'javascript',
    difficulty: 'intermediate',
    tags: ['javascript', 'functional-programming'],
    expectedTime: 120,
  },
  {
    title: 'Explain the concept of middleware in Express',
    description: 'What is middleware and how does it work in Express.js?',
    category: 'nodejs',
    difficulty: 'intermediate',
    tags: ['nodejs', 'express', 'middleware'],
    expectedTime: 120,
  },
  {
    title: 'What is normalization in databases?',
    description: 'Explain database normalization and its benefits.',
    category: 'database',
    difficulty: 'intermediate',
    tags: ['database', 'design', 'normalization'],
    expectedTime: 150,
  },
];

const seedDB = async () => {
  try {
    // Clear existing questions
    await Question.deleteMany({});
    console.log('🗑️  Cleared existing questions');

    // Insert sample questions
    await Question.insertMany(sampleQuestions);
    console.log('✅ Sample questions inserted');

    console.log(`📊 Total questions: ${sampleQuestions.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();