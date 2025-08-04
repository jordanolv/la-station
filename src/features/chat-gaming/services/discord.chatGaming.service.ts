import { Guild, EmbedBuilder, ForumChannel, MessageReaction, User, ThreadChannel, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IChatGamingItem } from '../models/chatGamingItem.model';
import { ChatGamingRepository } from './chatGaming.repository';
import { DiscordGameData } from './chatGaming.types';

export class DiscordChatGamingService {
  private repository: ChatGamingRepository;

  constructor() {
    this.repository = new ChatGamingRepository();
  }

  /**
   * Crée un jeu avec thread et rôle Discord
   */
  async createGameInDiscord(game: IChatGamingItem, guild: Guild, channelId: string): Promise<DiscordGameData> {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !(channel instanceof ForumChannel)) {
      throw new Error('Channel introuvable ou n\'est pas un forum');
    }

    // Créer le rôle
    const gameRole = await guild.roles.create({
      name: `🎮 ${game.name}`,
      color: game.color ? parseInt(game.color.replace('#', ''), 16) : 0x55CCFC,
      hoist: false,
      mentionable: true,
      reason: `Role created for game: ${game.name}`
    });

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${game.name}`)
      .setDescription(game.description || 'Nouveau jeu disponible!')
      .setColor(game.color ? parseInt(game.color.replace('#', ''), 16) : 0x55CCFC)
      .addFields({
        name: '🔔 Rejoindre le jeu',
        value: 'Réagis avec 🔔 pour obtenir le rôle et être notifié!',
        inline: false
      })
      .setTimestamp();

    // Ajouter l'image si présente
    if (game.image && game.image.startsWith('http')) {
      embed.setImage(game.image);
    }

    // Créer le thread
    const thread = await channel.threads.create({
      name: `🎮 ${game.name}`,
      message: { embeds: [embed] },
      reason: `Thread created for game: ${game.name}`
    });

    // Ajouter la réaction
    const firstMessage = await thread.fetchStarterMessage();
    await firstMessage?.react('🔔');

    return {
      threadId: thread.id,
      messageId: firstMessage.id,
      roleId: gameRole.id
    };
  }

  /**
   * Gère l'ajout d'une réaction pour obtenir un rôle de jeu
   */
  async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (!reaction.message.guild) return;
    if (reaction.emoji.name !== '🔔') return;

    const guild = reaction.message.guild;
    const game = await this.repository.findByMessageId(reaction.message.id);
    if (!game || !game.roleId) return;

    const member = await guild.members.fetch(user.id);
    if (!member) return;

    const role = guild.roles.cache.get(game.roleId);
    if (!role) return;

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role);

      if (reaction.message.channel.isThread()) {
        const thread = reaction.message.channel as ThreadChannel;
        await thread.members.add(user.id);
      }

      console.log(`Added role ${role.name} to ${member.user.tag} for game ${game.name}`);
    }
  }

  /**
   * Gère la suppression d'une réaction pour retirer un rôle de jeu
   */
  async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (!reaction.message.guild) return;
    if (reaction.emoji.name !== '🔔') return;

    const guild = reaction.message.guild;
    const game = await this.repository.findByMessageId(reaction.message.id);
    if (!game || !game.roleId) return;

    const member = await guild.members.fetch(user.id);
    if (!member) return;

    const role = guild.roles.cache.get(game.roleId);
    if (!role) return;

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);

      if (reaction.message.channel.isThread()) {
        const thread = reaction.message.channel as ThreadChannel;
        await thread.members.remove(user.id);
      }

      console.log(`Removed role ${role.name} from ${member.user.tag} for game ${game.name}`);
    }
  }

  /**
   * Vérifie si l'utilisateur a des rôles gaming et lui rappelle de les prendre si nécessaire
   */
  async checkAndRemindGamingRole(message: Message, cooldownMap: Map<string, number>, cooldownTime: number): Promise<void> {
    if (!message.guild || message.author.bot) return;
    if (!message.channel.isThread()) return;

    const member = message.guild.members.cache.get(message.author.id);
    if (!member) return;

    // Trouver le jeu correspondant à ce thread spécifique
    const currentGame = await this.repository.findByThreadId(message.channel.id);
    if (!currentGame || !currentGame.roleId) return;

    // Vérifier si l'utilisateur a le rôle spécifique à ce jeu/thread
    const hasThisGameRole = member.roles.cache.has(currentGame.roleId);
    if (hasThisGameRole) return;

    // Vérifier le cooldown pour cet utilisateur
    const userId = message.author.id;
    const lastReminder = cooldownMap.get(userId) || 0;
    
    if (Date.now() - lastReminder < cooldownTime) return;

    // Envoyer le rappel et le supprimer après 10 secondes
    const reminderMessage = await message.reply("👋 N'oublie pas de récupérer le rôle de ce jeu avec la 🔔 plus haut !");
    
    // Supprimer le message après 10 secondes
    setTimeout(async () => {
      try {
        await reminderMessage.delete();
      } catch (error) {
        // Ignore si le message est déjà supprimé
      }
    }, 10000);
    
    // Mettre à jour le cache
    cooldownMap.set(userId, Date.now());
  }

  /**
   * Supprime le rôle et nettoie Discord quand un jeu est supprimé
   */
  async cleanupGameFromDiscord(client: BotClient, game: IChatGamingItem): Promise<void> {
    try {
      const guild = client.guilds.cache.get(game.guildId);
      if (!guild) return;

      // Supprimer le rôle
      if (game.roleId) {
        const role = guild.roles.cache.get(game.roleId);
        if (role) {
          await role.delete('Game deleted');
        }
      }

      // Archiver/supprimer le thread
      if (game.threadId) {
        const thread = guild.channels.cache.get(game.threadId);
        if (thread && thread.isThread()) {
          await thread.setArchived(true, 'Game deleted');
        }
      }
    } catch (error) {
      console.error('Error cleaning up Discord for game:', error);
    }
  }
}