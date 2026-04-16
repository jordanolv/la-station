import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = (name: string, money: number, xp: number, packs: number) => `
Tu génères une micro-histoire absurde et drôle de 1 à 2 lignes maximum pour un bot Discord.
Le personnage s'appelle "${name}". L'histoire doit expliquer de façon humoristique pourquoi il reçoit aujourd'hui :
- ${money} pièces d'argent (min 0, max 100)
- ${xp} XP (min 0, max 100)
- ${packs} expédition${packs > 1 ? 's' : ''} (min 0, max 3)

Règles :
- 1 à 2 lignes max, pas plus
- Ton décalé, absurde, potentiellement gênant mais fun (pas méchant)
- Les montants faibles = journée catastrophique, les montants élevés = coup de chance insolent. Adapte l'histoire en conséquence.
- Invente une situation ridicule et concrète (pas de métaphores vagues)
- Pas de guillemets, pas de tirets, pas d'emoji, pas de mise en forme
- Réponds uniquement avec l'histoire, rien d'autre
`.trim();

export class DailyStoryService {
  static async generate(name: string, money: number, xp: number, packs: number): Promise<string | null> {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        temperature: 1,
        messages: [{ role: 'user', content: PROMPT(name, money, xp, packs) }],
      });
      return (response.content[0] as { type: string; text: string }).text.trim();
    } catch {
      return null;
    }
  }
}
