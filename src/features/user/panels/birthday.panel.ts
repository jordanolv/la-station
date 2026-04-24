import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';

const PANEL_ID = 'birthday';

export const birthdayPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Anniversaires',
  emoji: '🎂',
  description: 'Notification automatique des anniversaires',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const birthday = appConfig.features?.birthday;
    const enabled = birthday?.enabled ?? false;
    const channelId = birthday?.channel;

    const statusText = enabled ? '✅ Activé' : '❌ Désactivé';
    const channelText = channelId ? `<#${channelId}>` : '*Non défini*';
    const accent = enabled ? 0x57f287 : 0xed4245;

    const container = new ContainerBuilder()
      .setAccentColor(accent)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🎂 Anniversaires'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Statut\n${statusText}`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'toggle'))
              .setLabel(enabled ? 'Désactiver' : 'Activer')
              .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 📢 Salon de notification\n${channelText}`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_channel'))
            .setPlaceholder('Choisir le salon des anniversaires')
            .setChannelTypes(ChannelType.GuildText),
        ),
      );

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    if (!appConfig.features.birthday) {
      appConfig.features.birthday = { channel: '', enabled: false } as any;
    }
    appConfig.features.birthday!.enabled = !appConfig.features.birthday!.enabled;
    await appConfig.save();

    const now = appConfig.features.birthday!.enabled;
    await interaction.reply({
      content: now ? '✅ Anniversaires activés !' : '❌ Anniversaires désactivés.',
      flags: MessageFlags.Ephemeral,
    });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleSelectMenu(
    interaction: ChannelSelectMenuInteraction,
    client: BotClient,
  ): Promise<void> {
    const channelId = interaction.values[0];
    const appConfig = await AppConfigService.getOrCreateConfig();

    if (!appConfig.features.birthday) {
      appConfig.features.birthday = { channel: '', enabled: false } as any;
    }
    appConfig.features.birthday!.channel = channelId;
    await appConfig.save();

    await interaction.reply({
      content: `✅ Salon des anniversaires : <#${channelId}>`,
      flags: MessageFlags.Ephemeral,
    });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
