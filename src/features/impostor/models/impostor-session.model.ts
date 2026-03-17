import { prop, getModelForClass, index, DocumentType } from '@typegoose/typegoose';

export class PlayerChallenge {
  @prop({ required: true })
  text!: string;

  @prop({ required: true })
  difficulty!: string; // 'easy' | 'medium' | 'hard'

  @prop({ required: true })
  points!: number;
}

export class PlayerGameData {
  @prop({ required: true })
  gameNumber!: number;

  @prop({ type: () => [PlayerChallenge], default: [] })
  challenges!: PlayerChallenge[];

  @prop({ type: () => [Boolean], default: [] })
  validated!: boolean[];
}

export class ImpostorPlayerData {
  @prop({ required: true })
  userId!: string;

  @prop({ required: true })
  username!: string;

  @prop({ required: true })
  teamId!: string; // 'A' or 'B'

  @prop()
  roleId?: string;

  @prop()
  roleName?: string;

  @prop()
  roleEmoji?: string;

  @prop()
  roleGoal?: string; // 'sabotage' | 'detect' | 'get_voted'

  @prop({ type: () => [PlayerGameData], default: [] })
  gameData!: PlayerGameData[];

  @prop()
  vote?: string; // userId they voted as the imposteur of their own team
}

@index({ createdAt: 1 }, { expireAfterSeconds: 86400 }) // auto-delete after 24h
export class ImpostorSession {
  @prop({ required: true })
  hostId!: string;

  @prop({ required: true })
  hostUsername!: string;

  @prop({ required: true })
  gameId!: string;

  @prop({ required: true })
  gameName!: string;

  @prop({ required: true })
  numberOfGames!: number;

  @prop({ required: true })
  challengesPerGame!: number;

  @prop({ default: 0 })
  currentGame!: number;

  @prop({ type: () => [ImpostorPlayerData], default: [] })
  players!: ImpostorPlayerData[];

  @prop({ default: 'lobby' })
  status!: string;

  @prop()
  captainA?: string;

  @prop()
  captainB?: string;

  @prop()
  messageId?: string;

  @prop()
  channelId?: string;

  @prop({ default: () => new Date() })
  createdAt!: Date;
}

const ImpostorSessionModel = getModelForClass(ImpostorSession, {
  schemaOptions: {
    timestamps: true,
    collection: 'impostor_sessions',
  },
});

export type IImpostorSession = DocumentType<ImpostorSession>;
export default ImpostorSessionModel;
