import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { PersonalityTestConfigRepository } from '../repositories/personality-test-config.repository';
import { PersonalityTestSessionRepository } from '../repositories/personality-test-session.repository';
import { PersonalityTestGeneratorService, GeneratedPersonalityTest, PersonalityResult } from './personality-test-generator.service';
import UserModel from '../../user/models/user.model';
import { awardExpeditions } from '../../peak-hunters/services/expedition.service';

export const PTEST_BUTTON_PREFIX = 'ptest';

interface TestResult {
  userId: string;
  personality: PersonalityResult;
}

interface ActiveTest {
  test: GeneratedPersonalityTest;
  channelId: string;
  resultMessageId: string;
  threadId: string;
  started: Set<string>;
  results: TestResult[];
}

const activeSessions = new Map<string, ActiveTest>();
// Free-text answers keyed by `testId:userId`
const userAnswers = new Map<string, string[]>();


function buildQuestion(test: GeneratedPersonalityTest, testId: string, questionIdx: number) {
  const question = test.questions[questionIdx]!;
  const total = test.questions.length;

  const examplesText = question.suggestions.length > 0
    ? `\n-# *Ex : ${question.suggestions.join(' · ')}*`
    : '';

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### 🧠 ${test.subject}\n**Question ${questionIdx + 1} / ${total}**\n\n${question.text}${examplesText}`,
    ),
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PTEST_BUTTON_PREFIX}:respond:${testId}:${questionIdx}`)
      .setLabel('✏️ Répondre')
      .setStyle(ButtonStyle.Primary),
  );

  return { container, rows: [row] };
}

function buildTestAnnouncement(test: GeneratedPersonalityTest, testId: string) {
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🧠 Test de personnalité\n### ${test.subject}\n\n${test.questions.length} questions ouvertes · Qui es-tu vraiment ?`,
    ),
  );
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PTEST_BUTTON_PREFIX}:start:${testId}`)
      .setLabel('Participer')
      .setStyle(ButtonStyle.Primary),
  );
  return [container, row] as const;
}

function buildResultsContainer(results: TestResult[]) {
  const lines =
    results.length === 0
      ? ['*Aucun résultat pour l\'instant...*']
      : results.map((r) => `${r.personality.emoji} <@${r.userId}> → **${r.personality.name}**`);

  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(['## 📊 Résultats', '', ...lines].join('\n')),
  );
}

function buildPersonalResult(test: GeneratedPersonalityTest, personality: PersonalityResult) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 🧠 ${test.subject}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${personality.emoji} Tu es : **${personality.name}**\n\n${personality.description}`,
      ),
    );
}

async function finishTest(
  client: BotClient,
  interaction: ButtonInteraction | ModalSubmitInteraction,
  testId: string,
  session: ActiveTest,
  answers: string[],
): Promise<void> {
  const personality = await PersonalityTestGeneratorService.analyzeAnswers(
    session.test.subject,
    session.test.questions,
    answers,
  );

  await interaction.editReply({
    components: [buildPersonalResult(session.test, personality)],
    flags: MessageFlags.IsComponentsV2,
  });

  userAnswers.delete(`${testId}:${interaction.user.id}`);
  session.results.push({ userId: interaction.user.id, personality });

  const guild = client.guilds.cache.get(process.env.GUILD_ID!);
  const channel = (await guild?.channels.fetch(session.channelId).catch(() => null)) as TextChannel | null;
  if (channel) {
    const resultsMsg = await channel.messages.fetch(session.resultMessageId).catch(() => null);
    if (resultsMsg) {
      await resultsMsg.edit({
        components: [...buildTestAnnouncement(session.test, testId), buildResultsContainer(session.results)],
        flags: MessageFlags.IsComponentsV2,
      });

      const thread = await guild?.channels.fetch(session.threadId).catch(() => null);
      if (thread?.isThread()) {
        if (thread.archived) await thread.setArchived(false);
        await thread.send({
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`<@${interaction.user.id}>`),
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## ${personality.emoji} **${personality.name}**\n\n${personality.description}`,
                ),
              ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    }
  }

  await Promise.all([
    UserModel.findOneAndUpdate(
      { discordId: interaction.user.id },
      { $inc: { 'stats.personalityTestsCount': 1 } },
    ),
    awardExpeditions(interaction.user.id, 2),
  ]);
}

export class PersonalityTestService {
  static async getChannel(client: BotClient): Promise<TextChannel | null> {
    const config = await PersonalityTestConfigRepository.getOrCreate();
    if (!config.channelId) return null;
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const channel = (await guild?.channels.fetch(config.channelId).catch(() => null)) ?? null;
    return channel as TextChannel | null;
  }

  static async rehydrate(_client: BotClient): Promise<void> {
    const sessions = await PersonalityTestSessionRepository.findAll();
    for (const session of sessions) {
      activeSessions.set(session.testId, {
        test: session.testData,
        channelId: session.channelId,
        resultMessageId: session.resultMessageId,
        threadId: session.threadId ?? '',
        started: new Set(),
        results: [],
      });
    }
    console.log(`[PersonalityTest] ${sessions.length} session(s) rechargée(s)`);
  }

  static async launch(client: BotClient, subject: string): Promise<void> {
    const channel = await this.getChannel(client);
    if (!channel) throw new Error('Channel non configuré pour les tests de personnalité.');

    const test = await PersonalityTestGeneratorService.generate(subject);
    const testId = `ptest-${Date.now()}`;

    const message = await channel.send({
      components: [...buildTestAnnouncement(test, testId), buildResultsContainer([])],
      flags: MessageFlags.IsComponentsV2,
    });

    const thread = await message.startThread({
      name: `🧠 ${test.subject}`,
      autoArchiveDuration: 1440,
    });

    await PersonalityTestSessionRepository.create({
      testId,
      subject: test.subject,
      channelId: channel.id,
      resultMessageId: message.id,
      threadId: thread.id,
      testData: test,
    });

    activeSessions.set(testId, {
      test,
      channelId: channel.id,
      resultMessageId: message.id,
      threadId: thread.id,
      started: new Set(),
      results: [],
    });
  }

  static async closeTest(testId: string): Promise<void> {
    activeSessions.delete(testId);
    await PersonalityTestSessionRepository.delete(testId);
  }

  static getActiveSessions(): Map<string, ActiveTest> {
    return activeSessions;
  }

  static async handleStart(interaction: ButtonInteraction): Promise<void> {
    const testId = interaction.customId.split(':')[2]!;
    const session = activeSessions.get(testId);

    if (!session) {
      await interaction.reply({ content: 'Ce test n\'est plus disponible.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (session.started.has(interaction.user.id)) {
      await interaction.reply({ content: 'Tu as déjà participé à ce test.', flags: MessageFlags.Ephemeral });
      return;
    }

    session.started.add(interaction.user.id);
    userAnswers.set(`${testId}:${interaction.user.id}`, []);

    const { container, rows } = buildQuestion(session.test, testId, 0);
    await interaction.reply({
      components: [container, ...rows],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }

  private static buildModal(
    testId: string,
    questionIdx: number,
    totalQuestions: number,
    questionLabel: string,
    prefill?: string,
  ): ModalBuilder {
    return new ModalBuilder()
      .setCustomId(`${PTEST_BUTTON_PREFIX}:respond_modal:${testId}:${questionIdx}`)
      .setTitle(`Question ${questionIdx + 1} / ${totalQuestions}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('answer')
            .setLabel(questionLabel.slice(0, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Ta réponse...')
            .setValue(prefill ?? '')
            .setRequired(true)
            .setMaxLength(500),
        ),
      );
  }

  static async handleRespondButton(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const testId = parts[2]!;
    const questionIdx = parseInt(parts[3]!, 10);

    const session = activeSessions.get(testId);
    if (!session) {
      await interaction.reply({ content: 'Ce test n\'est plus disponible.', flags: MessageFlags.Ephemeral });
      return;
    }

    const question = session.test.questions[questionIdx]!;
    await interaction.showModal(
      this.buildModal(testId, questionIdx, session.test.questions.length, question.text),
    );
  }

  private static async processAnswer(
    client: BotClient,
    interaction: ButtonInteraction | ModalSubmitInteraction,
    testId: string,
    session: ActiveTest,
    questionIdx: number,
    answer: string,
  ): Promise<void> {
    const key = `${testId}:${interaction.user.id}`;
    const answers = userAnswers.get(key) ?? [];
    answers[questionIdx] = answer;
    userAnswers.set(key, answers);

    const nextIdx = questionIdx + 1;
    if (nextIdx < session.test.questions.length) {
      const { container, rows } = buildQuestion(session.test, testId, nextIdx);
      await interaction.editReply({ components: [container, ...rows], flags: MessageFlags.IsComponentsV2 });
    } else {
      await interaction.editReply({
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### 🧠 Analyse en cours...\n\nL\'IA analyse tes réponses, ça arrive dans quelques secondes !'),
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
      await finishTest(client, interaction, testId, session, answers);
    }
  }

static async handleRespondModal(client: BotClient, interaction: ModalSubmitInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const testId = parts[2]!;
    const questionIdx = parseInt(parts[3]!, 10);

    const session = activeSessions.get(testId);
    if (!session) {
      await interaction.deferUpdate();
      await interaction.editReply({ content: 'Ce test n\'est plus disponible.', components: [] });
      return;
    }

    const answer = interaction.fields.getTextInputValue('answer');
    await interaction.deferUpdate();
    await this.processAnswer(client, interaction, testId, session, questionIdx, answer);
  }

  static async handleButton(_client: BotClient, interaction: ButtonInteraction): Promise<void> {
    const action = interaction.customId.split(':')[1];
    if (action === 'start') return this.handleStart(interaction);
    if (action === 'respond') return this.handleRespondButton(interaction);
  }

  static async handleModal(client: BotClient, interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(':')[1];
    if (action === 'respond_modal') return this.handleRespondModal(client, interaction);
  }
}
