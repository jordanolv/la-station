import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  ChannelType,
  PermissionFlagsBits,
  UserSelectMenuInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  LabelBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { VocManagerService, VOC_CONFIG_BUTTON_ID, VOC_INVITE_USER_SELECT_ID } from '../services/vocManager.service';

export const VOC_CONFIG_MODAL_ID = 'voc-config-modal';
export const VOC_NAME_INPUT_ID = 'voc-name-input';
export const VOC_LIMIT_INPUT_ID = 'voc-limit-input';
export const VOC_VISIBILITY_INPUT_ID = 'voc-visibility-input';

/**
 * Gère le clic sur le bouton de configuration du salon vocal
 */
export async function handleVocConfigButton(
  interaction: ButtonInteraction,
  client: BotClient
): Promise<void> {
  try {
    // Extraire guildId, channelId et ownerId depuis le customId du bouton
    const parts = interaction.customId.replace(`${VOC_CONFIG_BUTTON_ID}_`, '').split('_');
    const guildId = parts[0];
    const channelId = parts[1];
    const ownerId = parts[2];

    // Vérifier que c'est le créateur qui utilise le bouton
    if (interaction.user.id !== ownerId) {
      await interaction.reply({
        content: '❌ Seul le créateur du salon peut le configurer.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Récupérer la guild via le client (car l'interaction vient d'un DM)
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      await interaction.reply({
        content: '❌ Impossible de trouver le serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Vérifier que le canal existe
    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        content: '❌ Le salon vocal n\'existe plus.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Vérifier que l'utilisateur est dans le salon
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member?.voice.channelId || member.voice.channelId !== channelId) {
      await interaction.reply({
        content: '❌ Vous devez être dans le salon vocal pour le configurer.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Vérifier si le canal est privé (en regardant les permissions)
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const isPrivate = everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect) || false;

    // Créer le modal de configuration
    const modal = new ModalBuilder()
      .setCustomId(`${VOC_CONFIG_MODAL_ID}_${guildId}_${channelId}_${ownerId}`)
      .setTitle('⚙️ Configuration du salon vocal');

    // Champ pour le nom
    const nameInput = new TextInputBuilder()
      .setCustomId(VOC_NAME_INPUT_ID)
      .setLabel('Nom du salon')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Gaming entre potes')
      .setValue(channel.name)
      .setRequired(true)
      .setMaxLength(100);

    // Champ pour la limite d'utilisateurs
    const limitInput = new TextInputBuilder()
      .setCustomId(VOC_LIMIT_INPUT_ID)
      .setLabel('Limite d\'utilisateurs (0 = illimité)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5')
      .setValue(channel.userLimit?.toString() || '0')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    // Select menu pour la visibilité
    const visibilitySelect = new StringSelectMenuBuilder()
      .setCustomId(VOC_VISIBILITY_INPUT_ID)
      .setPlaceholder('Choisir la visibilité')
      .addOptions(
        {
          label: '🌐 Public',
          value: 'public',
          description: 'Tout le monde peut voir et rejoindre',
          default: !isPrivate
        },
        {
          label: '🔒 Privé',
          value: 'private',
          description: 'Seulement les personnes invitées',
          default: isPrivate
        }
      )
      .setMinValues(1)
      .setMaxValues(1)
      .setRequired(true);

    const visibilityLabel = new LabelBuilder()
      .setLabel('Visibilité:')
      .setStringSelectMenuComponent(visibilitySelect);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput),
      visibilityLabel as any
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('[VocConfig] Erreur lors de l\'affichage du modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/**
 * Gère la soumission du modal de configuration
 */
export async function handleVocConfigModal(
  interaction: ModalSubmitInteraction,
  client: BotClient
): Promise<void> {
  try {
    const parts = interaction.customId.replace(`${VOC_CONFIG_MODAL_ID}_`, '').split('_');
    const guildId = parts[0];
    const channelId = parts[1];
    const ownerId = parts[2] || interaction.user.id;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    // Récupérer les valeurs du formulaire
    const newName = interaction.fields.getTextInputValue(VOC_NAME_INPUT_ID).trim();
    const limitStr = interaction.fields.getTextInputValue(VOC_LIMIT_INPUT_ID).trim();

    // Récupérer la valeur du select menu pour la visibilité
    let visibilityValue = null;
    try {
      const rawComponents = (interaction as any).components;

      for (const row of rawComponents) {
        // Type 18 = LabelBuilder, le select menu est dans row.component (singulier)
        if (row.type === 18 && row.component?.customId === VOC_VISIBILITY_INPUT_ID) {
          visibilityValue = row.component.values?.[0];
          break;
        }
        // Type 1 = ActionRow classique, parcourir row.components (pluriel)
        else if (row.components) {
          for (const component of row.components) {
            if (component.customId === VOC_VISIBILITY_INPUT_ID) {
              visibilityValue = component.values?.[0];
              break;
            }
          }
        }
        if (visibilityValue) break;
      }
    } catch (error) {
      console.error('[VocConfig] Erreur lors de la récupération de la visibilité:', error);
    }

    const limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 0 || limit > 99) return;

    if (!visibilityValue || (visibilityValue !== 'public' && visibilityValue !== 'private')) return;
    const isPrivate = visibilityValue === 'private';

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildVoice) return;

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member?.voice.channelId || member.voice.channelId !== channelId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await channel.setName(newName);
      await channel.setUserLimit(limit);

      if (isPrivate) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
          Connect: false,
        });
      } else {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
          Connect: true,
        });

        for (const [id] of channel.permissionOverwrites.cache) {
          if (id !== guild.roles.everyone.id && id !== ownerId) {
            await channel.permissionOverwrites.delete(id);
          }
        }
      }

      await VocManagerService.updateConfigMessage(
        channelId,
        guildId,
        ownerId,
        isPrivate,
        newName,
        limit,
        client
      );

      const visibilityText = isPrivate ? '🔒 Privé' : '🌐 Public';
      const limitText = limit === 0 ? 'Illimité' : `${limit}`;
      await interaction.editReply({
        content: `📝 **${newName}** • 👥 ${limitText} • ${visibilityText}`,
      });
    } catch (error) {
      await interaction.editReply({
        content: '❌ Erreur',
      });
    }
  } catch (error) {}
}

/**
 * Gère la sélection d'un utilisateur à inviter via le User Select Menu
 */
export async function handleVocInviteUserSelect(
  interaction: UserSelectMenuInteraction,
  client: BotClient
): Promise<void> {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Extraire guildId, channelId et ownerId depuis le customId
    const parts = interaction.customId.replace(`${VOC_INVITE_USER_SELECT_ID}_`, '').split('_');
    const guildId = parts[0];
    const channelId = parts[1];
    const ownerId = parts[2];

    // Vérifier que c'est le créateur qui invite
    if (interaction.user.id !== ownerId) {
      await interaction.editReply({
        content: '❌ Seul le créateur du salon peut inviter des personnes.',
      });
      return;
    }

    // Récupérer la guild
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      await interaction.editReply({
        content: '❌ Impossible de trouver le serveur.',
      });
      return;
    }

    // Récupérer le canal
    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.editReply({
        content: '❌ Le salon vocal n\'existe plus.',
      });
      return;
    }

    // Vérifier que le créateur est toujours dans le salon
    const creator = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!creator?.voice.channelId || creator.voice.channelId !== channelId) {
      await interaction.editReply({
        content: '❌ Vous devez être dans le salon vocal pour inviter quelqu\'un.',
      });
      return;
    }

    const selectedUserIds = new Set(interaction.values);
    const currentInvitedUsers = new Set<string>();

    for (const [id] of channel.permissionOverwrites.cache) {
      if (id !== guild.roles.everyone.id && id !== ownerId) {
        currentInvitedUsers.add(id);
      }
    }

    const added: string[] = [];
    const removed: string[] = [];

    for (const userId of currentInvitedUsers) {
      if (!selectedUserIds.has(userId)) {
        await channel.permissionOverwrites.delete(userId);
        removed.push(`<@${userId}>`);
      }
    }

    for (const userId of selectedUserIds) {
      if (!currentInvitedUsers.has(userId)) {
        try {
          const memberToInvite = await guild.members.fetch(userId).catch(() => null);
          if (!memberToInvite) continue;

          await channel.permissionOverwrites.create(memberToInvite, {
            ViewChannel: true,
            Connect: true,
          });

          added.push(`<@${userId}>`);

          try {
            await memberToInvite.send(
              `🎙️ **${interaction.user.username}** vous a invité dans son salon vocal **${channel.name}** sur **${guild.name}** !`
            );
          } catch {}
        } catch {}
      }
    }

    let message = '';
    if (added.length > 0) message += `➕ ${added.join(', ')}`;
    if (removed.length > 0) {
      if (message) message += '\n';
      message += `➖ ${removed.join(', ')}`;
    }

    await interaction.editReply({
      content: message || '✅',
    });
  } catch (error) {
    console.error('[VocInvite] Erreur lors du traitement:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Une erreur est survenue.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
