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
import { VoiceService } from '../services/voice.service';
import { VoiceConfigRepository } from '../repositories/voice-config.repository';

const PANEL_ID = 'voice';
const ACCENT_ON = 0x57f287;
const ACCENT_OFF = 0xed4245;

export const voicePanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Salons Vocaux',
  emoji: '🔊',
  description: 'Création automatique de salons vocaux',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await VoiceService.getOrCreateConfig();
    const enabled = config.enabled ?? false;
    const joinChannels = config.joinChannels ?? [];
    const notifChannelId = config.notificationChannelId;

    const configContainer = new ContainerBuilder()
      .setAccentColor(enabled ? ACCENT_ON : ACCENT_OFF)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔊 Salons Vocaux'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Statut\n${enabled ? '✅ Activé' : '❌ Désactivé'}`),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'toggle'))
              .setLabel(enabled ? 'Désactiver' : 'Activer')
              .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 📢 Channel de notification\n${notifChannelId ? `<#${notifChannelId}>` : '-# *Non configuré — les récaps de session ne seront pas envoyés*'}`,
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'set_notif_channel'))
            .setPlaceholder('Définir le channel de notification')
            .setChannelTypes(ChannelType.GuildText),
        ),
      );

    const listContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🚪 Salons join-to-create (${joinChannels.length})`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'add_join_channel'))
            .setPlaceholder('Ajouter un salon join-to-create')
            .setChannelTypes(ChannelType.GuildVoice),
        ),
      );

    if (joinChannels.length > 0) {
      listContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      for (const jc of joinChannels) {
        listContainer.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `<#${jc.id}>\n-# template : \`${jc.nameTemplate}\``,
              ),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(panelCustomId(PANEL_ID, `remove_join:${jc.id}`))
                .setLabel('🗑️')
                .setStyle(ButtonStyle.Danger),
            ),
        );
      }
    } else {
      listContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# *Aucun salon configuré*'),
      );
    }

    return [configContainer, listContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'toggle') {
      const config = await VoiceService.getOrCreateConfig();
      await VoiceService.toggleFeature(!config.enabled);
      await interaction.reply({
        content: !config.enabled ? '✅ Salons vocaux activés !' : '❌ Salons vocaux désactivés.',
        ephemeral: true,
      });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }

    if (action.startsWith('remove_join:')) {
      const channelId = action.split(':')[1];
      await VoiceService.removeJoinChannel(channelId);
      await interaction.reply({
        content: `✅ Salon <#${channelId}> retiré de la liste join-to-create.`,
        ephemeral: true,
      });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }
  },

  async handleSelectMenu(
    interaction: ChannelSelectMenuInteraction,
    client: BotClient,
  ): Promise<void> {
    const action = interaction.customId.split(':')[2];
    const channelId = interaction.values[0];

    if (action === 'add_join_channel') {
      const channel = interaction.guild?.channels.cache.get(channelId);
      const categoryId = channel?.parentId ?? channelId;
      await VoiceService.addJoinChannel(channelId, categoryId);
      await interaction.reply({
        content: `✅ Salon join-to-create ajouté : <#${channelId}>`,
        ephemeral: true,
      });
    }

    if (action === 'set_notif_channel') {
      await VoiceConfigRepository.setNotificationChannel(channelId);
      await interaction.reply({
        content: `✅ Channel de notification défini : <#${channelId}>`,
        ephemeral: true,
      });
    }

    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
