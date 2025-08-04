import GlobalUserModel, { IGlobalUser } from '../models/global-user.model';
import GuildUserModel, { IGuildUser } from '../models/guild-user.model';
import { GuildService } from '../../discord/services/guild.service';
import { NotFoundError, BirthdaySearchCriteria, BirthdayUser } from './user.types';

export class UserRepository {

  // ===== GLOBAL USER OPERATIONS =====
  async findGlobalUserById(discordId: string): Promise<IGlobalUser | null> {
    return GlobalUserModel.findOne({ id: discordId });
  }

  async findAllGlobalUsers(): Promise<IGlobalUser[]> {
    return GlobalUserModel.find({});
  }

  async createGlobalUser(userData: { id: string, name: string }): Promise<IGlobalUser> {
    return GlobalUserModel.create({
      id: userData.id,
      name: userData.name,
      registeredAt: Date.now()
    });
  }

  async updateGlobalUser(discordId: string, updates: Partial<IGlobalUser>): Promise<IGlobalUser> {
    const user = await GlobalUserModel.findOneAndUpdate(
      { id: discordId },
      updates,
      { new: true }
    );
    
    if (!user) {
      throw new NotFoundError('Utilisateur global non trouvé');
    }
    
    return user;
  }

  // ===== GUILD USER OPERATIONS =====
  async findGuildUserById(discordId: string, guildId: string): Promise<IGuildUser | null> {
    return GuildUserModel.findOne({ discordId, guildId });
  }

  async findGuildUsersByGuildId(guildId: string): Promise<IGuildUser[]> {
    return GuildUserModel.find({ guildId });
  }

  async createGuildUser(userData: {
    discordId: string,
    name: string,
    guildId: string,
    birthday?: Date
  }): Promise<IGuildUser> {
    const guildUser = await GuildUserModel.create({
      discordId: userData.discordId,
      name: userData.name,
      guildId: userData.guildId,
      profil: { money: 500, exp: 0, lvl: 1 },
      stats: { totalMsg: 0, voiceTime: 0, voiceHistory: [] },
      infos: { 
        registeredAt: new Date(), 
        updatedAt: new Date(),
        birthDate: userData.birthday
      }
    });

    // Ensure global user exists
    const globalUser = await this.findGlobalUserById(userData.discordId);
    if (!globalUser) {
      await this.createGlobalUser({
        id: userData.discordId,
        name: userData.name
      });
    }

    return guildUser;
  }

  async updateGuildUser(
    discordId: string, 
    guildId: string, 
    updates: {
      name?: string;
      birthday?: Date;
      profil?: Partial<{ money: number; exp: number; lvl: number }>;
      stats?: Partial<{ totalMsg: number; voiceTime: number }>;
    }
  ): Promise<IGuildUser> {
    const updateDoc: any = {};

    if (updates.name) updateDoc.name = updates.name;
    if (updates.birthday !== undefined) updateDoc['infos.birthDate'] = updates.birthday;
    if (updates.profil) {
      Object.keys(updates.profil).forEach(key => {
        updateDoc[`profil.${key}`] = updates.profil![key as keyof typeof updates.profil];
      });
    }
    if (updates.stats) {
      Object.keys(updates.stats).forEach(key => {
        updateDoc[`stats.${key}`] = updates.stats![key as keyof typeof updates.stats];
      });
    }

    updateDoc['infos.updatedAt'] = new Date();

    const user = await GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      updateDoc,
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('Utilisateur de guilde non trouvé');
    }

    return user;
  }

  async deleteGuildUser(discordId: string, guildId: string): Promise<boolean> {
    const result = await GuildUserModel.deleteOne({ discordId, guildId });
    return result.deletedCount > 0;
  }

  // ===== BIRTHDAY OPERATIONS =====
  async setBirthday(discordId: string, guildId: string, birthday: Date): Promise<IGuildUser> {
    return this.updateGuildUser(discordId, guildId, { birthday });
  }

  async findUsersByBirthday(criteria: BirthdaySearchCriteria): Promise<BirthdayUser[]> {
    const users = await GuildUserModel.find({
      'infos.birthDate': { $exists: true, $ne: null }
    });

    return users
      .filter(user => {
        if (!user.infos.birthDate) return false;
        const birthday = new Date(user.infos.birthDate);
        return birthday.getMonth() + 1 === criteria.month && 
               birthday.getDate() === criteria.day;
      })
      .map(user => ({
        discordId: user.discordId,
        name: user.name,
        guildId: user.guildId,
        birthday: user.infos.birthDate!,
        age: this.calculateAge(user.infos.birthDate!)
      }));
  }

  // ===== BIRTHDAY CONFIG OPERATIONS =====
  async getBirthdayConfig(guildId: string) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.birthday) {
      guild.features.birthday = {
        channel: '',
        enabled: false
      };
      await guild.save();
    }
    
    return guild.features.birthday;
  }

  async updateBirthdayConfig(guildId: string, updates: { channel?: string; enabled?: boolean }) {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features.birthday) {
      guild.features.birthday = {
        channel: '',
        enabled: false
      };
    }
    
    if (updates.channel !== undefined) guild.features.birthday.channel = updates.channel;
    if (updates.enabled !== undefined) guild.features.birthday.enabled = updates.enabled;
    
    await guild.save();
    return guild.features.birthday;
  }


  // ===== LEVEL OPERATIONS =====
  async addExperience(discordId: string, guildId: string, exp: number): Promise<IGuildUser> {
    const user = await this.findGuildUserById(discordId, guildId);
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const currentExp = user.profil.exp + exp;
    const newLevel = this.calculateLevel(currentExp);
    
    return this.updateGuildUser(discordId, guildId, {
      profil: {
        exp: currentExp,
        lvl: newLevel
      }
    });
  }

  async updateMoney(discordId: string, guildId: string, amount: number): Promise<IGuildUser> {
    const user = await this.findGuildUserById(discordId, guildId);
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const newAmount = Math.max(0, user.profil.money + amount);
    
    return this.updateGuildUser(discordId, guildId, {
      profil: { money: newAmount }
    });
  }

  // ===== HELPER METHODS =====
  private calculateAge(birthday: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    return age;
  }

  private calculateLevel(exp: number): number {
    // Formule de level basique: 100 XP par level
    return Math.floor(exp / 100) + 1;
  }

  // ===== SEARCH & FILTERS =====
  async findTopUsersByExp(guildId: string, limit: number = 10): Promise<IGuildUser[]> {
    return GuildUserModel
      .find({ guildId })
      .sort({ 'profil.exp': -1 })
      .limit(limit);
  }

  async findTopUsersByMoney(guildId: string, limit: number = 10): Promise<IGuildUser[]> {
    return GuildUserModel
      .find({ guildId })
      .sort({ 'profil.money': -1 })
      .limit(limit);
  }

  async findTopUsersByMessages(guildId: string, limit: number = 10): Promise<IGuildUser[]> {
    return GuildUserModel
      .find({ guildId })
      .sort({ 'stats.totalMsg': -1 })
      .limit(limit);
  }

  async findTopUsersByVoiceTime(guildId: string, limit: number = 10): Promise<IGuildUser[]> {
    return GuildUserModel
      .find({ guildId })
      .sort({ 'stats.voiceTime': -1 })
      .limit(limit);
  }
}