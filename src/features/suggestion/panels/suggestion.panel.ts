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

const PANEL_ID = 'suggestion';

async function ensureConfig() {
  const appConfig = await AppConfigService.getOrCreateConfig();
  if (!appConfig.features.suggestion) {
    appConfig.features.suggestion = { enabled: false, channels: [] } as any;
  }
  const sug = appConfig.features.suggestion! as any;
  if (!Array.isArray(sug.channels)) {
    sug.channels = [];
  }
  if (sug.channelId && typeof sug.channelId === 'string' && !sug.channels.includes(sug.channelId)) {
    sug.channels.push(sug.channelId);
    sug.channelId = undefined;
    appConfig.markModified('features.suggestion');
  }
  return appConfig;
}

export const suggestionPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Suggestions',
  emoji: '💡',
  description: 'Vote + thread automatique sur chaque message des salons choisis',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await ensureConfig();
    await appConfig.save();
    const cfg = appConfig.features!.suggestion!;
    const enabled = cfg.enabled ?? false;
    const channels = cfg.channels ?? [];

    const statusText = enabled ? '✅ Activé' : '❌ Désactivé';
    const accent = enabled ? 0x57f287 : 0xed4245;

    const container = new ContainerBuilder()
      .setAccentColor(accent)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 💡 Suggestions'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# Chaque message posté dans un des salons reçoit automatiquement 👍 / 👎 et un thread de débat.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Statut\n${statusText}`),
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
        new TextDisplayBuilder().setContent(`### 📢 Salons configurés (${channels.length})`),
      );

    if (channels.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# *Aucun salon configuré*'),
      );
    } else {
      for (const channelId of channels) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`<#${channelId}>`),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(panelCustomId(PANEL_ID, `remove:${channelId}`))
                .setLabel('Retirer')
                .setStyle(ButtonStyle.Danger),
            ),
        );
      }
    }

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'add_channels'))
            .setPlaceholder('➕ Ajouter un ou plusieurs salons')
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setMinValues(1)
            .setMaxValues(25),
        ),
      );

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'toggle') {
      const appConfig = await ensureConfig();
      appConfig.features.suggestion!.enabled = !appConfig.features.suggestion!.enabled;
      appConfig.markModified('features.suggestion');
      await appConfig.save();

      const now = appConfig.features.suggestion!.enabled;
      await interaction.reply({
        content: now ? '✅ Suggestions activées !' : '❌ Suggestions désactivées.',
        flags: MessageFlags.Ephemeral,
      });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }

    if (action.startsWith('remove:')) {
      const channelId = action.split(':')[1];
      const appConfig = await ensureConfig();
      const list = appConfig.features.suggestion!.channels;
      appConfig.features.suggestion!.channels = list.filter((id) => id !== channelId);
      appConfig.markModified('features.suggestion');
      await appConfig.save();

      await interaction.reply({
        content: `✅ Salon <#${channelId}> retiré.`,
        flags: MessageFlags.Ephemeral,
      });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }
  },

  async handleSelectMenu(interaction: ChannelSelectMenuInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];
    if (action !== 'add_channels') return;

    const appConfig = await ensureConfig();
    const current = new Set(appConfig.features.suggestion!.channels);
    const added: string[] = [];
    for (const id of interaction.values) {
      if (!current.has(id)) {
        current.add(id);
        added.push(id);
      }
    }

    appConfig.features.suggestion!.channels = [...current];
    appConfig.markModified('features.suggestion');
    await appConfig.save();

    const message = added.length
      ? `✅ Salons ajoutés : ${added.map((id) => `<#${id}>`).join(', ')}`
      : 'ℹ️ Ces salons sont déjà configurés.';

    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
