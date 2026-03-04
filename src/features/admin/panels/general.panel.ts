import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';
import { LogService } from '../../../shared/logs/logs.service';

const PANEL_ID = 'general';
const ACCENT = 0xdac1ff;

const CHANNEL_KEYS = [
  { key: 'welcome', label: 'Bienvenue', emoji: '👋' },
] as const;

export const generalPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Général',
  emoji: '🛠️',
  description: 'Préfixe, couleurs et salons',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const prefix = appConfig.config?.prefix ?? '!';
    const primaryColor = appConfig.config?.colors?.get('primary') ?? '#dac1ff';
    const channels = appConfig.config?.channels ?? {};

    const configContainer = new ContainerBuilder()
      .setAccentColor(ACCENT)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🛠️ Configuration Générale'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ✏️ Préfixe\nActuellement : \`${prefix}\``),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'edit_prefix'))
              .setLabel('Modifier')
              .setStyle(ButtonStyle.Secondary),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### 🎨 Couleur primaire\nActuellement : \`${primaryColor}\``),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'edit_color'))
              .setLabel('Modifier')
              .setStyle(ButtonStyle.Secondary),
          ),
      );

    const channelsContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 📋 Salons'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    for (const ck of CHANNEL_KEYS) {
      const val = (channels as any)[ck.key];
      const status = val ? `✅ Activé — <#${val}>` : '❌ Désactivé';
      channelsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${ck.emoji} ${ck.label}\n${status}`),
      );
      channelsContainer.addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, `select_${ck.key}`))
            .setPlaceholder(`Choisir : ${ck.label}`)
            .setChannelTypes(ChannelType.GuildText),
        ),
      );
      if (val) {
        channelsContainer.addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `clear_${ck.key}`))
              .setLabel(`Retirer ${ck.label}`)
              .setStyle(ButtonStyle.Danger),
          ),
        );
      }
    }

    return [configContainer, channelsContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    const clearMatch = action.match(/^clear_(.+)$/);
    if (clearMatch) {
      const channelKey = clearMatch[1];
      const def = CHANNEL_KEYS.find((ck) => ck.key === channelKey);
      if (!def) return;

      const appConfig = await AppConfigService.getOrCreateConfig();
      if (appConfig.config.channels) {
        delete (appConfig.config.channels as any)[channelKey];
        appConfig.markModified('config.channels');
        await appConfig.save();
      }

      await interaction.reply({ content: `🗑️ ${def.emoji} **${def.label}** retiré.`, flags: MessageFlags.Ephemeral });
      LogService.info(client, `Salon **${def.label}** retiré.`, { title: '⚙️ Config mise à jour', feature: 'Général' }).catch(() => {});
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }

    if (action === 'edit_prefix') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_prefix'))
        .setTitle('Modifier le préfixe')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('prefix')
              .setLabel('Nouveau préfixe')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(5)
              .setValue(appConfig.config?.prefix ?? '!')
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
    }

    if (action === 'edit_color') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_color'))
        .setTitle('Modifier la couleur primaire')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('color')
              .setLabel('Couleur hexadécimale (ex: #dac1ff)')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(7)
              .setMinLength(4)
              .setValue(appConfig.config?.colors?.get('primary') ?? '#dac1ff')
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
    }
  },

  async handleSelectMenu(
    interaction: ChannelSelectMenuInteraction,
    client: BotClient,
  ): Promise<void> {
    const action = interaction.customId.split(':')[2];
    const match = action.match(/^select_(.+)$/);
    if (!match) return;

    const channelKey = match[1];
    const def = CHANNEL_KEYS.find((ck) => ck.key === channelKey);
    if (!def) return;

    const channelId = interaction.values[0];
    const appConfig = await AppConfigService.getOrCreateConfig();
    if (!appConfig.config.channels) appConfig.config.channels = {};
    (appConfig.config.channels as any)[channelKey] = channelId;
    appConfig.markModified('config.channels');
    await appConfig.save();

    await interaction.reply({
      content: `✅ ${def.emoji} **${def.label}** → <#${channelId}>`,
      ephemeral: true,
    });
    LogService.info(client, `Salon **${def.label}** configuré : <#${channelId}>`, { title: '⚙️ Config mise à jour', feature: 'Général' }).catch(() => {});
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleModal(interaction: ModalSubmitInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    if (action === 'modal_prefix') {
      const prefix = interaction.fields.getTextInputValue('prefix').trim();
      const appConfig = await AppConfigService.getOrCreateConfig();
      appConfig.config.prefix = prefix;
      await appConfig.save();

      await interaction.reply({ content: `✅ Préfixe mis à jour : \`${prefix}\``, flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }

    if (action === 'modal_color') {
      const color = interaction.fields.getTextInputValue('color').trim();
      if (!/^#[0-9a-fA-F]{3,6}$/.test(color)) {
        await interaction.reply({ content: '❌ Format invalide. Utilisez un code hex (ex: `#dac1ff`).', flags: MessageFlags.Ephemeral });
        return;
      }

      const appConfig = await AppConfigService.getOrCreateConfig();
      if (!appConfig.config.colors) appConfig.config.colors = new Map();
      appConfig.config.colors.set('primary', color);
      await appConfig.save();

      await interaction.reply({ content: `✅ Couleur primaire mise à jour : \`${color}\``, flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }
  },
};
