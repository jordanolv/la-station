import { ChannelType, VoiceState, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IVocManagerDoc, IJoinChannel } from '../models/vocManagerConfig.model';
import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';

export const VOC_CONFIG_BUTTON_ID = 'voc-config-button';
export const VOC_INVITE_USER_SELECT_ID = 'voc-invite-user-select';

export class VocManagerService {
  private static readonly MOUNTAIN_NAMES = [
    // Montagnes d'Europe
    '🇫🇷 Mont Blanc', '🇨🇭 Cervin', '🇨🇭 Mont Rose', '🇫🇷 Aiguille Verte', '🇫🇷 Grandes Jorasses',
    '🇨🇭 Eiger', '🇨🇭 Jungfrau', '🇨🇭 Mönch', '🇨🇭 Mont Cervin', '🇮🇹 Monte Rosa',
    '🇮🇹 Gran Paradiso', '🇨🇭 Piz Bernina', '🇮🇹 Ortles', '🇦🇹 Grossglockner', '🇩🇪 Zugspitze',
    '🇸🇮 Triglav', '🇬🇷 Olympe', '🇬🇷 Parnasse', '🇬🇧 Ben Nevis', '🇬🇧 Snowdon',
    '🇬🇧 Scafell Pike', '🇪🇸 Mulhacén', '🇪🇸 Pico de Aneto', '🇮🇹 Marmolada', '🇮🇹 Tofana',
    '🇮🇹 Dolomites', '🇵🇱 Tatra', '🇵🇱 Rysy', '🇸🇰 Gerlachovský štít', '🇷🇴 Moldoveanu',

    // Montagnes d'Asie
    '🇳🇵 Everest', '🇵🇰 K2', '🇳🇵 Kangchenjunga', '🇳🇵 Lhotse', '🇳🇵 Makalu',
    '🇳🇵 Cho Oyu', '🇳🇵 Dhaulagiri', '🇳🇵 Manaslu', '🇵🇰 Nanga Parbat', '🇳🇵 Annapurna',
    '🇵🇰 Gasherbrum', '🇵🇰 Broad Peak', '🇨🇳 Shishapangma', '🇳🇵 Ama Dablam', '🇳🇵 Pumori',
    '🇯🇵 Fuji', '🇲🇾 Mont Kinabalu', '🇮🇩 Puncak Jaya', '🇹🇷 Ararat', '🇮🇷 Damavand',

    // Montagnes des Amériques
    '🇺🇸 Denali', '🇨🇦 Mont Logan', '🇲🇽 Pico de Orizaba', '🇺🇸 Mont Saint Elias', '🇲🇽 Popocatépetl',
    '🇺🇸 Mont Foraker', '🇲🇽 Iztaccíhuatl', '🇨🇦 Mont Lucania', '🇺🇸 Mont Whitney', '🇺🇸 Mont Rainier',
    '🇦🇷 Aconcagua', '🇨🇱 Ojos del Salado', '🇦🇷 Monte Pissis', '🇵🇪 Huascarán', '🇪🇨 Chimborazo',
    '🇪🇨 Cotopaxi', '🇧🇴 Illimani', '🇧🇴 Sajama', '🇦🇷 Mercedario', '🇦🇷 Tupungato',

    // Montagnes d'Afrique
    '🇹🇿 Kilimandjaro', '🇰🇪 Mont Kenya', '🇺🇬 Mont Stanley', '🇹🇿 Meru', '🇪🇹 Ras Dashen',
    '🇷🇼 Mont Karisimbi', '🇺🇬 Mont Elgon', '🇲🇦 Toubkal', '🇨🇲 Mont Cameroun', '🇬🇶 Pico Basile',

    // Montagnes d'Océanie
    '🇳🇿 Aoraki', '🇳🇿 Mont Cook', '🇳🇿 Mont Tasman', '🇮🇩 Puncak Trikora', '🇮🇩 Puncak Mandala',
    '🇳🇿 Mont Aspiring', '🇳🇿 Mont Ruapehu', '🇳🇿 Mont Taranaki', '🇦🇺 Mont Kosciuszko', '🇦🇺 Mont Bogong',

    // Montagnes mythiques et célèbres
    '🇦🇺 Ayers Rock', '🇿🇦 Table Mountain', '🇨🇭 Matterhorn', '🇪🇬 Mont Sinaï', '🇹🇷 Mont Ararat',
    '🇬🇷 Mont Athos', '🇨🇳 Mont Kailash', '🇨🇳 Mont Wutai', '🇨🇳 Mont Emei', '🇨🇳 Mont Hengshan'
  ];

  private static getRandomMountain(): string {
    return this.MOUNTAIN_NAMES[Math.floor(Math.random() * this.MOUNTAIN_NAMES.length)];
  }

  static async getVocManager(guildId: string): Promise<IVocManager | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.vocManager || null;
  }

  /**
   * Crée une configuration VocManager pour une guilde
   */
  static async createVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    const vocManagerConfig: IVocManager = {
      enabled,
      joinChannels: [],
      createdChannels: [],
      channelCount: 0
    };

    guild.features = guild.features || {};
    guild.features.vocManager = vocManagerConfig;
    await guild.save();

    return vocManagerConfig;
  }

  /**
   * Récupère ou crée une configuration VocManager pour une guilde
   */
  static async getOrCreateVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const vocManager = await this.getVocManager(guildId);
    if (vocManager) {
      return vocManager;
    }
    
    return this.createVocManager(guildId, enabled);
  }

  /**
   * Ajoute un canal à la liste des canaux créés
   */
  static async addChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.createdChannels.push(channelId);
    guild.features.vocManager.channelCount += 1;
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Supprime un canal de la liste des canaux créés
   */
  static async removeChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features?.vocManager) return null;

    guild.features.vocManager.createdChannels = guild.features.vocManager.createdChannels.filter(
      (id: string) => id !== channelId
    );
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Ajoute un canal de jointure avec ses paramètres
   */
  static async addJoinChannel(
    guildId: string, 
    channelId: string, 
    category: string,
    nameTemplate: string = '🎮 {username} #{count}'
  ): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    // Vérifier si ce canal existe déjà
    const existingIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    
    if (existingIndex !== -1) {
      // Mettre à jour le canal existant
      guild.features.vocManager.joinChannels[existingIndex] = {
        id: channelId,
        nameTemplate,
        category,
      };
    } else {
      // Ajouter un nouveau canal
      guild.features.vocManager.joinChannels.push({
        id: channelId,
        nameTemplate,
        category,
      });
    }

    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Supprime un canal de jointure
   */
  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;

    guild.features.vocManager.joinChannels = guild.features.vocManager.joinChannels.filter(
      channel => channel.id !== channelId
    );
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Modifie les paramètres d'un canal de jointure spécifique
   */
  static async updateJoinChannelSettings(
    guildId: string, 
    channelId: string, 
    nameTemplate?: string,
    category?: string
  ): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;

    const channelIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    if (channelIndex === -1) return null;

    if (nameTemplate !== undefined) {
      guild.features.vocManager.joinChannels[channelIndex].nameTemplate = nameTemplate;
    }
    
    if (category !== undefined) {
      guild.features.vocManager.joinChannels[channelIndex].category = category;
    }

    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.enabled = enabled;
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Récupère les paramètres d'un canal de jointure spécifique
   */
  static async getJoinChannelSettings(
    guildId: string, 
    channelId: string
  ): Promise<IJoinChannel | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    const joinChannel = vocManagerData.joinChannels.find(channel => channel.id === channelId);
    return joinChannel || null;
  }

  /**
   * Gère l'événement quand un utilisateur rejoint un canal vocal
   */
  static async handleUserJoinChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (newState.member?.user.bot) return;
      
      const guildId = newState.guild.id;
      
      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;
      
      // Vérifier si le canal rejoint est un canal de jointure
      const joinChannel = vocManager.joinChannels.find(channel => channel.id === newState.channelId);
      
      if (joinChannel) {
        // Créer un nouveau canal vocal
        const username = newState.member?.user.username || 'Utilisateur';
        const channelNumber = vocManager.channelCount + 1;
        const randomMountain = this.getRandomMountain();

        let channelName = joinChannel.nameTemplate || '{mountain}';
        channelName = channelName
          .replace('{username}', username)
          .replace('{user}', username)
          .replace('{mountain}', randomMountain)
          .replace('{city}', randomMountain)
          .replace('{count}', channelNumber.toString())
          .replace('{total}', channelNumber.toString());
        
        try {
          // Créer le canal vocal
          const newChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: joinChannel.category,
          });

          // Déplacer l'utilisateur dans le nouveau canal
          if (newState.member && newState.member.voice.channel) {
            await newState.member.voice.setChannel(newChannel).catch(error => {
              console.error('Erreur lors du déplacement de l\'utilisateur:', error);
            });
          }

          // Mettre à jour la base de données
          await this.addChannel(guildId, newChannel.id);

          // Poster le message de configuration dans le salon textuel intégré du vocal
          try {
            const embed = new EmbedBuilder()
              .setColor('#5865F2')
              .setTitle('🎙️ Salon vocal créé !')
              .setDescription(`<@${newState.member?.id}> a créé ce salon vocal **${channelName}**.\n\nUtilisez le bouton ci-dessous pour configurer le salon.`)
              .addFields(
                { name: '📝 Nom actuel', value: channelName, inline: true },
                { name: '👥 Limite', value: 'Illimité', inline: true },
                { name: '🔒 Visibilité', value: 'Public', inline: true }
              )
              .setFooter({ text: 'Configuration disponible pendant toute la durée du salon' });

            const configButton = new ButtonBuilder()
              .setCustomId(`${VOC_CONFIG_BUTTON_ID}_${guildId}_${newChannel.id}_${newState.member?.id}`)
              .setLabel('⚙️ Configurer')
              .setStyle(ButtonStyle.Primary);

            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(configButton);

            // Envoyer dans le salon textuel intégré au vocal (Text-in-Voice)
            await newChannel.send({
              embeds: [embed],
              components: [buttonRow]
            });

            console.log(`[VocManager] Message de configuration envoyé dans le vocal ${newChannel.name}`);
          } catch (error) {
            console.error('Erreur lors de la création du message de configuration:', error);
          }

          console.log(`[VocManager] Canal vocal créé: ${newChannel.name} pour ${username}`);
        } catch (error) {
          console.error('Erreur lors de la création du canal vocal:', error);
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserJoinChannel:', error);
    }
  }

  /**
   * Met à jour le message de configuration pour ajouter/retirer le select menu d'invitations
   */
  static async updateConfigMessage(
    channelId: string,
    guildId: string,
    ownerId: string,
    isPrivate: boolean,
    channelName: string,
    limit: number,
    client: BotClient
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildVoice) return;

      // Récupérer les messages du canal
      const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
      if (!messages) return;

      // Trouver le message de configuration
      const configMessage = messages.find(msg =>
        msg.embeds.length > 0 &&
        msg.embeds[0].title === '🎙️ Salon vocal créé !' &&
        msg.components.length > 0
      );

      if (!configMessage) return;

      // Mettre à jour l'embed
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎙️ Salon vocal créé !')
        .setDescription(`<@${ownerId}> a créé ce salon vocal **${channelName}**.\n\nUtilisez le bouton ci-dessous pour configurer le salon.`)
        .addFields(
          { name: '📝 Nom actuel', value: channelName, inline: true },
          { name: '👥 Limite', value: limit === 0 ? 'Illimité' : `${limit} personnes`, inline: true },
          { name: '🔒 Visibilité', value: isPrivate ? '🔒 Privé' : '🌐 Public', inline: true }
        )
        .setFooter({ text: 'Configuration disponible pendant toute la durée du salon' });

      const configButton = new ButtonBuilder()
        .setCustomId(`${VOC_CONFIG_BUTTON_ID}_${guildId}_${channelId}_${ownerId}`)
        .setLabel('⚙️ Configurer')
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(configButton);

      const components: ActionRowBuilder<ButtonBuilder | UserSelectMenuBuilder>[] = [
        buttonRow
      ];

      // Ajouter le select menu d'invitations seulement si le canal est privé
      if (isPrivate) {
        const userSelect = new UserSelectMenuBuilder()
          .setCustomId(`${VOC_INVITE_USER_SELECT_ID}_${guildId}_${channelId}_${ownerId}`)
          .setPlaceholder('➕ Sélectionner des utilisateurs à inviter')
          .setMinValues(1)
          .setMaxValues(10);

        const inviteRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
        components.push(inviteRow);
      }

      await configMessage.edit({
        embeds: [embed],
        components: components
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message de configuration:', error);
    }
  }

  /**
   * Gère l'événement quand un utilisateur quitte un canal vocal
   */
  static async handleUserLeaveChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (oldState.member?.user.bot) return;
      
      const guildId = oldState.guild.id;
      
      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;
      
      // Vérifier si le canal quitté est un canal créé par le gestionnaire
      if (vocManager.createdChannels.includes(oldState.channelId || '')) {
        const channel = oldState.channel;
        
        // Si le canal est vide, le supprimer
        if (channel && channel.members.size === 0) {
          try {
            await channel.delete();
            
            // Mettre à jour la base de données
            await this.removeChannel(guildId, oldState.channelId || '');
            
            console.log(`[VocManager] Canal vocal supprimé: ${channel.name}`);
          } catch (error) {
            console.error('Erreur lors de la suppression du canal vocal:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserLeaveChannel:', error);
    }
  }
} 