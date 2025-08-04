import {
  Guild,
  TextChannel,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonInteraction,
  User,
  MessageReaction,
  PermissionsBitField,
  Message
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ISuggestionItem } from '../models/suggestionItem.model';
import { ISuggestionForm, ISuggestionChannel } from '../models/suggestionConfig.model';
import {
  SuggestionStatus,
  ButtonInteractionData,
  ModalSubmitData,
  ReactionData,
  ChannelPermissionSetup,
  ButtonPublishResult,
  SuggestionStatusInfo,
  ValidationError,
  NotFoundError
} from './suggestions.types';

export class DiscordSuggestionsService {

  // ===== CHANNEL PERMISSIONS =====
  async setupChannelPermissions(guild: Guild, channelId: string, readOnly: boolean = true): Promise<ChannelPermissionSetup> {
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new ValidationError('Channel non trouvé ou n\'est pas un channel texte');
    }

    let botCanWrite = false;
    let everyoneCanReact = true;

    if (readOnly) {
      // Empêcher les utilisateurs normaux d'écrire
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        AddReactions: true,
        ViewChannel: true,
        ReadMessageHistory: true
      });

      // Permettre au bot d'écrire
      const botMember = guild.members.cache.get(guild.client.user?.id || '');
      if (botMember) {
        await channel.permissionOverwrites.edit(botMember, {
          SendMessages: true,
          ManageMessages: true,
          EmbedLinks: true
        });
        botCanWrite = true;
      }
    }

    return {
      channelId,
      readOnly,
      botCanWrite,
      everyoneCanReact
    };
  }

  // ===== BUTTON MANAGEMENT =====
  createSuggestionButton(): ActionRowBuilder<ButtonBuilder> {
    const button = new ButtonBuilder()
      .setCustomId('create_suggestion')
      .setLabel('✨ Créer une suggestion')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💡');

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  async publishSuggestionButton(guild: Guild, channelId: string): Promise<ButtonPublishResult> {
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      return {
        messageId: null,
        success: false,
        error: 'Channel non trouvé'
      };
    }

    const embed = new EmbedBuilder()
      .setTitle('💡 Système de Suggestions')
      .setDescription('Cliquez sur le bouton ci-dessous pour créer une nouvelle suggestion !')
      .setColor(0x5865F2)
      .setFooter({ text: 'Vos suggestions sont importantes pour améliorer le serveur' })
      .setTimestamp();

    const button = this.createSuggestionButton();

    try {
      const message = await channel.send({
        embeds: [embed],
        components: [button] as any
      });

      return {
        messageId: message.id,
        success: true
      };
    } catch (error) {
      console.error('Erreur lors de la publication du bouton:', error);
      return {
        messageId: null,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async republishButton(guild: Guild, channelId: string, oldButtonMessageId?: string): Promise<ButtonPublishResult> {
    // Supprimer l'ancien bouton si il existe
    if (oldButtonMessageId) {
      const channel = guild.channels.cache.get(channelId) as TextChannel;
      if (channel) {
        try {
          const oldMessage = await channel.messages.fetch(oldButtonMessageId);
          await oldMessage.delete();
        } catch (error) {
          // Ancien message bouton introuvable - pas grave
        }
      }
    }

    // Publier le nouveau bouton
    return this.publishSuggestionButton(guild, channelId);
  }

  async pinButton(guild: Guild, channelId: string, messageId: string): Promise<boolean> {
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) return false;

    try {
      const message = await channel.messages.fetch(messageId);
      await message.pin();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'épinglage:', error);
      return false;
    }
  }

  // ===== MODAL CREATION =====
  createSuggestionModal(form: ISuggestionForm): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`suggestion_modal_${form.id}`)
      .setTitle(form.name);

    // Limiter à 5 champs maximum (limitation Discord)
    const fields = form.fields.slice(0, 5);

    fields.forEach((field, index) => {
      const textInput = new TextInputBuilder()
        .setCustomId(`field_${field.id}`)
        .setLabel(field.label)
        .setRequired(field.required)
        .setStyle(field.type === 'textarea' ? TextInputStyle.Paragraph : TextInputStyle.Short);

      if (field.placeholder) textInput.setPlaceholder(field.placeholder);
      if (field.maxLength) textInput.setMaxLength(field.maxLength);
      if (field.minLength) textInput.setMinLength(field.minLength);
      if (field.defaultValue) textInput.setValue(field.defaultValue);

      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
      modal.addComponents(actionRow);
    });

    return modal;
  }

  // ===== EMBED CREATION =====
  createSuggestionEmbed(suggestion: ISuggestionItem, config: {defaultReactions: string[]}): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.getStatusColor(suggestion.status))
      .setAuthor({
        name: suggestion.authorUsername,
        iconURL: suggestion.authorAvatar
      })
      .setTimestamp(new Date())
      .setFooter({ text: `Suggestion #${suggestion._id.toString().slice(-6)}` });

    // Ajouter les champs du formulaire
    suggestion.fields.forEach((field, index) => {
      if (index === 0) {
        // Premier champ = titre
        embed.setTitle(field.value);
      } else {
        // Autres champs
        embed.addFields({
          name: field.label,
          value: field.value.length > 1024 ? field.value.substring(0, 1021) + '...' : field.value,
          inline: field.type !== 'textarea'
        });
      }
    });

    // Ajouter les statistiques
    if (suggestion.reactions.length > 0) {
      const reactionText = suggestion.reactions
        .map(r => `${r.emoji} ${r.count}`)
        .join(' • ');

      embed.addFields({
        name: '📊 Réactions',
        value: reactionText,
        inline: true
      });
    }

    return embed;
  }

  async updateSuggestionEmbed(suggestion: ISuggestionItem, config: {defaultReactions: string[]}): Promise<boolean> {
    if (!suggestion.messageId) return false;

    try {
      const client = BotClient.getInstance();
      const guild = client.guilds.cache.get(suggestion.guildId);
      if (!guild) return false;

      const channel = guild.channels.cache.get(suggestion.channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return false;

      const message = await channel.messages.fetch(suggestion.messageId);
      const updatedEmbed = this.createSuggestionEmbed(suggestion, config);

      // Add status information to the embed
      const statusInfo = this.getStatusInfo(suggestion.status);
      updatedEmbed.addFields({
        name: '📊 Statut',
        value: `${statusInfo.emoji} **${statusInfo.text}**`,
        inline: true
      });

      if (suggestion.moderatorNote) {
        updatedEmbed.addFields({
          name: '📝 Note de modération',
          value: suggestion.moderatorNote,
          inline: false
        });
      }

      await message.edit({ embeds: [updatedEmbed] });
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'embed Discord:', error);
      return false;
    }
  }

  // ===== THREAD MANAGEMENT =====
  async createSuggestionThread(message: Message, title: string, authorId: string): Promise<string | null> {
    try {
      const thread = await message.startThread({
        name: `💬 Discussion: ${title.substring(0, 80) || 'Suggestion'}`,
        autoArchiveDuration: 1440, // 24 heures
        reason: 'Thread automatique pour discussion de suggestion'
      });

      // Message d'accueil dans le thread
      await thread.send({
        content: `🗣️ **Discussion ouverte pour cette suggestion !**\n\nVous pouvez débattre, poser des questions ou donner votre avis ici.\n\n*Auteur de la suggestion: <@${authorId}>*`
      });

      return thread.id;
    } catch (error) {
      console.error('Erreur lors de la création du thread:', error);
      return null;
    }
  }

  // ===== REACTION MANAGEMENT =====
  async addReactionsToMessage(message: Message, reactions: string[]): Promise<void> {
    for (const reaction of reactions) {
      try {
        await message.react(reaction);
      } catch (error) {
        console.error('Erreur lors de l\'ajout de réaction:', error);
      }
    }
  }

  // ===== MESSAGE MANAGEMENT =====
  async handleChannelMessage(message: Message, channelConfig: ISuggestionChannel): Promise<void> {
    // Si le channel est en lecture seule, supprimer le message utilisateur
    if (channelConfig.readOnly && !message.author.bot) {
      try {
        await message.delete();

        // Envoyer un message d'avertissement temporaire
        if (message.channel.isTextBased() && 'send' in message.channel) {
          const warningMessage = await message.channel.send(
            `❌ <@${message.author.id}>, ce channel est réservé aux suggestions. Utilisez le bouton pour soumettre une suggestion.`
          );

          // Supprimer le message d'avertissement après 5 secondes
          setTimeout(async () => {
            try {
              await warningMessage.delete();
            } catch (error) {
              // Pas grave si on ne peut pas supprimer le message d'avertissement
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du message dans le channel de suggestions:', error);
      }
    }
  }

  // ===== STATUS HELPERS =====
  private getStatusColor(status: string): number {
    const colors = {
      pending: 0x3498db,      // Bleu
      approved: 0x2ecc71,     // Vert
      rejected: 0xe74c3c,     // Rouge
      implemented: 0x9b59b6,  // Violet
      under_review: 0xf39c12  // Orange
    };

    return colors[status as keyof typeof colors] || colors.pending;
  }

  private getStatusInfo(status: string): SuggestionStatusInfo {
    const statusInfos = {
      pending: { emoji: '⏳', text: 'En attente', color: 0x3498db },
      approved: { emoji: '✅', text: 'Approuvée', color: 0x2ecc71 },
      rejected: { emoji: '❌', text: 'Rejetée', color: 0xe74c3c },
      implemented: { emoji: '🎉', text: 'Implémentée', color: 0x9b59b6 },
      under_review: { emoji: '👀', text: 'En révision', color: 0xf39c12 }
    };

    return statusInfos[status as keyof typeof statusInfos] || statusInfos.pending;
  }

  // ===== INTERACTION DATA PARSERS =====
  parseButtonInteractionData(interaction: ButtonInteraction): ButtonInteractionData {
    return {
      guildId: interaction.guild!.id,
      channelId: interaction.channel!.id,
      userId: interaction.user.id,
      username: interaction.user.username
    };
  }

  parseModalSubmitData(interaction: ModalSubmitInteraction, formId: string, fields: {fieldId: string, label: string, value: string, type: 'text' | 'textarea'}[]): ModalSubmitData {
    return {
      guildId: interaction.guild!.id,
      channelId: interaction.channel!.id,
      formId,
      userId: interaction.user.id,
      username: interaction.user.username,
      userAvatar: interaction.user.displayAvatarURL(),
      fields
    };
  }

  parseReactionData(reaction: MessageReaction, user: User, isAdd: boolean): ReactionData {
    return {
      guildId: reaction.message.guild!.id,
      channelId: reaction.message.channel.id,
      messageId: reaction.message.id,
      emoji: reaction.emoji.name || reaction.emoji.id || '❓',
      userId: user.id,
      isAdd
    };
  }

  // ===== VALIDATION HELPERS =====
  validateDiscordChannel(guild: Guild, channelId: string): TextChannel {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      throw new NotFoundError('Channel non trouvé');
    }
    if (channel.type !== ChannelType.GuildText) {
      throw new ValidationError('Le channel doit être un channel texte');
    }
    return channel as TextChannel;
  }

  validateDiscordGuild(guildId: string): Guild {
    const client = BotClient.getInstance();
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new NotFoundError('Serveur Discord non trouvé');
    }
    return guild;
  }
}