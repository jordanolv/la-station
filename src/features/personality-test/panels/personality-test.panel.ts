import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ChannelType,
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { PersonalityTestConfigRepository } from '../repositories/personality-test-config.repository';
import { PersonalityTestSessionRepository } from '../repositories/personality-test-session.repository';
import { PersonalityTestService } from '../services/personality-test.service';

const PANEL_ID = 'personality-test';

export const personalityTestPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Test de personnalité',
  emoji: '🧠',
  description: 'Lance des tests de personnalité générés par IA dans un channel dédié',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await PersonalityTestConfigRepository.getOrCreate();
    const sessions = await PersonalityTestSessionRepository.findAll();

    const configContainer = new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🧠 Test de personnalité'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Channel\n${config.channelId ? `<#${config.channelId}>` : '*Non configuré*'}`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'launch'))
              .setLabel('🚀 Lancer un test')
              .setStyle(config.channelId ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(!config.channelId),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### Channel des tests'),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'channel'))
            .setPlaceholder('Sélectionner un channel texte')
            .setChannelTypes(ChannelType.GuildText),
        ),
      );

    if (sessions.length === 0) {
      return [configContainer];
    }

    const sessionsContainer = new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 📋 Tests en cours (${sessions.length})`),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    for (const session of sessions) {
      const date = new Date(session.createdAt);
      const timestamp = Math.floor(date.getTime() / 1000);
      sessionsContainer.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${session.subject}**\n<#${session.channelId}> · <t:${timestamp}:R>`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `close:${session.testId}`))
              .setLabel('Fermer')
              .setStyle(ButtonStyle.Danger),
          ),
      );
    }

    return [configContainer, sessionsContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    if (action === 'launch') {
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'launch_modal'))
        .setTitle('Lancer un test de personnalité')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('subject')
              .setLabel('Sujet du test')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Ex: super-héros, One Piece, animaux de la forêt...')
              .setRequired(true)
              .setMaxLength(500),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'close') {
      const testId = interaction.customId.split(':').slice(3).join(':');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await PersonalityTestService.closeTest(testId);
      await interaction.editReply({ content: '✅ Test fermé.' });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }
  },

  async handleSelectMenu(interaction: ChannelSelectMenuInteraction, client: BotClient): Promise<void> {
    const id = interaction.customId.split(':')[2];

    if (id === 'channel') {
      const channelId = interaction.values[0];
      if (channelId) await PersonalityTestConfigRepository.update({ channelId });
      await interaction.reply({ content: '✅ Channel mis à jour.', flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }
  },

  async handleModal(interaction: ModalSubmitInteraction, client: BotClient): Promise<void> {
    const id = interaction.customId.split(':')[2];

    if (id === 'launch_modal') {
      const subject = interaction.fields.getTextInputValue('subject');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await PersonalityTestService.launch(client, subject);
        await interaction.editReply({ content: `✅ Test **${subject}** généré et posté !` });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err: any) {
        await interaction.editReply({ content: `❌ ${err.message ?? 'Erreur lors de la génération.'}` });
      }
    }
  },
};
