import { 
  Guild, 
  TextChannel, 
  ChannelType, 
  ModalSubmitInteraction,
  ButtonInteraction,
  User,
  MessageReaction,
  Message
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { SuggestionsRepository } from './suggestions.repository';
import { SuggestionsValidator } from './suggestions.validator';
import { DiscordSuggestionsService } from './discord.suggestions.service';
import { LogService } from '../../../shared/logs/logs.service';
import { ISuggestionItem, ISuggestionField } from '../models/suggestionItem.model';
import { ISuggestionForm, ISuggestionChannel } from '../models/suggestionConfig.model';
import {
  CreateFormDTO,
  UpdateFormDTO,
  UpdateFormFieldDTO,
  CreateChannelDTO,
  UpdateChannelDTO,
  CreateSuggestionDTO,
  UpdateSuggestionStatusDTO,
  FormResponseDTO,
  ChannelResponseDTO,
  SuggestionResponseDTO,
  ConfigResponseDTO,
  ValidationError,
  NotFoundError,
  SuggestionStatus
} from './suggestions.types';

export class SuggestionsService {
  private repository: SuggestionsRepository;
  private discordService: DiscordSuggestionsService;

  constructor() {
    this.repository = new SuggestionsRepository();
    this.discordService = new DiscordSuggestionsService();
  }

  private formatFormForFrontend(form: ISuggestionForm): FormResponseDTO {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.fields.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        minLength: field.minLength,
        maxLength: field.maxLength,
        defaultValue: field.defaultValue
      })),
      createdAt: form.createdAt,
      updatedAt: form.updatedAt
    };
  }

  private formatChannelForFrontend(channel: ISuggestionChannel): ChannelResponseDTO {
    return {
      channelId: channel.channelId,
      channelName: channel.channelName || 'Canal inconnu',
      enabled: channel.enabled,
      formId: channel.formId,
      readOnly: channel.readOnly,
      republishInterval: channel.republishInterval,
      customReactions: channel.customReactions,
      pinButton: channel.pinButton,
      buttonMessageId: channel.buttonMessageId,
      suggestionCount: channel.suggestionCount
    };
  }

  private formatSuggestionForFrontend(suggestion: ISuggestionItem): SuggestionResponseDTO {
    return {
      _id: suggestion._id.toString(),
      guildId: suggestion.guildId,
      channelId: suggestion.channelId,
      formId: suggestion.formId,
      authorId: suggestion.authorId,
      authorUsername: suggestion.authorUsername,
      authorAvatar: suggestion.authorAvatar,
      fields: suggestion.fields.map(field => ({
        fieldId: field.fieldId,
        label: field.label,
        value: field.value,
        type: field.type
      })),
      messageId: suggestion.messageId,
      status: suggestion.status,
      reactions: suggestion.reactions.map(reaction => ({
        emoji: reaction.emoji,
        count: reaction.count,
        users: reaction.users
      })),
      score: suggestion.score,
      views: suggestion.views,
      moderatorId: suggestion.moderatorId,
      moderatorNote: suggestion.moderatorNote,
      moderatedAt: suggestion.moderatedAt,
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt
    };
  }

  private formatConfigForFrontend(config: {guildId: string, enabled: boolean, channels: ISuggestionChannel[], forms: ISuggestionForm[], defaultReactions: string[]}): ConfigResponseDTO {
    return {
      guildId: config.guildId,
      enabled: config.enabled,
      channels: config.channels.map((channel: ISuggestionChannel) => this.formatChannelForFrontend(channel)),
      forms: config.forms.map((form: ISuggestionForm) => this.formatFormForFrontend(form)),
      defaultReactions: config.defaultReactions
    };
  }

  // ===== CONFIGURATION =====
  async getSuggestionsConfig(guildId: string): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateGuildId(guildId);
    SuggestionsValidator.throwIfInvalid(validation);

    const config = await this.repository.getConfig(guildId);
    return this.formatConfigForFrontend(config);
  }

  async getOrCreateSuggestionsConfig(guildId: string): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateGuildId(guildId);
    SuggestionsValidator.throwIfInvalid(validation);

    const config = await this.repository.getConfig(guildId);
    return this.formatConfigForFrontend(config);
  }

  async toggleFeature(guildId: string, enabled: boolean): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateGuildId(guildId);
    SuggestionsValidator.throwIfInvalid(validation);

    const config = await this.repository.toggleEnabled(guildId, enabled);
    
    const client = BotClient.getInstance();
    await LogService.info(client, guildId, `Système de suggestions ${enabled ? 'activé' : 'désactivé'}`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  // ===== GESTION DES FORMULAIRES =====
  async createForm(guildId: string, formData: CreateFormDTO): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateCreateForm(formData);
    SuggestionsValidator.throwIfInvalid(validation);

    const form = await this.repository.createForm(guildId, formData);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.success(client, guildId, `Formulaire "${form.name}" créé avec succès`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  async updateForm(guildId: string, formId: string, updates: UpdateFormDTO): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateUpdateForm(updates);
    SuggestionsValidator.throwIfInvalid(validation);

    const form = await this.repository.updateForm(guildId, formId, updates);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.info(client, guildId, `Formulaire "${form.name}" mis à jour`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  async deleteForm(guildId: string, formId: string): Promise<ConfigResponseDTO> {
    await this.repository.deleteForm(guildId, formId);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.warning(client, guildId, `Formulaire supprimé`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  // ===== GESTION DES CHANNELS =====
  async addSuggestionChannel(guildId: string, channelData: CreateChannelDTO): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateCreateChannel(channelData);
    SuggestionsValidator.throwIfInvalid(validation);

    const channel = await this.repository.addChannel(guildId, channelData);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.success(client, guildId, `Channel de suggestions configuré: <#${channel.channelId}>`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  async removeSuggestionChannel(guildId: string, channelId: string): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateChannelId(channelId);
    SuggestionsValidator.throwIfInvalid(validation);

    await this.repository.removeChannel(guildId, channelId);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.warning(client, guildId, `Channel de suggestions retiré: <#${channelId}>`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  async updateChannelConfig(guildId: string, channelId: string, updates: UpdateChannelDTO): Promise<ConfigResponseDTO> {
    const validation = SuggestionsValidator.validateUpdateChannel(updates);
    SuggestionsValidator.throwIfInvalid(validation);

    const channel = await this.repository.updateChannel(guildId, channelId, updates);
    const config = await this.repository.getConfig(guildId);
    
    const client = BotClient.getInstance();
    await LogService.info(client, guildId, `Configuration du channel de suggestions mise à jour: <#${channelId}>`, { feature: 'suggestions' });
    
    return this.formatConfigForFrontend(config);
  }

  // ===== GESTION DES PERMISSIONS CHANNEL =====
  async setupChannelPermissions(guild: Guild, channelId: string, readOnly: boolean = true): Promise<void> {
    await this.discordService.setupChannelPermissions(guild, channelId, readOnly);
  }

  // ===== BOUTON PERSISTANT =====
  async publishSuggestionButton(guild: Guild, channelId: string): Promise<string | null> {
    const result = await this.discordService.publishSuggestionButton(guild, channelId);
    return result.messageId;
  }

  async republishButtonIfNeeded(guildId: string, channelId: string): Promise<void> {
    const channelConfig = await this.repository.findChannelById(guildId, channelId);
    if (!channelConfig) return;

    // Incrémenter le compteur de suggestions
    const newCount = await this.repository.incrementChannelSuggestionCount(guildId, channelId);
    
    // Republier le bouton si nécessaire
    if (newCount % channelConfig.republishInterval === 0) {
      const client = BotClient.getInstance();
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;
      
      const result = await this.discordService.republishButton(guild, channelId, channelConfig.buttonMessageId);
      if (result.success && result.messageId) {
        await this.repository.updateChannel(guildId, channelId, { buttonMessageId: result.messageId });
        
        // Épingler si demandé
        if (channelConfig.pinButton) {
          await this.discordService.pinButton(guild, channelId, result.messageId);
        }
      }
    }
  }

  // ===== CREATION DE MODAL =====
  createSuggestionModal(form: ISuggestionForm) {
    return this.discordService.createSuggestionModal(form);
  }

  // ===== GESTION DES SUGGESTIONS =====
  async createSuggestion(data: CreateSuggestionDTO): Promise<SuggestionResponseDTO> {
    const validation = SuggestionsValidator.validateCreateSuggestion(data);
    SuggestionsValidator.throwIfInvalid(validation);

    const suggestion = await this.repository.createSuggestion({
      guildId: data.guildId,
      channelId: data.channelId,
      formId: data.formId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      authorAvatar: data.authorAvatar,
      fields: data.fields
    });

    return this.formatSuggestionForFrontend(suggestion);
  }

  async getSuggestion(suggestionId: string): Promise<SuggestionResponseDTO> {
    const suggestion = await this.repository.findSuggestionById(suggestionId);
    return this.formatSuggestionForFrontend(suggestion);
  }

  async getSuggestionByMessageId(messageId: string): Promise<SuggestionResponseDTO | null> {
    const suggestion = await this.repository.findSuggestionByMessageId(messageId);
    return suggestion ? this.formatSuggestionForFrontend(suggestion) : null;
  }

  async getSuggestionsByGuild(guildId: string, limit: number = 20, skip: number = 0): Promise<SuggestionResponseDTO[]> {
    const validation = SuggestionsValidator.validateGuildId(guildId);
    SuggestionsValidator.throwIfInvalid(validation);

    const suggestions = await this.repository.findSuggestionsByGuild(guildId, limit, skip);
    return suggestions.map(suggestion => this.formatSuggestionForFrontend(suggestion));
  }

  async getSuggestionsByChannel(channelId: string, limit: number = 20): Promise<SuggestionResponseDTO[]> {
    const validation = SuggestionsValidator.validateChannelId(channelId);
    SuggestionsValidator.throwIfInvalid(validation);

    const suggestions = await this.repository.findSuggestionsByChannel(channelId, limit);
    return suggestions.map(suggestion => this.formatSuggestionForFrontend(suggestion));
  }

  async updateSuggestionStatus(suggestionId: string, status: SuggestionStatus, moderatorId?: string, note?: string): Promise<SuggestionResponseDTO> {
    const validation = SuggestionsValidator.validateUpdateSuggestionStatus({ status, moderatorId, note });
    SuggestionsValidator.throwIfInvalid(validation);

    const updatedSuggestion = await this.repository.updateSuggestionStatus(suggestionId, status, moderatorId, note);

    // Update the Discord embed if the suggestion has a messageId
    if (updatedSuggestion.messageId) {
      const config = await this.repository.getConfig(updatedSuggestion.guildId);
      await this.discordService.updateSuggestionEmbed(updatedSuggestion, config);
    }

    const client = BotClient.getInstance();
    await LogService.info(client, updatedSuggestion.guildId, `Suggestion #${updatedSuggestion._id.toString().slice(-6)} modérée: ${status}`, { feature: 'suggestions' });

    return this.formatSuggestionForFrontend(updatedSuggestion);
  }

  // ===== GESTION DES REACTIONS =====
  async addReactionToSuggestion(suggestionId: string, emoji: string, userId: string): Promise<SuggestionResponseDTO> {
    const suggestion = await this.repository.addReactionToSuggestion(suggestionId, emoji, userId);
    return this.formatSuggestionForFrontend(suggestion);
  }

  async removeReactionFromSuggestion(suggestionId: string, emoji: string, userId: string): Promise<SuggestionResponseDTO> {
    const suggestion = await this.repository.removeReactionFromSuggestion(suggestionId, emoji, userId);
    return this.formatSuggestionForFrontend(suggestion);
  }

  // ===== STATIC METHODS FOR EVENT HANDLERS =====
  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    const service = new SuggestionsService();
    try {
      const config = await service.repository.getConfig(reaction.message.guild!.id);
      if (!config?.enabled) return;

      const channelConfig = config.channels.find(c => c.channelId === reaction.message.channel.id);
      if (!channelConfig) return;

      const suggestion = await service.repository.findSuggestionByMessageId(reaction.message.id);
      if (!suggestion) return;

      await service.repository.addReactionToSuggestion(
        suggestion._id.toString(),
        reaction.emoji.name || reaction.emoji.id || '❓',
        user.id
      );

    } catch (error) {
      console.error('Erreur dans la gestion des réactions de suggestions:', error);
    }
  }

  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    const service = new SuggestionsService();
    try {
      const config = await service.repository.getConfig(reaction.message.guild!.id);
      if (!config?.enabled) return;

      const channelConfig = config.channels.find(c => c.channelId === reaction.message.channel.id);
      if (!channelConfig) return;

      const suggestion = await service.repository.findSuggestionByMessageId(reaction.message.id);
      if (!suggestion) return;

      await service.repository.removeReactionFromSuggestion(
        suggestion._id.toString(),
        reaction.emoji.name || reaction.emoji.id || '❓',
        user.id
      );

    } catch (error) {
      console.error('Erreur dans la suppression des réactions de suggestions:', error);
    }
  }

  static async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const service = new SuggestionsService();
    try {
      const config = await service.repository.getConfig(interaction.guild!.id);
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

      const modal = service.discordService.createSuggestionModal(form);
      await interaction.showModal(modal as any);

    } catch (error) {
      console.error('Erreur lors du clic sur le bouton suggestion:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'ouverture du formulaire.',
        ephemeral: true
      });
    }
  }

  static async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const service = new SuggestionsService();
    try {
      const formId = interaction.customId.replace('suggestion_modal_', '');
      
      const config = await service.repository.getConfig(interaction.guild!.id);
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
          type: formField.type as 'text' | 'textarea'
        });
      });

      const suggestion = await service.repository.createSuggestion({
        guildId: interaction.guild!.id,
        channelId: interaction.channel!.id,
        formId,
        authorId: interaction.user.id,
        authorUsername: interaction.user.username,
        authorAvatar: interaction.user.displayAvatarURL(),
        fields
      });

      const embed = service.discordService.createSuggestionEmbed(suggestion, config);

      const suggestionMessage = await interaction.channel!.send({
        embeds: [embed]
      });

      // Créer un thread pour la discussion
      const threadId = await service.discordService.createSuggestionThread(
        suggestionMessage, 
        fields[0]?.value || 'Suggestion',
        interaction.user.id
      );

      // Mettre à jour la suggestion avec l'ID du message
      suggestion.messageId = suggestionMessage.id;
      await suggestion.save();

      // Ajouter les réactions
      const channelConfig = config.channels.find(c => c.channelId === interaction.channel!.id);
      const reactions = channelConfig?.customReactions || config.defaultReactions;
      
      await service.discordService.addReactionsToMessage(suggestionMessage, reactions);

      await service.republishButtonIfNeeded(interaction.guild!.id, interaction.channel!.id);

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

  static async handleChannelMessage(message: Message): Promise<void> {
    const service = new SuggestionsService();
    try {
      // Vérifier si les suggestions sont activées pour cette guilde
      const config = await service.repository.getConfig(message.guild!.id);
      if (!config?.enabled) return;

      // Vérifier si c'est dans un channel de suggestions configuré
      const channelConfig = config.channels.find(c => c.channelId === message.channel.id);
      if (!channelConfig) return;

      // Gérer le message via le service Discord
      await service.discordService.handleChannelMessage(message, channelConfig);
    } catch (error) {
      console.error('Erreur dans la gestion des messages du channel de suggestions:', error);
    }
  }
}