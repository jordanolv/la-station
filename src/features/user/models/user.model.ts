import { prop, getModelForClass, index, DocumentType } from '@typegoose/typegoose';

class VoiceHistoryEntry {
  @prop({ default: () => new Date() })
  date!: Date;

  @prop({ default: 0 })
  time!: number;
}

class MessageHistoryEntry {
  @prop({ default: () => new Date() })
  date!: Date;

  @prop({ default: 0 })
  count!: number;
}

class UserProfil {
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

  @prop({ type: () => GameStats, default: () => ({ wins: 0, losses: 0 }) })
  bingo!: GameStats;
}

class UserStats {
  @prop({ default: 0 })
  totalMsg!: number;

  @prop({ type: () => [MessageHistoryEntry], default: [] })
  messageHistory!: MessageHistoryEntry[];

  @prop({ default: 0 })
  voiceTime!: number;

  @prop({ type: () => [VoiceHistoryEntry], default: [] })
  voiceHistory!: VoiceHistoryEntry[];

  @prop({ type: () => ArcadeStats, default: () => ({}) })
  arcade!: ArcadeStats;

  @prop({ default: 0 })
  dailyStreak!: number;

  @prop({ default: 0 })
  partyParticipated!: number;

  @prop()
  lastActivityDate?: Date;

  @prop()
  lastDailyClaimDate?: Date;

  /** Points d'activité de la semaine en cours (voc + messages), reset chaque lundi */
  @prop({ default: 0 })
  activityPoints!: number;

  /** Points d'activité de la semaine précédente (snapshot au moment du reset) */
  @prop({ default: 0 })
  lastWeekActivityPoints!: number;
}

class UserInfos {
  @prop({ default: () => new Date() })
  registeredAt!: Date;

  @prop({ default: () => new Date() })
  updatedAt!: Date;

  @prop()
  birthDate?: Date;
}

@index({ discordId: 1 }, { unique: true })
export class User {
  @prop({ required: true })
  discordId!: string;

  @prop({ required: true })
  name!: string;

  @prop({ type: () => UserProfil, default: () => ({}) })
  profil!: UserProfil;

  @prop()
  bio?: string;

  @prop({ type: () => UserStats, default: () => ({}) })
  stats!: UserStats;

  @prop({ type: () => UserInfos, default: () => ({}) })
  infos!: UserInfos;
}

const UserModel = getModelForClass(User, {
  schemaOptions: {
    timestamps: true,
    collection: 'users'
  }
});

export type IUser = DocumentType<User>;
export default UserModel;
