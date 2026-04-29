import Anthropic from '@anthropic-ai/sdk';

export interface PersonalityQuestion {
  text: string;
  suggestions: string[];
}

export interface GeneratedPersonalityTest {
  subject: string;
  questions: PersonalityQuestion[];
}

export interface PersonalityResult {
  name: string;
  description: string;
  emoji: string;
}

const GENERATE_PROMPT = (subject: string) => `Tu es un créateur de tests de personnalité fun pour un serveur Discord communautaire.

Crée un test de personnalité sur le thème : "${subject}"

Règles :
- Entre 5 et 8 questions ouvertes
- Pour chaque question, propose 2 exemples de réponses courts (pour inspirer, pas pour contraindre)
- Questions engageantes, légères, cohérentes avec le thème
- Tout en français

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour :
{
  "subject": "titre affiché du test (court, accrocheur)",
  "questions": [
    {
      "text": "Question 1 ?",
      "suggestions": ["Exemple A", "Exemple B"]
    }
  ]
}`;

const ANALYZE_PROMPT = (subject: string, qna: { q: string; a: string }[]) => `Tu es un analyste de personnalité perspicace pour un serveur Discord communautaire.

Thème du test : "${subject}"

Réponses de l'utilisateur :
${qna.map(({ q, a }, i) => `${i + 1}. ${q}\n   → ${a}`).join('\n\n')}

Ta mission : produire une analyse personnalisée et sincère, pas un résultat générique.

1. Lis toutes les réponses attentivement pour dégager les traits dominants de cette personne.
2. Choisis le résultat le plus précis selon la nature du thème :
   - Univers avec personnages/personnes identifiables → attribue un nom précis de cet univers (pas le premier venu, celui qui colle vraiment).
   - Thème abstrait ou archétypal → crée un titre de personnalité spécifique et évocateur.
3. Rédige une description de 3 à 4 phrases qui :
   - Cite et interprète des réponses spécifiques de l'utilisateur
   - Explique en quoi ses choix révèlent sa personnalité profonde
   - Relie ces traits au personnage ou à l'archétype attribué
   - Reste bienveillant, fun, mais honnête — pas de flatterie vide

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour :
{
  "name": "Nom précis du personnage ou titre de personnalité",
  "description": "Analyse complète en 4 à 6 phrases",
  "emoji": "🎯"
}`;

export class PersonalityTestGeneratorService {
  static async generate(subject: string): Promise<GeneratedPersonalityTest> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: GENERATE_PROMPT(subject) }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(text) as GeneratedPersonalityTest;
  }

  static async analyzeAnswers(
    subject: string,
    questions: PersonalityQuestion[],
    answers: string[],
  ): Promise<PersonalityResult> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const qna = questions.map((q, i) => ({ q: q.text, a: answers[i] ?? '(sans réponse)' }));

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: ANALYZE_PROMPT(subject, qna) }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(text) as PersonalityResult;
  }
}
