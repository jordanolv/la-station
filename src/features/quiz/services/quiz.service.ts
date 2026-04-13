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
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { BotClient } from '../../../bot/client';
import { QuizConfigRepository } from '../repositories/quiz-config.repository';
import { PeakHuntersConfigRepository } from '../../peak-hunters/repositories/peak-hunters-config.repository';
import { QuizGeneratorService } from './quiz-generator.service';
import { LogService } from '../../../shared/logs/logs.service';
import { awardExpeditions } from '../../peak-hunters/services/expedition.service';

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string | null;
}

export const QUIZ_BUTTON_PREFIX = 'quiz:answer';
const REVEAL_HOUR = 19;
const TZ = 'Europe/Paris';
const CHOICE_EMOJIS = ['🅰️', '🅱️', '🅲', '🅳'];

function getTodayRevealDate(): Date {
  const nowParis = toZonedTime(new Date(), TZ);
  const naive = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate(), REVEAL_HOUR, 0, 0);
  return fromZonedTime(naive, TZ);
}

export class QuizService {
  private static async getChannel(client: BotClient): Promise<TextChannel | null> {
    const mountainConfig = await PeakHuntersConfigRepository.get();
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
    let correct = 0;
    let wrong = 0;
    for (const choiceIndex of Object.values(answers)) {
      choiceIndex === question.answer ? correct++ : wrong++;
    }

    const lines = ['## 🏔️ Question du jour', '', `**${question.question}**`];

    if (Object.keys(answers).length > 0) {
      lines.push('');
      if (correct > 0) lines.push(`✅ **${correct}** bonne${correct > 1 ? 's' : ''} réponse${correct > 1 ? 's' : ''}`);
      if (wrong > 0) lines.push(`❌ **${wrong}** mauvaise${wrong > 1 ? 's' : ''} réponse${wrong > 1 ? 's' : ''}`);
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

    const existing = await QuizConfigRepository.getOrCreate();
    if (existing.activeMessageId) return;

    const recent = existing.recentQuestionTexts ?? [];
    const question = await QuizGeneratorService.generate(recent);
    const { container, row } = this.buildComponents(question, {});

    const message = await channel.send({
      components: [container, row],
      flags: MessageFlags.IsComponentsV2,
    });

    await QuizConfigRepository.setActiveQuestion(message.id, question, getTodayRevealDate());
  }

  static async rehydrate(client: BotClient): Promise<void> {
    const config = await QuizConfigRepository.getOrCreate();
    if (!config.activeMessageId || !config.activeQuestion || !config.activeUntil) return;

    const remaining = new Date(config.activeUntil).getTime() - Date.now();
    if (remaining <= 0) {
      await this.reveal(client, config.activeMessageId, config.activeQuestion);
    }
  }

  static async revealActive(client: BotClient): Promise<void> {
    const config = await QuizConfigRepository.getOrCreate();
    if (!config.activeMessageId || !config.activeQuestion) return;
    await this.reveal(client, config.activeMessageId, config.activeQuestion);
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

    const config = await QuizConfigRepository.getOrCreate();
    const question = config.activeQuestion;

    if (!question || question.id !== questionId) {
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
      const { summary } = await awardExpeditions(interaction.user.id, packs);
      await LogService.info(`<@${interaction.user.id}> a remporté **${packs} ticket${packs > 1 ? 's' : ''}** ${summary}${isFirst ? ' (premier à répondre)' : ''}`, { feature: 'Quiz', title: '🎟️ Tickets gagnés' });
      await interaction.reply({
        content: isFirst
          ? `✅ Bonne réponse ! Premier à répondre — tu remportes **2 tickets de pack** ${summary}`
          : `✅ Bonne réponse ! Tu remportes **1 ticket de pack** ${summary}`,
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
