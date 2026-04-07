import Anthropic from '@anthropic-ai/sdk';
import { QuizQuestion } from './quiz.service';

const PROMPT = `Génère une question de quiz sur la géographie ou les montagnes du monde.
La question doit être en français, originale, et avoir exactement 4 choix de réponse.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour, avec cette structure exacte :
{
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answer": 0,
  "explanation": "..."
}

- "answer" est l'index (0-3) de la bonne réponse dans "choices"
- "explanation" est une courte phrase expliquant la bonne réponse
- Les choix doivent être plausibles mais un seul doit être correct
- Varie les thèmes : sommets, pays, chaînes de montagnes, géologie, exploration, faune alpine, records géographiques...`;

export class QuizGeneratorService {
  static async generate(): Promise<QuizQuestion> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: PROMPT }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);

    return {
      id: `ai-${Date.now()}`,
      question: parsed.question,
      choices: parsed.choices,
      answer: parsed.answer,
      explanation: parsed.explanation ?? null,
    };
  }
}
