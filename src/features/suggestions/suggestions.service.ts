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
  PermissionsBitField
} from 'discord.js';
import SuggestionsConfigModel, { 
  ISuggestionsConfig, 
  ISuggestionChannel, 
  ISuggestionForm,
  IFormField 
} from './models/suggestions.model';
import SuggestionModel, { ISuggestion, ISuggestionField } from './models/suggestion.model';
import { BotClient } from '../../bot/client';

export class SuggestionsService {
  // ===== CONFIGURATION =====
  
  static async getSuggestionsConfig(guildId: string): Promise<ISuggestionsConfig | null> {
    return SuggestionsConfigModel.findOne({ guildId });
  }

  static async getOrCreateSuggestionsConfig(guildId: string): Promise<ISuggestionsConfig> {
    const config = await this.getSuggestionsConfig(guildId);
    if (config) return config;
    
    return SuggestionsConfigModel.create({
      guildId,
      enabled: false,
      channels: [],
      forms: [],
      defaultReactions: ['👍', '👎']
    });
  }

  static async toggleFeature(guildId: string, enabled: boolean): Promise<ISuggestionsConfig | null> {
    return SuggestionsConfigModel.findOneAndUpdate(
      { guildId },
      { enabled },
      { new: true, upsert: true }
    );
  }

  // ===== GESTION DES FORMULAIRES =====
  
  static async createForm(guildId: string, formData: Omit<ISuggestionForm, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISuggestionsConfig | null> {
    const config = await this.getOrCreateSuggestionsConfig(guildId);
    
    const newForm: ISuggestionForm = {
      id: `form_${Date.now()}`,
      ...formData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    config.forms.push(newForm);
    return config.save();
  }

  static async updateForm(guildId: string, formId: string, updates: Partial<ISuggestionForm>): Promise<ISuggestionsConfig | null> {
    const config = await this.getSuggestionsConfig(guildId);
    if (!config) return null;
    
    const formIndex = config.forms.findIndex(f => f.id === formId);
    if (formIndex === -1) return null;
    
    config.forms[formIndex] = {
      ...config.forms[formIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return config.save();
  }

  static async deleteForm(guildId: string, formId: string): Promise<ISuggestionsConfig | null> {
    const config = await this.getSuggestionsConfig(guildId);
    if (!config) return null;
    
    config.forms = config.forms.filter(f => f.id !== formId);
    return config.save();
  }

  // ===== GESTION DES CHANNELS =====
  
  static async addSuggestionChannel(guildId: string, channelData: Omit<ISuggestionChannel, 'suggestionCount'>): Promise<ISuggestionsConfig | null> {
    const config = await this.getOrCreateSuggestionsConfig(guildId);
    
    // Vérifier si le channel existe déjà
    const existingIndex = config.channels.findIndex(c => c.channelId === channelData.channelId);
    
    const newChannelData: ISuggestionChannel = {
      ...channelData,
      suggestionCount: 0
    };
    
    if (existingIndex !== -1) {
      config.channels[existingIndex] = newChannelData;
    } else {
      config.channels.push(newChannelData);
    }
    
    return config.save();
  }

  static async removeSuggestionChannel(guildId: string, channelId: string): Promise<ISuggestionsConfig | null> {
    const config = await this.getSuggestionsConfig(guildId);
    if (!config) return null;
    
    config.channels = config.channels.filter(c => c.channelId !== channelId);
    return config.save();
  }

  static async updateChannelConfig(guildId: string, channelId: string, updates: Partial<ISuggestionChannel>): Promise<ISuggestionsConfig | null> {
    const config = await this.getSuggestionsConfig(guildId);
    if (!config) return null;
    
    const channelIndex = config.channels.findIndex(c => c.channelId === channelId);
    if (channelIndex === -1) return null;
    
    config.channels[channelIndex] = {
      ...config.channels[channelIndex],
      ...updates
    };
    
    return config.save();
  }

  // ===== GESTION DES PERMISSIONS CHANNEL =====
  
  static async setupChannelPermissions(guild: Guild, channelId: string, readOnly: boolean = true): Promise<void> {
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) return;
    
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
      }
    }
  }

  // ===== BOUTON PERSISTANT =====
  
  static createSuggestionButton(): ActionRowBuilder<ButtonBuilder> {
    const button = new ButtonBuilder()
      .setCustomId('create_suggestion')
      .setLabel('✨ Créer une suggestion')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💡');
    
    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  }

  static async publishSuggestionButton(guild: Guild, channelId: string): Promise<string | null> {
    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) return null;
    
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
        components: [button]
      });
      
      return message.id;
    } catch (error) {
      console.error('Erreur lors de la publication du bouton:', error);
      return null;
    }
  }

  static async republishButtonIfNeeded(guildId: string, channelId: string): Promise<void> {
    const config = await this.getSuggestionsConfig(guildId);
    if (!config) return;
    
    const channelConfig = config.channels.find(c => c.channelId === channelId);
    if (!channelConfig) return;
    
    // Incrémenter le compteur de suggestions
    channelConfig.suggestionCount++;
    
    // Republier le bouton si nécessaire
    if (channelConfig.suggestionCount % channelConfig.republishInterval === 0) {
      const guild = BotClient.getInstance().guilds.cache.get(guildId);
      if (!guild) return;
      
      // Supprimer l'ancien bouton
      if (channelConfig.buttonMessageId) {
        const channel = guild.channels.cache.get(channelId) as TextChannel;
        if (channel) {
          try {
            const oldMessage = await channel.messages.fetch(channelConfig.buttonMessageId);
            await oldMessage.delete();
          } catch (error) {
            // Ancien message bouton introuvable - pas grave
          }
        }
      }
      
      // Publier le nouveau bouton
      const newMessageId = await this.publishSuggestionButton(guild, channelId);
      if (newMessageId) {
        channelConfig.buttonMessageId = newMessageId;
        
        // Épingler si demandé
        if (channelConfig.pinButton) {
          const channel = guild.channels.cache.get(channelId) as TextChannel;
          if (channel) {
            try {
              const message = await channel.messages.fetch(newMessageId);
              await message.pin();
            } catch (error) {
              console.error('Erreur lors de l\'épinglage:', error);
            }
          }
        }
      }
    }
    
    await config.save();
  }

  // ===== CREATION DE MODAL =====
  
  static createSuggestionModal(form: ISuggestionForm): ModalBuilder {
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

  // ===== GESTION DES SUGGESTIONS =====
  
  static async createSuggestion(
    guildId: string,
    channelId: string,
    formId: string,
    authorId: string,
    authorUsername: string,
    fields: ISuggestionField[],
    authorAvatar?: string
  ): Promise<ISuggestion> {
    return SuggestionModel.create({
      guildId,
      channelId,
      formId,
      authorId,
      authorUsername,
      authorAvatar,
      fields,
      reactions: [],
      comments: [],
      views: 0,
      score: 0
    });
  }

  static async getSuggestion(suggestionId: string): Promise<ISuggestion | null> {
    return SuggestionModel.findById(suggestionId);
  }

  static async getSuggestionByMessageId(messageId: string): Promise<ISuggestion | null> {
    return SuggestionModel.findOne({ messageId });
  }

  static async getSuggestionsByGuild(guildId: string, limit: number = 20, skip: number = 0): Promise<ISuggestion[]> {
    return SuggestionModel.find({ guildId })
      .sort({ score: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  static async getSuggestionsByChannel(channelId: string, limit: number = 20): Promise<ISuggestion[]> {
    return SuggestionModel.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async updateSuggestionStatus(suggestionId: string, status: string, moderatorId?: string, note?: string): Promise<ISuggestion | null> {
    const updatedSuggestion = await SuggestionModel.findByIdAndUpdate(
      suggestionId,
      {
        status,
        moderatorId,
        moderatorNote: note,
        moderatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedSuggestion) return null;

    // Update the Discord embed if the suggestion has a messageId
    if (updatedSuggestion.messageId) {
      try {
        const config = await this.getSuggestionsConfig(updatedSuggestion.guildId);
        if (config) {
          const client = BotClient.getInstance();
          const guild = client.guilds.cache.get(updatedSuggestion.guildId);
          
          if (guild) {
            const channel = guild.channels.cache.get(updatedSuggestion.channelId);
            if (channel && channel.isTextBased()) {
              try {
                const message = await channel.messages.fetch(updatedSuggestion.messageId);
                const updatedEmbed = this.createSuggestionEmbed(updatedSuggestion, config);
                
                // Add status information to the embed
                const statusEmoji = this.getStatusEmoji(status);
                const statusText = this.getStatusText(status);
                updatedEmbed.addFields({
                  name: '📊 Statut',
                  value: `${statusEmoji} **${statusText}**`,
                  inline: true
                });

                if (note) {
                  updatedEmbed.addFields({
                    name: '📝 Note de modération',
                    value: note,
                    inline: false
                  });
                }

                await message.edit({ embeds: [updatedEmbed] });
              } catch (error) {
                console.error('Erreur lors de la mise à jour de l\'embed Discord:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données pour mettre à jour l\'embed:', error);
      }
    }

    return updatedSuggestion;
  }

  // ===== CREATION EMBED SUGGESTION =====
  
  static createSuggestionEmbed(suggestion: ISuggestion, config: ISuggestionsConfig): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.getStatusColor(suggestion.status))
      .setAuthor({ 
        name: suggestion.authorUsername,
        iconURL: suggestion.authorAvatar 
      })
      .setTimestamp(suggestion.createdAt)
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

  private static getStatusColor(status: string): number {
    const colors = {
      pending: 0x3498db,      // Bleu
      approved: 0x2ecc71,     // Vert
      rejected: 0xe74c3c,     // Rouge
      implemented: 0x9b59b6,  // Violet
      under_review: 0xf39c12  // Orange
    };
    
    return colors[status as keyof typeof colors] || colors.pending;
  }

  private static getStatusEmoji(status: string): string {
    const emojis = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
      implemented: '🎉',
      under_review: '👀'
    };
    
    return emojis[status as keyof typeof emojis] || '❓';
  }

  private static getStatusText(status: string): string {
    const texts = {
      pending: 'En attente',
      approved: 'Approuvée',
      rejected: 'Rejetée',
      implemented: 'Implémentée',
      under_review: 'En révision'
    };
    
    return texts[status as keyof typeof texts] || status;
  }

  // ===== GESTION DES REACTIONS =====
  
  static async addReactionToSuggestion(suggestionId: string, emoji: string, userId: string): Promise<ISuggestion | null> {
    const suggestion = await SuggestionModel.findById(suggestionId);
    if (!suggestion) return null;
    
    const reactionIndex = suggestion.reactions.findIndex(r => r.emoji === emoji);
    
    if (reactionIndex !== -1) {
      // Réaction existe déjà
      const reaction = suggestion.reactions[reactionIndex];
      if (!reaction.users.includes(userId)) {
        reaction.users.push(userId);
        reaction.count++;
      }
    } else {
      // Nouvelle réaction
      suggestion.reactions.push({
        emoji,
        count: 1,
        users: [userId]
      });
    }
    
    // Recalculer le score
    suggestion.score = this.calculateScore(suggestion.reactions);
    
    return suggestion.save();
  }

  static async removeReactionFromSuggestion(suggestionId: string, emoji: string, userId: string): Promise<ISuggestion | null> {
    const suggestion = await SuggestionModel.findById(suggestionId);
    if (!suggestion) return null;
    
    const reactionIndex = suggestion.reactions.findIndex(r => r.emoji === emoji);
    if (reactionIndex === -1) return suggestion;
    
    const reaction = suggestion.reactions[reactionIndex];
    const userIndex = reaction.users.indexOf(userId);
    
    if (userIndex !== -1) {
      reaction.users.splice(userIndex, 1);
      reaction.count--;
      
      // Supprimer la réaction si plus personne
      if (reaction.count <= 0) {
        suggestion.reactions.splice(reactionIndex, 1);
      }
    }
    
    // Recalculer le score
    suggestion.score = this.calculateScore(suggestion.reactions);
    
    return suggestion.save();
  }

  private static calculateScore(reactions: Array<{emoji: string, count: number}>): number {
    let score = 0;
    
    reactions.forEach(reaction => {
      switch (reaction.emoji) {
        case '👍':
        case '✅':
        case '❤️':
          score += reaction.count * 1;
          break;
        case '👎':
        case '❌':
          score -= reaction.count * 1;
          break;
        case '🔥':
        case '⭐':
          score += reaction.count * 2;
          break;
        default:
          score += reaction.count * 0.5;
      }
    });
    
    return score;
  }

  // ===== GESTION DES EVENTS DISCORD =====
  
  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    try {
      const config = await this.getSuggestionsConfig(reaction.message.guild!.id);
      if (!config?.enabled) return;

      const channelConfig = config.channels.find(c => c.channelId === reaction.message.channel.id);
      if (!channelConfig) return;

      const suggestion = await this.getSuggestionByMessageId(reaction.message.id);
      if (!suggestion) return;

      await this.addReactionToSuggestion(
        suggestion._id.toString(),
        reaction.emoji.name || reaction.emoji.id || '❓',
        user.id
      );

    } catch (error) {
      console.error('Erreur dans la gestion des réactions de suggestions:', error);
    }
  }

  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    try {
      const config = await this.getSuggestionsConfig(reaction.message.guild!.id);
      if (!config?.enabled) return;

      const channelConfig = config.channels.find(c => c.channelId === reaction.message.channel.id);
      if (!channelConfig) return;

      const suggestion = await this.getSuggestionByMessageId(reaction.message.id);
      if (!suggestion) return;

      await this.removeReactionFromSuggestion(
        suggestion._id.toString(),
        reaction.emoji.name || reaction.emoji.id || '❓',
        user.id
      );

    } catch (error) {
      console.error('Erreur dans la suppression des réactions de suggestions:', error);
    }
  }

  static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      const config = await this.getSuggestionsConfig(interaction.guild!.id);
      if (!config?.enabled) return;

      const channelConfig = config.channels.find(c => c.channelId === interaction.channel?.id);
      if (!channelConfig) {
        await interaction.reply({
          content: '❌ Ce channel n\'est pas configuré pour les suggestions.',
          ephemeral: true
        });
        return;
      }

      const form = config.forms.find(f => f.id === channelConfig.formId);
      if (!form) {
        await interaction.reply({
          content: '❌ Formulaire de suggestion introuvable. Contactez un administrateur.',
          ephemeral: true
        });
        return;
      }

      const modal = this.createSuggestionModal(form);
      await interaction.showModal(modal);

    } catch (error) {
      console.error('Erreur lors du clic sur le bouton suggestion:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'ouverture du formulaire.',
        ephemeral: true
      });
    }
  }

  static async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      const formId = interaction.customId.replace('suggestion_modal_', '');
      
      const config = await this.getSuggestionsConfig(interaction.guild!.id);
      if (!config) return;

      const form = config.forms.find(f => f.id === formId);
      if (!form) {
        await interaction.reply({
          content: '❌ Formulaire introuvable.',
          ephemeral: true
        });
        return;
      }

      const fields: ISuggestionField[] = [];
      
      form.fields.forEach(formField => {
        const value = interaction.fields.getTextInputValue(`field_${formField.id}`);
        fields.push({
          fieldId: formField.id,
          label: formField.label,
          value: value,
          type: formField.type
        });
      });

      const suggestion = await this.createSuggestion(
        interaction.guild!.id,
        interaction.channel!.id,
        formId,
        interaction.user.id,
        interaction.user.username,
        fields,
        interaction.user.displayAvatarURL()
      );

      const embed = this.createSuggestionEmbed(suggestion, config);

      const suggestionMessage = await interaction.channel!.send({
        embeds: [embed]
      });

      suggestion.messageId = suggestionMessage.id;
      await suggestion.save();

      const channelConfig = config.channels.find(c => c.channelId === interaction.channel!.id);
      const reactions = channelConfig?.customReactions || config.defaultReactions;
      
      for (const reaction of reactions) {
        try {
          await suggestionMessage.react(reaction);
        } catch (error) {
          console.error('Erreur lors de l\'ajout de réaction:', error);
        }
      }

      await this.republishButtonIfNeeded(interaction.guild!.id, interaction.channel!.id);

      await interaction.reply({
        content: '✅ Votre suggestion a été soumise avec succès !',
        ephemeral: true
      });

    } catch (error) {
      console.error('Erreur lors de la soumission de suggestion:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la soumission de votre suggestion.',
        ephemeral: true
      });
    }
  }

  static async handleChannelMessage(message: any): Promise<void> {
    try {
      // Vérifier si les suggestions sont activées pour cette guilde
      const config = await this.getSuggestionsConfig(message.guild!.id);
      if (!config?.enabled) return;

      // Vérifier si c'est dans un channel de suggestions configuré
      const channelConfig = config.channels.find(c => c.channelId === message.channel.id);
      if (!channelConfig) return;

      // Si le channel est en lecture seule, supprimer le message utilisateur
      if (channelConfig.readOnly) {
        try {
          await message.delete();
          
          // Optionnel: envoyer un message éphémère pour informer l'utilisateur
          if (message.channel.isTextBased()) {
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
    } catch (error) {
      console.error('Erreur dans la gestion des messages du channel de suggestions:', error);
    }
  }
}