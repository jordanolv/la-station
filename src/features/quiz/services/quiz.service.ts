import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ButtonInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { QuizConfigRepository } from '../repositories/quiz-config.repository';
import { MountainConfigRepository } from '../../mountain/repositories/mountain-config.repository';
import { UserMountainsRepository } from '../../mountain/repositories/user-mountains.repository';
import questions from '../data/questions.json';

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string | null;
}

export const QUIZ_BUTTON_PREFIX = 'quiz:answer';
const ANSWER_DURATION_MS = 30 * 60 * 1000;
const CHOICE_EMOJIS = ['🅰️', '🅱️', '🅲', '🅳'];

export class QuizService {
  static pickQuestion(usedIds: string[]): QuizQuestion | null {
    const pool = (questions as QuizQuestion[]).filter(q => !usedIds.includes(q.id));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private static async getChannel(client: BotClient): Promise<TextChannel | null> {
    const mountainConfig = await MountainConfigRepository.get();
    const channelId = mountainConfig?.spawnChannelId;
    if (!channelId) return null;
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const channel = await guild?.channels.fetch(channelId).catch(() => null) ?? null;
    return channel as TextChannel | null;
  }

  private static buildComponents(
    question: QuizQuestion,
    answers: Record<string, number>,
    disabled = false,
  ) {
    const correct: string[] = [];
    const wrong: string[] = [];
    for (const [userId, choiceIndex] of Object.entries(answers)) {
      (choiceIndex === question.answer ? correct : wrong).push(`<@${userId}>`);
    }

    const lines = ['## 🏔️ Question du jour', '', `**${question.question}**`];

    if (Object.keys(answers).length > 0) {
      lines.push('');
      if (correct.length > 0) lines.push(`✅ **Bonne réponse**\n${correct.join('  ')}`);
      if (wrong.length > 0) lines.push(`❌ **Mauvaise réponse**\n${wrong.join('  ')}`);
    }

    if (disabled && question.explanation) {
      lines.push('', `> 💡 ${question.explanation}`);
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...question.choices.map((choice, i) =>
        new ButtonBuilder()
          .setCustomId(`${QUIZ_BUTTON_PREFIX}:${question.id}:${i}`)
          .setLabel(`${CHOICE_EMOJIS[i]}  ${choice}`)
          .setStyle(disabled && i === question.answer ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(disabled),
      ),
    );

    return { container, row };
  }

  static async post(client: BotClient): Promise<void> {
    const channel = await this.getChannel(client);
    if (!channel) return;

    const quizConfig = await QuizConfigRepository.getOrCreate();
    let question = this.pickQuestion(quizConfig.usedQuestionIds);
    if (!question) {
      await QuizConfigRepository.resetUsedQuestions();
      question = this.pickQuestion([]);
    }
    if (!question) return;

    const { container, row } = this.buildComponents(question, {});

    const message = await channel.send({
      components: [container, row],
      flags: MessageFlags.IsComponentsV2,
    });

    const activeUntil = new Date(Date.now() + ANSWER_DURATION_MS);
    await QuizConfigRepository.setActiveQuestion(message.id, question.id, activeUntil);
    await QuizConfigRepository.markQuestionUsed(question.id);

    // La révélation est gérée par le cron à 19h
  }

  static async rehydrate(client: BotClient): Promise<void> {
    const config = await QuizConfigRepository.getOrCreate();
    if (!config.activeMessageId || !config.activeQuestionId || !config.activeUntil) return;

    const question = (questions as QuizQuestion[]).find(q => q.id === config.activeQuestionId);
    if (!question) return;

    const remaining = new Date(config.activeUntil).getTime() - Date.now();
    if (remaining <= 0) {
      await this.reveal(client, config.activeMessageId, question);
    }
    // Si encore du temps → la révélation sera faite par le cron à 19h
  }

  static async revealActive(client: BotClient): Promise<void> {
    const config = await QuizConfigRepository.getOrCreate();
    if (!config.activeMessageId || !config.activeQuestionId) return;
    const question = (questions as QuizQuestion[]).find(q => q.id === config.activeQuestionId);
    if (!question) return;
    await this.reveal(client, config.activeMessageId, question);
  }

  static async reveal(client: BotClient, messageId: string, question: QuizQuestion): Promise<void> {
    const channel = await this.getChannel(client);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    const config = await QuizConfigRepository.getOrCreate();
    const { container, row } = this.buildComponents(question, config.activeAnswers ?? {}, true);

    await message.edit({
      components: [container, row],
      flags: MessageFlags.IsComponentsV2,
    });

    await QuizConfigRepository.clearActiveQuestion();
  }

  static async handleAnswer(client: BotClient, interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split(':');
    const questionId = parts[2];
    const choiceIndex = parseInt(parts[3], 10);

    const question = (questions as QuizQuestion[]).find(q => q.id === questionId);
    if (!question) {
      await interaction.reply({ content: '❌ Question introuvable.', flags: 64 });
      return;
    }

    const config = await QuizConfigRepository.getOrCreate();
    if (config.activeQuestionId !== questionId) {
      await interaction.reply({ content: 'Cette question est déjà terminée.', flags: 64 });
      return;
    }

    if (config.activeAnswers?.[interaction.user.id] !== undefined) {
      await interaction.reply({ content: 'Tu as déjà répondu à cette question.', flags: 64 });
      return;
    }

    const isCorrect = choiceIndex === question.answer;
    const isFirst = isCorrect && !config.firstCorrectUserId;

    await QuizConfigRepository.saveAnswer(interaction.user.id, choiceIndex, isFirst);

    if (isCorrect) {
      const packs = isFirst ? 2 : 1;
      await UserMountainsRepository.addTickets(interaction.user.id, packs);
      await interaction.reply({
        content: isFirst
          ? `✅ Bonne réponse ! Premier à répondre — tu remportes **2 tickets de pack** 🎟️🎟️`
          : `✅ Bonne réponse ! Tu remportes **1 ticket de pack** 🎟️`,
        flags: 64,
      });
    } else {
      await interaction.reply({ content: `❌ Mauvaise réponse.`, flags: 64 });
    }

    const channel = await this.getChannel(client);
    if (!channel || !config.activeMessageId) return;

    const message = await channel.messages.fetch(config.activeMessageId).catch(() => null);
    if (!message) return;

    const updatedConfig = await QuizConfigRepository.getOrCreate();
    const { container, row } = this.buildComponents(question, updatedConfig.activeAnswers ?? {});
    await message.edit({ components: [container, row], flags: MessageFlags.IsComponentsV2 });
  }
}
