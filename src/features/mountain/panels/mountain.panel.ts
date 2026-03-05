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
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { MountainConfigRepository } from '../repositories/mountain-config.repository';
import { MountainService } from '../services/mountain.service';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { SPAWN_MAX_PER_DAY, SPAWN_HOUR_START, SPAWN_HOUR_END, RARITY_CONFIG } from '../constants/mountain.constants';

const PANEL_ID = 'mountain';
const ACCENT_ON = 0x2ecc71;
const ACCENT_OFF = 0xed4245;

export const mountainPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Montagnes',
  emoji: '⛰️',
  description: 'Système de collection de montagnes',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await MountainConfigRepository.getOrCreate();
    const enabled = config.enabled;
    const spawnChannel = config.spawnChannelId;
    const notifChannel = config.notificationChannelId;
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
      );

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const config = await MountainConfigRepository.getOrCreate();
    await MountainConfigRepository.toggle(!config.enabled);

    await interaction.reply({
      content: !config.enabled ? '✅ Montagnes activées !' : '❌ Montagnes désactivées.',
      ephemeral: true,
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
      await MountainConfigRepository.setSpawnChannel(channelId);
      await interaction.reply({
        content: `✅ Salon de spawn : <#${channelId}>`,
        ephemeral: true,
      });
    }

    if (action === 'select_notif') {
      await MountainConfigRepository.setNotificationChannel(channelId);
      await interaction.reply({
        content: `✅ Salon de notification montagne : <#${channelId}>`,
        ephemeral: true,
      });
    }

    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
