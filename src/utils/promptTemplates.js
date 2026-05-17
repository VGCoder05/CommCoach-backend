const createDiagnosisPrompt = (question, userAnswer) => {
  return `You are an expert communication coach helping someone improve their interview answers.

Question: "${question}"

User's Answer: "${userAnswer}"

Analyze this answer and provide detailed feedback in the following JSON format:

{
  "vocabulary": {
    "score": <number 0-10>,
    "weakWords": [
      {
        "original": "<weak word/phrase>",
        "better": "<stronger alternative>",
        "reason": "<why it's better>",
        "originalSentence": "<sentence containing the weak word>",
        "improvedSentence": "<sentence with the better word>"
      }
    ]
  },
  "flow": {
    "score": <number 0-10>,
    "gaps": ["<awkward transition 1>", "<awkward transition 2>"],
    "transitions": [
      {
        "missing": "<where transition is missing>",
        "suggestion": "<suggested transition phrase>",
        "position": "<beginning/middle/end>"
      }
    ]
  },
  "structure": {
    "score": <number 0-10>,
    "define": {
      "present": <boolean>,
      "feedback": "<what they did well or what's missing>"
    },
    "explain": {
      "present": <boolean>,
      "feedback": "<what they did well or what's missing>"
    },
    "contrast": {
      "present": <boolean>,
      "feedback": "<what they did well or what's missing>"
    }
  },
  "finalAnswer": "<a complete, improved version of their answer>",
  "biggestWeakness": "<one clear sentence about their main weakness>",
  "overallScore": <number 0-10, average of the three scores>
}

Guidelines:
- Be specific and actionable
- Find at least 2-3 vocabulary improvements
- Identify missing transitions
- Check if the answer follows Define-Explain-Contrast structure
- The finalAnswer should be a polished version they can learn from
- Keep feedback encouraging but honest

Return ONLY the JSON, no additional text.`;
};

module.exports = { createDiagnosisPrompt };