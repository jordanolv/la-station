import { prop, getModelForClass, index, DocumentType } from '@typegoose/typegoose';

class VoiceHistoryEntry {
  @prop({ default: () => new Date() })
  date!: Date;

  @prop({ default: 0 })
  time!: number;
}

class GuildUserProfil {
  @prop({ default: 500 })
  money!: number;

  @prop({ default: 0 })
  exp!: number;

  @prop({ default: 1 })
  lvl!: number;
}

class GameStats {
  @prop({ default: 0 })
  wins!: number;

  @prop({ default: 0 })
  losses!: number;
}

class ArcadeStats {
  @prop({ type: () => GameStats, default: () => ({ wins: 0, losses: 0 }) })
  shifumi!: GameStats;

  @prop({ type: () => GameStats, default: () => ({ wins: 0, losses: 0 }) })
  puissance4!: GameStats;

  @prop({ type: () => GameStats, default: () => ({ wins: 0, losses: 0 }) })
  morpion!: GameStats;

  @prop({ type: () => GameStats, default: () => ({ wins: 0, losses: 0 }) })
  battle!: GameStats;
}

class GuildUserStats {
  @prop({ default: 0 })
  totalMsg!: number;

  @prop({ default: 0 })
  voiceTime!: number;

  @prop({ type: () => [VoiceHistoryEntry], default: [] })
  voiceHistory!: VoiceHistoryEntry[];

  @prop({ type: () => ArcadeStats, default: () => ({}) })
  arcade!: ArcadeStats;
}

class GuildUserInfos {
  @prop({ default: () => new Date() })
  registeredAt!: Date;

  @prop({ default: () => new Date() })
  updatedAt!: Date;

  @prop()
  birthDate?: Date;
}

@index({ discordId: 1, guildId: 1 }, { unique: true })
export class GuildUser {
  @prop({ required: true })
  discordId!: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  guildId!: string;

  @prop({ type: () => GuildUserProfil, default: () => ({}) })
  profil!: GuildUserProfil;

  @prop()
  bio?: string;

  @prop({ type: () => GuildUserStats, default: () => ({}) })
  stats!: GuildUserStats;

  @prop({ type: () => GuildUserInfos, default: () => ({}) })
  infos!: GuildUserInfos;
}

const GuildUserModel = getModelForClass(GuildUser, {
  schemaOptions: {
    timestamps: true,
    collection: 'guild_users'
  }
});

export type IGuildUser = DocumentType<GuildUser>;
export default GuildUserModel; 