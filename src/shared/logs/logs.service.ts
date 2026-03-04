import {
  ForumChannel,
  ThreadChannel,
  EmbedBuilder,
  GuildMember,
  PartialGuildMember,
  User,
  Role,
  GuildChannel,
  VoiceState,
  Message,
  PartialMessage,
  Invite,
  Guild,
  AuditLogEvent,
} from 'discord.js';
import { BotClient } from '../../bot/client';
import { getGuildId } from '../guild';
import ConfigPanelModel from '../../features/config-panel/models/config-panel.model';

// ─── Thread ID cache ──────────────────────────────────────────────────────────
let _cachedThreadId: string | null = null;

export class LogService {

  // ═══════════════════════════════════════════════════════════════════════════
  // THREAD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * À appeler au ready : scanne le forum admin et verrouille l'ID du thread "📋 Logs".
   * Remplace toujours ce qui est en DB pour éviter de pointer sur un vieux thread.
   */
  static async init(client: BotClient): Promise<void> {
    _cachedThreadId = null;

    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return;

    const state = await ConfigPanelModel.findOne();
    if (!state?.forumChannelId) return;

    const forum = guild.channels.cache.get(state.forumChannelId) as ForumChannel | undefined;
    if (!forum) return;

    const fetched = await forum.threads.fetchActive();
    const thread = fetched.threads.find(t => t.name === '📋 Logs') ?? null;

    if (thread) {
      await ConfigPanelModel.updateOne({}, { $set: { logsThreadId: thread.id } });
      _cachedThreadId = thread.id;
      console.log(`[LogService] Thread de logs initialisé : ${thread.id}`);
    } else {
      console.warn('[LogService] Thread "📋 Logs" introuvable dans le forum admin.');
    }
  }

  static async getLogsThreadId(): Promise<string | null> {
    if (_cachedThreadId) return _cachedThreadId;
    const state = await ConfigPanelModel.findOne();
    const id = (state as any)?.logsThreadId ?? null;
    _cachedThreadId = id;
    return id;
  }

  private static async saveLogsThreadId(threadId: string): Promise<void> {
    await ConfigPanelModel.updateOne({}, { $set: { logsThreadId: threadId } });
    _cachedThreadId = threadId;
  }

  /**
   * Renvoie le thread de logs.
   * Cherche d'abord par ID en cache, puis par nom "📋 Logs" dans le forum admin.
   * Ne crée jamais de thread.
   */
  private static async getLogsThread(client: BotClient): Promise<ThreadChannel | null> {
    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return null;

    // 1. Essayer depuis le cache
    const threadId = await this.getLogsThreadId();
    if (threadId) {
      try {
        const thread = await guild.channels.fetch(threadId) as ThreadChannel | null;
        if (thread) {
          if (thread.archived) await thread.setArchived(false);
          return thread;
        }
      } catch { /* introuvable, on cherche par nom */ }
    }

    // 2. Chercher dans le forum admin par nom
    const state = await ConfigPanelModel.findOne();
    if (!state?.forumChannelId) return null;

    const forum = guild.channels.cache.get(state.forumChannelId) as ForumChannel | undefined;
    if (!forum) return null;

    const fetched = await forum.threads.fetchActive();
    const thread = fetched.threads.find(t => t.name === '📋 Logs') ?? null;

    if (thread) {
      await this.saveLogsThreadId(thread.id);
      return thread;
    }

    return null;
  }

  /**
   * Envoie un séparateur de jour dans le thread de logs.
   * Appelé par le cron à minuit.
   */
  static async sendDaySeparator(client: BotClient): Promise<void> {
    try {
      const thread = await this.getLogsThread(client);
      if (!thread) return;
      const label = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      await thread.send({ content: `\n─────────────────────────────\n📅 **${label.charAt(0).toUpperCase() + label.slice(1)}**\n─────────────────────────────` });
    } catch (error) {
      console.error('[LogService] Erreur séparateur de jour:', error);
    }
  }

  static async send(client: BotClient, embed: EmbedBuilder): Promise<void> {
    try {
      const thread = await this.getLogsThread(client);
      if (!thread) return;
      await thread.send({ embeds: [embed] });
    } catch (error) {
      console.error('[LogService] Erreur envoi log:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPAT
  // ═══════════════════════════════════════════════════════════════════════════

  static async sendEmbed(client: BotClient, embed: EmbedBuilder): Promise<void> {
    return this.send(client, embed);
  }

  static async info(client: BotClient, message: string, options?: { feature?: string; title?: string }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(options?.title ?? 'ℹ️ Info')
      .setDescription(message)
      .setColor(0x3498db)
      .setTimestamp();
    if (options?.feature) embed.setFooter({ text: options.feature });
    await this.send(client, embed);
  }

  static async success(client: BotClient, message: string, options?: { feature?: string; title?: string }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(options?.title ?? '✅ Succès')
      .setDescription(message)
      .setColor(0x27ae60)
      .setTimestamp();
    if (options?.feature) embed.setFooter({ text: options.feature });
    await this.send(client, embed);
  }

  static async warning(client: BotClient, message: string, options?: { feature?: string; title?: string }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(options?.title ?? '⚠️ Avertissement')
      .setDescription(message)
      .setColor(0xf39c12)
      .setTimestamp();
    if (options?.feature) embed.setFooter({ text: options.feature });
    await this.send(client, embed);
  }

  static async error(client: BotClient, message: string, options?: { feature?: string; title?: string }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(options?.title ?? '❌ Erreur')
      .setDescription(message)
      .setColor(0xe74c3c)
      .setTimestamp();
    if (options?.feature) embed.setFooter({ text: options.feature });
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  static async logMessageEdit(
    client: BotClient,
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
  ): Promise<void> {
    if (!oldMessage.author || oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setTitle('📝 Message modifié')
      .setColor(0xf39c12)
      .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
      .addFields(
        { name: 'Auteur', value: `<@${oldMessage.author.id}>`, inline: true },
        { name: 'Salon', value: `<#${oldMessage.channelId}>`, inline: true },
        { name: 'Lien', value: `[Voir le message](${newMessage.url})`, inline: true },
        { name: 'Avant', value: (oldMessage.content || '_vide_').slice(0, 1024), inline: false },
        { name: 'Après', value: (newMessage.content || '_vide_').slice(0, 1024), inline: false },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logMessageDelete(
    client: BotClient,
    message: Message | PartialMessage,
  ): Promise<void> {
    if (!message.author || message.author.bot) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message supprimé')
      .setColor(0xe74c3c)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .addFields(
        { name: 'Auteur', value: `<@${message.author.id}>`, inline: true },
        { name: 'Salon', value: `<#${message.channelId}>`, inline: true },
        { name: 'Contenu', value: (message.content || '_vide_').slice(0, 1024), inline: false },
      )
      .setTimestamp();

    if (message.attachments.size > 0) {
      embed.addFields({ name: 'Fichiers', value: message.attachments.map(a => a.url).join('\n').slice(0, 1024) });
    }

    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMBRES
  // ═══════════════════════════════════════════════════════════════════════════

  static async logMemberJoin(client: BotClient, member: GuildMember): Promise<void> {
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
    const embed = new EmbedBuilder()
      .setTitle('📥 Membre rejoint')
      .setColor(0x57f287)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: 'Utilisateur', value: `<@${member.id}> (${member.user.tag})`, inline: true },
        { name: 'ID', value: member.id, inline: true },
        { name: 'Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAge}j)`, inline: true },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logMemberLeave(client: BotClient, member: GuildMember | PartialGuildMember): Promise<void> {
    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(', ') || '*Aucun*';
    const joinedAt = member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>` : '*Inconnu*';

    const embed = new EmbedBuilder()
      .setTitle('📤 Membre parti')
      .setColor(0xed4245)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: 'Utilisateur', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.id, inline: true },
        { name: 'Rejoint', value: joinedAt, inline: true },
        { name: 'Rôles', value: roles.slice(0, 1024), inline: false },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logMemberUpdate(
    client: BotClient,
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<void> {
    const changes: string[] = [];

    // Pseudo / surnom
    if (oldMember.nickname !== newMember.nickname) {
      changes.push(`**Surnom** : \`${oldMember.nickname ?? 'aucun'}\` → \`${newMember.nickname ?? 'aucun'}\``);
    }

    // Rôles ajoutés/retirés
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    if (addedRoles.size > 0) changes.push(`**Rôles ajoutés** : ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}`);
    if (removedRoles.size > 0) changes.push(`**Rôles retirés** : ${removedRoles.map(r => `<@&${r.id}>`).join(', ')}`);

    // Timeout
    const wasTimedOut = (oldMember as GuildMember).communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;
    if (!wasTimedOut && isTimedOut) {
      changes.push(`**Timeout** : jusqu'à <t:${Math.floor(isTimedOut.getTime() / 1000)}:F>`);
    } else if (wasTimedOut && !isTimedOut) {
      changes.push('**Timeout levé**');
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Membre modifié')
      .setColor(0x3498db)
      .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
      .setDescription(changes.join('\n'))
      .addFields({ name: 'Utilisateur', value: `<@${newMember.id}>`, inline: true })
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logUserUpdate(client: BotClient, oldUser: User | null, newUser: User): Promise<void> {
    if (!oldUser) return;
    const changes: string[] = [];

    if (oldUser.username !== newUser.username) {
      changes.push(`**Pseudo** : \`${oldUser.username}\` → \`${newUser.username}\``);
    }
    if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
      changes.push('**Avatar modifié**');
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('👤 Profil utilisateur modifié')
      .setColor(0x9b59b6)
      .setAuthor({ name: newUser.tag, iconURL: newUser.displayAvatarURL() })
      .setDescription(changes.join('\n'))
      .setThumbnail(newUser.displayAvatarURL())
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOCAL
  // ═══════════════════════════════════════════════════════════════════════════

  static async logVoiceMove(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🔀 Déplacement vocal')
      .setColor(0xf39c12)
      .addFields(
        { name: 'Utilisateur', value: `<@${newState.member!.id}>`, inline: true },
        { name: 'Avant', value: `<#${oldState.channelId}>`, inline: true },
        { name: 'Après', value: `<#${newState.channelId}>`, inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logVoiceStateChange(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    const changes: string[] = [];
    const member = newState.member ?? oldState.member;
    if (!member) return;

    if (!oldState.mute && newState.mute) changes.push('🔇 Micro coupé (mute serveur)');
    if (oldState.mute && !newState.mute) changes.push('🎙️ Micro réactivé (unmute serveur)');
    if (!oldState.deaf && newState.deaf) changes.push('🙉 Sourd (deaf serveur)');
    if (oldState.deaf && !newState.deaf) changes.push('👂 Undeaf serveur');
    if (!oldState.selfMute && newState.selfMute) changes.push('🔇 S\'est coupé le micro');
    if (oldState.selfMute && !newState.selfMute) changes.push('🎙️ A réactivé son micro');
    if (!oldState.selfDeaf && newState.selfDeaf) changes.push('🙉 S\'est mis sourd');
    if (oldState.selfDeaf && !newState.selfDeaf) changes.push('👂 S\'est désourendu');
    if (!oldState.streaming && newState.streaming) changes.push('📺 A commencé un stream');
    if (oldState.streaming && !newState.streaming) changes.push('📺 A arrêté le stream');
    if (!oldState.selfVideo && newState.selfVideo) changes.push('📷 A activé la caméra');
    if (oldState.selfVideo && !newState.selfVideo) changes.push('📷 A désactivé la caméra');

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('🎙️ Changement d\'état vocal')
      .setColor(0x3498db)
      .addFields(
        { name: 'Utilisateur', value: `<@${member.id}>`, inline: true },
        { name: 'Salon', value: newState.channelId ? `<#${newState.channelId}>` : '*Aucun*', inline: true },
        { name: 'Changements', value: changes.join('\n'), inline: false },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SALONS
  // ═══════════════════════════════════════════════════════════════════════════

  static async logChannelCreate(client: BotClient, channel: GuildChannel): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('➕ Salon créé')
      .setColor(0x57f287)
      .addFields(
        { name: 'Nom', value: channel.name, inline: true },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'Catégorie', value: channel.parent?.name ?? '*Aucune*', inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logChannelDelete(client: BotClient, channel: GuildChannel): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Salon supprimé')
      .setColor(0xed4245)
      .addFields(
        { name: 'Nom', value: channel.name, inline: true },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'Catégorie', value: channel.parent?.name ?? '*Aucune*', inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logChannelUpdate(client: BotClient, oldChannel: GuildChannel, newChannel: GuildChannel): Promise<void> {
    const changes: string[] = [];
    if (oldChannel.name !== newChannel.name) changes.push(`**Nom** : \`${oldChannel.name}\` → \`${newChannel.name}\``);

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Salon modifié')
      .setColor(0xf39c12)
      .addFields(
        { name: 'Salon', value: `<#${newChannel.id}>`, inline: true },
        { name: 'Changements', value: changes.join('\n'), inline: false },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÔLES
  // ═══════════════════════════════════════════════════════════════════════════

  static async logRoleCreate(client: BotClient, role: Role): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('➕ Rôle créé')
      .setColor(role.color || 0x57f287)
      .addFields(
        { name: 'Nom', value: role.name, inline: true },
        { name: 'Couleur', value: role.hexColor, inline: true },
        { name: 'Mentionnable', value: role.mentionable ? 'Oui' : 'Non', inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logRoleDelete(client: BotClient, role: Role): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Rôle supprimé')
      .setColor(0xed4245)
      .addFields(
        { name: 'Nom', value: role.name, inline: true },
        { name: 'Couleur', value: role.hexColor, inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logRoleUpdate(client: BotClient, oldRole: Role, newRole: Role): Promise<void> {
    const changes: string[] = [];
    if (oldRole.name !== newRole.name) changes.push(`**Nom** : \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push(`**Couleur** : \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permissions modifiées**');

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Rôle modifié')
      .setColor(newRole.color || 0xf39c12)
      .addFields(
        { name: 'Rôle', value: `<@&${newRole.id}>`, inline: true },
        { name: 'Changements', value: changes.join('\n'), inline: false },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODÉRATION
  // ═══════════════════════════════════════════════════════════════════════════

  static async logBanAdd(client: BotClient, guild: Guild, user: User): Promise<void> {
    // Chercher le moderateur dans l'audit log
    let moderator = '*Inconnu*';
    let reason = '*Aucune*';
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
      const entry = auditLogs.entries.first();
      if (entry && entry.target?.id === user.id) {
        moderator = `<@${entry.executor?.id}>`;
        reason = entry.reason ?? '*Aucune*';
      }
    } catch { /* audit log pas accessible */ }

    const embed = new EmbedBuilder()
      .setTitle('🔨 Membre banni')
      .setColor(0xed4245)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .addFields(
        { name: 'Utilisateur', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Modérateur', value: moderator, inline: true },
        { name: 'Raison', value: reason, inline: false },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logBanRemove(client: BotClient, guild: Guild, user: User): Promise<void> {
    let moderator = '*Inconnu*';
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 });
      const entry = auditLogs.entries.first();
      if (entry && entry.target?.id === user.id) {
        moderator = `<@${entry.executor?.id}>`;
      }
    } catch { }

    const embed = new EmbedBuilder()
      .setTitle('✅ Bannissement levé')
      .setColor(0x57f287)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .addFields(
        { name: 'Utilisateur', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Modérateur', value: moderator, inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVITATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  static async logInviteCreate(client: BotClient, invite: Invite): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🔗 Invitation créée')
      .setColor(0x57f287)
      .addFields(
        { name: 'Code', value: invite.code, inline: true },
        { name: 'Créée par', value: invite.inviter ? `<@${invite.inviter.id}>` : '*Inconnu*', inline: true },
        { name: 'Salon', value: invite.channel ? `<#${invite.channel.id}>` : '*Inconnu*', inline: true },
        { name: 'Expire', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Jamais', inline: true },
        { name: 'Utilisations max', value: String(invite.maxUses ?? '∞'), inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  static async logInviteDelete(client: BotClient, invite: Invite): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Invitation supprimée')
      .setColor(0xed4245)
      .addFields(
        { name: 'Code', value: invite.code, inline: true },
        { name: 'Salon', value: invite.channel ? `<#${invite.channel.id}>` : '*Inconnu*', inline: true },
      )
      .setTimestamp();
    await this.send(client, embed);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  static async logBotAction(client: BotClient, title: string, description: string, color: number = 0x9b59b6): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(`🤖 ${title}`)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: 'Action bot' })
      .setTimestamp();
    await this.send(client, embed);
  }
}
