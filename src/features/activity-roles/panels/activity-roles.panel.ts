import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  ButtonInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { ActivityRolesConfigRepository } from '../repositories/activity-roles-config.repository';
import { ActivityRolesService } from '../services/activity-roles.service';

const PANEL_ID = 'activity-roles';
const ACCENT_ON = 0x2ecc71;
const ACCENT_OFF = 0xed4245;

export const activityRolesPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Rôles d\'activité',
  emoji: '🎖️',
  description: 'Attribution automatique de rôles selon l\'activité vocale hebdomadaire',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const config = await ActivityRolesConfigRepository.getOrCreate();
    const enabled = config.enabled;

    const mainContainer = new ContainerBuilder()
      .setAccentColor(enabled ? ACCENT_ON : ACCENT_OFF)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🎖️ Rôles d\'activité'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Statut\n${enabled ? '✅ Activé' : '❌ Désactivé'}\nMise à jour automatique chaque **lundi minuit**`,
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
            '### Seuils du classement',
            `🏆 **Podium** — Top 3 absolu`,
            `🔥 **Actif** — Top **${config.activeThresholdPercent}%** (hors podium)`,
            `💬 **Présent** — Top ${config.activeThresholdPercent + 1}–**${config.regularThresholdPercent}%**`,
            `👻 **Inactif** — Reste du serveur`,
          ].join('\n'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'run_now'))
            .setLabel('▶️ Lancer maintenant')
            .setStyle(ButtonStyle.Primary),
        ),
      );

    const rolesContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('### 🏷️ Configuration des rôles'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🏆 **Podium** : ${config.podiumRoleId ? `<@&${config.podiumRoleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'role_podium'))
            .setPlaceholder('Rôle top 3'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🔥 **Actif** : ${config.activeRoleId ? `<@&${config.activeRoleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'role_active'))
            .setPlaceholder('Rôle actif'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`💬 **Présent** : ${config.regularRoleId ? `<@&${config.regularRoleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'role_regular'))
            .setPlaceholder('Rôle présent'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`👻 **Inactif** : ${config.inactiveRoleId ? `<@&${config.inactiveRoleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'role_inactive'))
            .setPlaceholder('Rôle inactif'),
        ),
      );

    return [mainContainer, rolesContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const id = interaction.customId.split(':')[2];

    if (id === 'toggle') {
      const config = await ActivityRolesConfigRepository.getOrCreate();
      await ActivityRolesConfigRepository.update({ enabled: !config.enabled });
      await interaction.reply({ content: !config.enabled ? '✅ Rôles d\'activité activés !' : '❌ Rôles d\'activité désactivés.', flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }

    if (id === 'run_now') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await ActivityRolesService.run(client);
      await interaction.editReply({ content: '✅ Rotation des rôles effectuée.' });
      return;
    }
  },

  async handleSelectMenu(interaction: RoleSelectMenuInteraction, client: BotClient): Promise<void> {
    const id = interaction.customId.split(':')[2];
    const roleId = interaction.values[0] ?? null;

    const fieldMap: Record<string, string> = {
      role_podium: 'podiumRoleId',
      role_active: 'activeRoleId',
      role_regular: 'regularRoleId',
      role_inactive: 'inactiveRoleId',
    };

    const field = fieldMap[id];
    if (field) {
      await ActivityRolesConfigRepository.update({ [field]: roleId });
      await interaction.reply({ content: '✅ Rôle mis à jour.', flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }
  },
};
