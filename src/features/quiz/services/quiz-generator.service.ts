import Anthropic from '@anthropic-ai/sdk';
import { QuizQuestion } from './quiz.service';

const BASE_PROMPT = `Génère une question de quiz sur la géographie ou les montagnes du monde.
La question doit être en français, originale, et avoir exactement 4 choix de réponse.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour, avec cette structure exacte :
{
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answer": 2,
  "explanation": "..."
}

- "answer" est l'index (0-3) de la bonne réponse dans "choices" — varie cet index d'une génération à l'autre (pas toujours le même rang).
- "explanation" est une courte phrase expliquant la bonne réponse
- Les choix doivent être plausibles mais un seul doit être correct
- Varie les thèmes : sommets, pays, chaînes de montagnes, géologie, exploration, faune alpine, records géographiques...`;

const VARIATION_HINTS = [
  'Un massif ou une chaîne peu médiatisée',
  'Un record d’altitude, de profondeur ou de superficie',
  'Géologie (types de roches, formation)',
  'Climat ou neige éternelle',
  'Frontières et pays partagés',
  'Exploration ou premières ascensions',
  'Faune ou flore de haute montagne',
  'Lacs, glaciers ou cours d’eau de montagne',
  'Volcanisme',
  'Une région d’Asie centrale ou du Caucase',
  'Océanie ou îles volcaniques',
  'Amérique du Nord ou Andes',
];

function buildPrompt(recentQuestions: string[]): string {
  const hint = VARIATION_HINTS[Math.floor(Math.random() * VARIATION_HINTS.length)]!;
  const trimmed = recentQuestions.slice(-12).map((q) => q.trim().slice(0, 220)).filter(Boolean);
  const avoidBlock =
    trimmed.length > 0
      ? `\n\nQuestions déjà posées récemment — ne reprends pas le même fait, le même sommet ni une formulation quasi identique :\n${trimmed.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';
  return `${BASE_PROMPT}\n\nAngle du jour (inspire-toi en tout ou partie) : ${hint}.${avoidBlock}`;
}

/** Mélange les choix pour supprimer le biais positionnel des modèles (souvent B/C). */
export function shuffleQuizChoices(question: QuizQuestion): QuizQuestion {
  const pairs = question.choices.map((text, i) => ({ text, isCorrect: i === question.answer }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j]!, pairs[i]!];
  }
  const choices = pairs.map((p) => p.text);
  const answer = pairs.findIndex((p) => p.isCorrect);
  return { ...question, choices, answer };
}

export class QuizGeneratorService {
  static async generate(recentQuestions: string[]): Promise<QuizQuestion> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      temperature: 0.95,
      messages: [{ role: 'user', content: buildPrompt(recentQuestions) }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);

    const base: QuizQuestion = {
      id: `ai-${Date.now()}`,
      question: parsed.question,
      choices: parsed.choices,
      answer: parsed.answer,
      explanation: parsed.explanation ?? null,
    };

    return shuffleQuizChoices(base);
  }
}
