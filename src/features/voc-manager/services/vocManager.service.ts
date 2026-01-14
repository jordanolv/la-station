import { ChannelType, VoiceState, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IVocManagerDoc, IJoinChannel } from '../models/vocManagerConfig.model';
import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';

export const VOC_CONFIG_BUTTON_ID = 'voc-config-button';
export const VOC_INVITE_USER_SELECT_ID = 'voc-invite-user-select';

interface MountainInfo {
  name: string;
  description: string;
  altitude: string;
  image: string;
  wiki: string;
}

export class VocManagerService {
  private static readonly MOUNTAINS: MountainInfo[] = [
    { name: '🇫🇷 Mont Blanc', description: 'Le plus haut sommet des Alpes et d\'Europe occidentale, véritable toit de l\'Europe.', altitude: '4 808 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Mont_Blanc_oct_2004.JPG/800px-Mont_Blanc_oct_2004.JPG', wiki: 'https://fr.wikipedia.org/wiki/Mont_Blanc' },
    { name: '🇨🇭 Cervin', description: 'Pyramide emblématique des Alpes suisses, l\'une des montagnes les plus photographiées au monde.', altitude: '4 478 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg/800px-Matterhorn_from_Domh%C3%BCtte_-_2.jpg', wiki: 'https://fr.wikipedia.org/wiki/Cervin' },
    { name: '🇨🇭 Eiger', description: 'Célèbre pour sa face nord redoutable, l\'un des trois sommets mythiques de l\'Oberland bernois.', altitude: '3 970 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Eiger_Nordwand.jpg/800px-Eiger_Nordwand.jpg', wiki: 'https://fr.wikipedia.org/wiki/Eiger' },
    { name: '🇨🇭 Jungfrau', description: 'La "Vierge", sommet glaciaire des Alpes bernoises avec son célèbre chemin de fer.', altitude: '4 158 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Jungfrau_01.jpg/800px-Jungfrau_01.jpg', wiki: 'https://fr.wikipedia.org/wiki/Jungfrau' },
    { name: '🇳🇵 Everest', description: 'Le plus haut sommet du monde, le toit de la planète dans l\'Himalaya.', altitude: '8 849 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/800px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Everest' },
    { name: '🇵🇰 K2', description: 'Deuxième plus haut sommet au monde, considéré comme plus difficile que l\'Everest.', altitude: '8 611 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/K2%2C_Mount_Godwin_Austen%2C_Chogori%2C_Savage_Mountain.jpg/800px-K2%2C_Mount_Godwin_Austen%2C_Chogori%2C_Savage_Mountain.jpg', wiki: 'https://fr.wikipedia.org/wiki/K2' },
    { name: '🇯🇵 Fuji', description: 'Volcan sacré et symbole du Japon, montagne la plus haute du pays.', altitude: '3 776 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Views_of_Mount_Fuji_from_%C5%8Cwakudani_20211202_143044.jpg/800px-Views_of_Mount_Fuji_from_%C5%8Cwakudani_20211202_143044.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Fuji' },
    { name: '🇺🇸 Denali', description: 'Plus haut sommet d\'Amérique du Nord, anciennement appelé Mont McKinley.', altitude: '6 190 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Wonder_Lake_and_Denali.jpg/800px-Wonder_Lake_and_Denali.jpg', wiki: 'https://fr.wikipedia.org/wiki/Denali' },
    { name: '🇦🇷 Aconcagua', description: 'Plus haut sommet des Amériques et de l\'hémisphère Sud.', altitude: '6 961 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Aconcagua2016.jpg/800px-Aconcagua2016.jpg', wiki: 'https://fr.wikipedia.org/wiki/Aconcagua' },
    { name: '🇹🇿 Kilimandjaro', description: 'Plus haut sommet d\'Afrique, volcan emblématique aux neiges éternelles.', altitude: '5 895 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Kilimanjaro_from_Moshi.jpg/800px-Kilimanjaro_from_Moshi.jpg', wiki: 'https://fr.wikipedia.org/wiki/Kilimandjaro' },
    { name: '🇳🇿 Aoraki', description: 'Plus haut sommet de Nouvelle-Zélande, montagne sacrée pour les Maoris.', altitude: '3 724 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Aoraki_Mount_Cook_from_Hooker_Valley.jpg/800px-Aoraki_Mount_Cook_from_Hooker_Valley.jpg', wiki: 'https://fr.wikipedia.org/wiki/Aoraki/Mont_Cook' },
    { name: '🇬🇷 Olympe', description: 'Montagne mythique, demeure des dieux de la Grèce antique.', altitude: '2 917 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mount_Olympus_-_Greece.jpg/800px-Mount_Olympus_-_Greece.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Olympe' },
    { name: '🇲🇦 Toubkal', description: 'Plus haut sommet d\'Afrique du Nord, dans le Haut Atlas marocain.', altitude: '4 167 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Toubkal_summit.jpg/800px-Toubkal_summit.jpg', wiki: 'https://fr.wikipedia.org/wiki/Toubkal' },
    { name: '🇨🇭 Matterhorn', description: 'Pyramide parfaite des Alpes, montagne emblématique de la Suisse.', altitude: '4 478 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg/800px-Matterhorn_from_Domh%C3%BCtte_-_2.jpg', wiki: 'https://fr.wikipedia.org/wiki/Cervin' },
    { name: '🇪🇸 Mulhacén', description: 'Plus haut sommet de la péninsule Ibérique, dans la Sierra Nevada.', altitude: '3 479 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Mulhacen_desde_capileira.jpg/800px-Mulhacen_desde_capileira.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mulhac%C3%A9n' },
    { name: '🇮🇹 Gran Paradiso', description: 'Seul sommet de plus de 4000m entièrement en Italie, dans les Alpes grées.', altitude: '4 061 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Gran_Paradiso.jpg/800px-Gran_Paradiso.jpg', wiki: 'https://fr.wikipedia.org/wiki/Grand_Paradis' },
    { name: '🇦🇹 Grossglockner', description: 'Plus haute montagne d\'Autriche, sommet majestueux des Alpes orientales.', altitude: '3 798 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grossglockner_Gipfel.jpg/800px-Grossglockner_Gipfel.jpg', wiki: 'https://fr.wikipedia.org/wiki/Grossglockner' },
    { name: '🇬🇧 Ben Nevis', description: 'Plus haut sommet de Grande-Bretagne et des îles Britanniques.', altitude: '1 345 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Ben_Nevis_from_the_West_Highland_Way.jpg/800px-Ben_Nevis_from_the_West_Highland_Way.jpg', wiki: 'https://fr.wikipedia.org/wiki/Ben_Nevis' },
    { name: '🇳🇵 Annapurna', description: 'Premier sommet de 8000m gravi, l\'un des plus dangereux de l\'Himalaya.', altitude: '8 091 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Annapurna_I_ABC.jpg/800px-Annapurna_I_ABC.jpg', wiki: 'https://fr.wikipedia.org/wiki/Annapurna' },
    { name: '🇨🇦 Mont Logan', description: 'Plus haut sommet du Canada, deuxième d\'Amérique du Nord après le Denali.', altitude: '5 959 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Mount_Logan.jpg/800px-Mount_Logan.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Logan' },
    { name: '🇲🇽 Popocatépetl', description: 'Volcan actif emblématique du Mexique, visible depuis Mexico.', altitude: '5 426 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Popocat%C3%A9petl_por_amanalco.jpg/800px-Popocat%C3%A9petl_por_amanalco.jpg', wiki: 'https://fr.wikipedia.org/wiki/Popocat%C3%A9petl' },
    { name: '🇪🇨 Chimborazo', description: 'Point le plus éloigné du centre de la Terre en raison du renflement équatorial.', altitude: '6 263 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Chimborazo.jpg/800px-Chimborazo.jpg', wiki: 'https://fr.wikipedia.org/wiki/Chimborazo' },
    { name: '🇰🇪 Mont Kenya', description: 'Deuxième plus haut sommet d\'Afrique, ancien volcan éteint.', altitude: '5 199 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Mount_Kenya.jpg/800px-Mount_Kenya.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Kenya' },
    { name: '🇿🇦 Table Mountain', description: 'Montagne emblématique du Cap, l\'une des plus anciennes au monde.', altitude: '1 085 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Table_Mountain_DanieVDM.jpg/800px-Table_Mountain_DanieVDM.jpg', wiki: 'https://fr.wikipedia.org/wiki/Montagne_de_la_Table' },
    { name: '🇨🇳 Mont Kailash', description: 'Montagne sacrée pour quatre religions, jamais gravie par respect des traditions.', altitude: '6 638 m', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Mount_Kailash.jpg/800px-Mount_Kailash.jpg', wiki: 'https://fr.wikipedia.org/wiki/Mont_Kailash' },
  ];

  private static getRandomMountain(): MountainInfo {
    return this.MOUNTAINS[Math.floor(Math.random() * this.MOUNTAINS.length)];
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
        const mountainInfo = this.getRandomMountain();

        let channelName = joinChannel.nameTemplate || '{mountain}';
        channelName = channelName
          .replace('{username}', username)
          .replace('{user}', username)
          .replace('{mountain}', mountainInfo.name)
          .replace('{city}', mountainInfo.name)
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
            const mountainEmbed = new EmbedBuilder()
              .setColor('#8B4513')
              .setTitle(`⛰️ ${mountainInfo.name}`)
              .setDescription(mountainInfo.description)
              .addFields(
                { name: '📏 Altitude', value: mountainInfo.altitude, inline: true },
                { name: '🔗 En savoir plus', value: `[Wikipédia](${mountainInfo.wiki})`, inline: true }
              )
              .setImage(mountainInfo.image)
              .setFooter({ text: 'Informations sur la montagne' });

            const configEmbed = new EmbedBuilder()
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
              embeds: [mountainEmbed, configEmbed],
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