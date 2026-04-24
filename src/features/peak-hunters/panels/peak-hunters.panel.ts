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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { PeakHuntersConfigRepository } from '../repositories/peak-hunters-config.repository';
import { MountainService } from '../services/mountain.service';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { SPAWN_MAX_PER_DAY, SPAWN_HOUR_START, SPAWN_HOUR_END, EXPEDITION_TIER_CONFIG } from '../constants/peak-hunters.constants';
import type { ExpeditionTier } from '../types/peak-hunters.types';

const PANEL_ID = 'mountain';
const ACCENT_ON = 0x2ecc71;
const ACCENT_OFF = 0xed4245;

export const peakHuntersPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Montagnes',
  emoji: '⛰️',
  description: 'Système de collection de montagnes',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await PeakHuntersConfigRepository.getOrCreate();
    const enabled = config.enabled;
    const spawnChannel = config.spawnChannelId;
    const notifChannel = config.notificationChannelId;
    const raidChannel = config.raidChannelId;
    const totalMountains = MountainService.count;

    const pendingSpawns = config.spawnSchedule.filter(d => new Date(d) > new Date()).length;

    const container = new ContainerBuilder()
      .setAccentColor(enabled ? ACCENT_ON : ACCENT_OFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# ⛰️ Montagnes'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Statut\n${enabled ? '✅ Activé' : '❌ Désactivé'}`,
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
          [
            '### 📊 Statistiques',
            `-# 🗺️ **${totalMountains}** montagnes chargées`,
            `-# 🎯 **${SPAWN_MAX_PER_DAY}** spawn(s) max/jour`,
            `-# ⏰ Fenêtre : **${SPAWN_HOUR_START}h — ${SPAWN_HOUR_END}h**`,
            `-# 📌 **${pendingSpawns}** spawn(s) programmé(s)`,
          ].join('\n'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🌄 Salon de spawn\n${spawnChannel ? `<#${spawnChannel}>` : '*Non défini*'}`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_spawn'))
            .setPlaceholder('Salon où apparaissent les montagnes')
            .setChannelTypes(ChannelType.GuildText),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🔔 Salon de notification\n${notifChannel ? `<#${notifChannel}>` : '*Non défini*'}`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_notif'))
            .setPlaceholder('Notifications (unlock, doublons, épiques...)')
            .setChannelTypes(ChannelType.GuildText),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ⚔️ Salon des raids\n${raidChannel ? `<#${raidChannel}>` : '*Non défini*'}`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_raid'))
            .setPlaceholder('Annonces de raids (début, progression, résultats)')
            .setChannelTypes(ChannelType.GuildText),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 🗺️ Distribution d\'expéditions'),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'give_expe_sentier'))
            .setLabel('Sentier')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'give_expe_falaise'))
            .setLabel('Falaise')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'give_expe_sommet'))
            .setLabel('Sommet')
            .setStyle(ButtonStyle.Danger),
        ),
      );

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    const TIERS: ExpeditionTier[] = ['sentier', 'falaise', 'sommet'];
    const matchedTier = TIERS.find(t => action === `give_expe_${t}`);
    if (matchedTier) {
      const { label } = EXPEDITION_TIER_CONFIG[matchedTier];
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, `modal_give_expe_${matchedTier}`))
        .setTitle(`🗺️ Expéditions ${label}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('amount')
              .setLabel(`Expéditions ${label} à donner`)
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ex: 5')
              .setMinLength(1)
              .setMaxLength(3)
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    const config = await PeakHuntersConfigRepository.getOrCreate();
    await PeakHuntersConfigRepository.toggle(!config.enabled);

    await interaction.reply({
      content: !config.enabled ? '✅ Montagnes activées !' : '❌ Montagnes désactivées.',
      flags: MessageFlags.Ephemeral,
    });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleSelectMenu(
    interaction: ChannelSelectMenuInteraction,
    client: BotClient,
  ): Promise<void> {
    const action = interaction.customId.split(':')[2];
    const channelId = interaction.values[0];

    if (action === 'select_spawn') {
      await PeakHuntersConfigRepository.setSpawnChannel(channelId);
      await interaction.reply({
        content: `✅ Salon de spawn : <#${channelId}>`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === 'select_notif') {
      await PeakHuntersConfigRepository.setNotificationChannel(channelId);
      await interaction.reply({
        content: `✅ Salon de notification montagne : <#${channelId}>`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === 'select_raid') {
      await PeakHuntersConfigRepository.setRaidChannel(channelId);
      await interaction.reply({
        content: `✅ Salon des raids : <#${channelId}>`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleModal(interaction: ModalSubmitInteraction, _client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    const TIERS: ExpeditionTier[] = ['sentier', 'falaise', 'sommet'];
    const matchedTier = TIERS.find(t => action === `modal_give_expe_${t}`);
    if (matchedTier) {
      const raw = interaction.fields.getTextInputValue('amount').trim();
      const amount = parseInt(raw, 10);

      if (isNaN(amount) || amount <= 0) {
        await interaction.reply({ content: '❌ Nombre invalide.', flags: MessageFlags.Ephemeral });
        return;
      }

      const { label, emoji } = EXPEDITION_TIER_CONFIG[matchedTier];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const count = await UserMountainsRepository.addExpeditionsToAll(amount, matchedTier);
      await interaction.editReply({ content: `✅ **+${amount} expédition${amount > 1 ? 's' : ''}** ${emoji} **${label}** distribuées à **${count}** joueurs.` });
    }
  },
};
