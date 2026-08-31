import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { QuizConfigRepository } from '../repositories/quiz-config.repository';
import { QuizService } from '../services/quiz.service';

const PANEL_ID = 'quiz';

export const quizPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Quiz',
  emoji: '❓',
  description: 'Question du jour',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await QuizConfigRepository.getOrCreate();
    const questions = config.activeQuestions ?? [];
    const active = questions.length > 0;

    const status = active
      ? `**Question du jour active** — thèmes : ${questions.map((q) => q.theme).join(', ')}\n**${Object.keys(config.activeThemeChoices ?? {}).length}** participant(s), **${Object.keys(config.activeAnswers ?? {}).length}** réponse(s) — récap à 22h`
      : 'Aucune question active. La prochaine sera postée à 13h.';

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❓ Quiz'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(status))
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'repost'))
              .setLabel(active ? '🔄 Relancer la question' : '🚀 Lancer une question')
              .setStyle(active ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      );

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];
    if (action !== 'repost') return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const posted = await QuizService.repost(client);
    await interaction.editReply({
      content: posted
        ? '✅ Nouvelle question du jour lancée ! Les réponses de l\'ancienne sont annulées.'
        : '❌ Impossible de poster : aucun channel de spawn configuré (panel Peak Hunters).',
    });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
