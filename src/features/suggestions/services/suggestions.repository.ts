import SuggestionModel, { ISuggestionItem } from '../models/suggestionItem.model';
import { GuildService } from '../../discord/services/guild.service';
import { NotFoundError, SuggestionStatus } from './suggestions.types';
import { ISuggestionForm, ISuggestionChannel } from '../models/suggestionConfig.model';

export class SuggestionsRepository {

  // ===== CONFIG OPERATIONS =====
  async getConfig(guildId: string) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features.suggestions) {
      guild.features.suggestions = {
        guildId,
        enabled: false,
        channels: [],
        forms: [],
        defaultReactions: ['👍', '👎']
      };
      await guild.save();
    }
    return guild.features.suggestions;
  }

  async updateConfig(guildId: string, updates: Partial<{enabled: boolean, defaultReactions: string[]}>) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features.suggestions) {
      guild.features.suggestions = {
        guildId,
        enabled: false,
        channels: [],
        forms: [],
        defaultReactions: ['👍', '👎']
      };
    }
    
    Object.assign(guild.features.suggestions, updates);
    await guild.save();
    return guild.features.suggestions;
  }

  async toggleEnabled(guildId: string, enabled: boolean) {
    return this.updateConfig(guildId, { enabled });
  }

  // ===== FORM OPERATIONS =====
  async createForm(guildId: string, formData: {name: string, description?: string, fields: {label: string, type: 'text' | 'textarea', required: boolean, placeholder?: string, minLength?: number, maxLength?: number, defaultValue?: string}[]}) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      guild.features.suggestions = {
        guildId,
        enabled: false,
        channels: [],
        forms: [],
        defaultReactions: ['👍', '👎']
      };
    }
    
    const newForm: ISuggestionForm = {
      id: `form_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      fields: formData.fields.map((field, index: number) => ({
        id: `field_${Date.now()}_${index}`,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        minLength: field.minLength,
        maxLength: field.maxLength,
        defaultValue: field.defaultValue
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    guild.features.suggestions.forms.push(newForm);
    await guild.save();
    
    return newForm;
  }

  async updateForm(guildId: string, formId: string, updates: {name?: string, description?: string, fields?: {id?: string, label: string, type: 'text' | 'textarea', required: boolean, placeholder?: string, minLength?: number, maxLength?: number, defaultValue?: string}[]}) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      throw new NotFoundError('Configuration suggestions non trouvée');
    }
    
    const formIndex = guild.features.suggestions.forms.findIndex(f => f.id === formId);
    
    if (formIndex === -1) {
      throw new NotFoundError('Formulaire non trouvé');
    }
    
    const currentForm = guild.features.suggestions.forms[formIndex];
    console.log('Current form before update:', JSON.stringify(currentForm, null, 2));
    
    guild.features.suggestions.forms[formIndex] = {
      ...currentForm,
      id: currentForm.id, // Préserver explicitement l'ID
      name: updates.name || currentForm.name,
      description: updates.description !== undefined ? updates.description : currentForm.description,
      fields: updates.fields ? updates.fields.map((field, index: number) => ({
        id: field.id || `field_${Date.now()}_${index}`,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        minLength: field.minLength,
        maxLength: field.maxLength,
        defaultValue: field.defaultValue
      })) : currentForm.fields,
      updatedAt: new Date()
    };
    
    console.log('Form after update:', JSON.stringify(guild.features.suggestions.forms[formIndex], null, 2));
    
    await guild.save();
    
    return guild.features.suggestions.forms[formIndex];
  }

  async deleteForm(guildId: string, formId: string) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      throw new NotFoundError('Configuration suggestions non trouvée');
    }
    
    const initialLength = guild.features.suggestions.forms.length;
    guild.features.suggestions.forms = guild.features.suggestions.forms.filter(f => f.id !== formId);
    
    if (guild.features.suggestions.forms.length === initialLength) {
      throw new NotFoundError('Formulaire non trouvé');
    }
    
    await guild.save();
    
    return true;
  }

  async findFormById(guildId: string, formId: string) {
    const config = await this.getConfig(guildId);
    const form = config.forms.find(f => f.id === formId);
    if (!form) {
      throw new NotFoundError('Formulaire non trouvé');
    }
    return form;
  }

  // ===== CHANNEL OPERATIONS =====
  async addChannel(guildId: string, channelData: {channelId: string, channelName?: string, enabled?: boolean, formId: string, readOnly?: boolean, republishInterval?: number, customReactions?: string[], pinButton?: boolean}) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      guild.features.suggestions = {
        guildId,
        enabled: false,
        channels: [],
        forms: [],
        defaultReactions: ['👍', '👎']
      };
    }
    
    // Remove existing channel if it exists
    guild.features.suggestions.channels = guild.features.suggestions.channels.filter(c => c.channelId !== channelData.channelId);
    
    const newChannelData: ISuggestionChannel = {
      channelId: channelData.channelId,
      channelName: channelData.channelName || 'Canal inconnu',
      enabled: channelData.enabled !== undefined ? channelData.enabled : true,
      formId: channelData.formId,
      readOnly: channelData.readOnly !== undefined ? channelData.readOnly : true,
      republishInterval: channelData.republishInterval || 4,
      customReactions: channelData.customReactions || ['👍', '👎'],
      pinButton: channelData.pinButton !== undefined ? channelData.pinButton : false,
      suggestionCount: 0
    };
    
    guild.features.suggestions.channels.push(newChannelData);
    
    await guild.save();
    
    return newChannelData;
  }

  async updateChannel(guildId: string, channelId: string, updates: Partial<ISuggestionChannel>) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      throw new NotFoundError('Configuration suggestions non trouvée');
    }
    
    const channelIndex = guild.features.suggestions.channels.findIndex(c => c.channelId === channelId);
    
    if (channelIndex === -1) {
      throw new NotFoundError('Configuration de channel non trouvée');
    }
    
    guild.features.suggestions.channels[channelIndex] = {
      ...guild.features.suggestions.channels[channelIndex],
      ...updates
    };
    
    await guild.save();
    
    return guild.features.suggestions.channels[channelIndex];
  }

  async removeChannel(guildId: string, channelId: string) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      throw new NotFoundError('Configuration suggestions non trouvée');
    }
    
    const initialLength = guild.features.suggestions.channels.length;
    guild.features.suggestions.channels = guild.features.suggestions.channels.filter(c => c.channelId !== channelId);
    
    if (guild.features.suggestions.channels.length === initialLength) {
      throw new NotFoundError('Configuration de channel non trouvée');
    }
    
    await guild.save();
    
    return true;
  }

  async findChannelById(guildId: string, channelId: string) {
    const config = await this.getConfig(guildId);
    const channel = config.channels.find(c => c.channelId === channelId);
    if (!channel) {
      throw new NotFoundError('Configuration de channel non trouvée');
    }
    return channel;
  }

  async incrementChannelSuggestionCount(guildId: string, channelId: string) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.suggestions) {
      return 0;
    }
    
    const channel = guild.features.suggestions.channels.find(c => c.channelId === channelId);
    
    if (channel) {
      channel.suggestionCount++;
      await guild.save();
      return channel.suggestionCount;
    }
    
    return 0;
  }

  // ===== SUGGESTION OPERATIONS =====
  async createSuggestion(suggestionData: Partial<ISuggestionItem>) {
    return SuggestionModel.create({
      ...suggestionData,
      reactions: [],
      comments: [],
      views: 0,
      score: 0,
      status: 'pending'
    });
  }

  async findSuggestionById(suggestionId: string) {
    const suggestion = await SuggestionModel.findById(suggestionId);
    if (!suggestion) {
      throw new NotFoundError('Suggestion non trouvée');
    }
    return suggestion;
  }

  async findSuggestionByMessageId(messageId: string) {
    return SuggestionModel.findOne({ messageId });
  }

  async findSuggestionsByGuild(guildId: string, limit: number = 20, skip: number = 0) {
    return SuggestionModel.find({ guildId })
      .sort({ score: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async findSuggestionsByChannel(channelId: string, limit: number = 20) {
    return SuggestionModel.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async updateSuggestion(suggestionId: string, updates: Partial<ISuggestionItem>) {
    const suggestion = await SuggestionModel.findByIdAndUpdate(
      suggestionId,
      { $set: updates },
      { new: true }
    );
    
    if (!suggestion) {
      throw new NotFoundError('Suggestion non trouvée');
    }
    
    return suggestion;
  }

  async updateSuggestionStatus(suggestionId: string, status: SuggestionStatus, moderatorId?: string, note?: string) {
    return this.updateSuggestion(suggestionId, {
      status,
      moderatorId,
      moderatorNote: note,
      moderatedAt: new Date()
    });
  }

  async addReactionToSuggestion(suggestionId: string, emoji: string, userId: string) {
    const suggestion = await this.findSuggestionById(suggestionId);
    
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

  async removeReactionFromSuggestion(suggestionId: string, emoji: string, userId: string) {
    const suggestion = await this.findSuggestionById(suggestionId);
    
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

  private calculateScore(reactions: Array<{emoji: string, count: number}>): number {
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
}