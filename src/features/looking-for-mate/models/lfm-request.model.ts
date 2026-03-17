import { prop, getModelForClass, index, DocumentType } from '@typegoose/typegoose';

/**
 * Looking For Mate Request Model
 * Stores game party/mate searching requests from users
 */
@index({ createdAt: 1 }, { expireAfterSeconds: 86400 }) // Auto-delete after 24h
export class LFMRequest {
  @prop({ required: true })
  userId!: string;

  @prop({ required: true })
  username!: string;


  @prop({ required: true })
  game!: string;

  @prop({ required: true, min: 1, max: 10 })
  numberOfMates!: number;

  @prop()
  rank?: string;

  @prop()
  gameMode?: string; // For games like Rocket League: "2v2", "3v3", etc.

  @prop()
  type?: string; // "Casual", "Ranked", "Privé", "Aram", etc.

  @prop()
  sessionTime?: string;

  @prop()
  description?: string;

  @prop({ default: 'open', enum: ['open', 'in_progress', 'completed', 'cancelled'] })
  status!: 'open' | 'in_progress' | 'completed' | 'cancelled';

  @prop()
  messageId?: string; // Discord message ID for the LFM post

  @prop()
  channelId?: string;

  @prop()
  gameRoleId?: string; // Discord role ID for the game

  @prop({ type: () => [String], default: [] })
  interestedUsers!: string[];

  @prop({ type: () => [String], default: [] })
  waitlistUsers!: string[];

  @prop({ default: () => new Date() })
  createdAt!: Date;

  @prop()
  updatedAt?: Date;

  @prop()
  expiresAt?: Date; // Manual expiration if needed
}

const LFMRequestModel = getModelForClass(LFMRequest, {
  schemaOptions: {
    timestamps: true,
    collection: 'lfm_requests'
  }
});

export type ILFMRequest = DocumentType<LFMRequest>;
export default LFMRequestModel;
