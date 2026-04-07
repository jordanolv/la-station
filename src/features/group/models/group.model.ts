import { prop, getModelForClass } from '@typegoose/typegoose';
import type { DocumentType } from '@typegoose/typegoose';

export class Group {
  @prop({ required: true })
  creatorId!: string;

  @prop({ required: true })
  gameId!: string;

  @prop({ required: true })
  type!: string;

  @prop()
  mode?: string;

  @prop()
  rankMin?: string;

  @prop({ required: true })
  totalSlots!: number;

  @prop({ type: () => [String], default: [] })
  joinedUserIds!: string[];

  @prop()
  description?: string;

  @prop()
  sessionTime?: string;

  @prop()
  messageId?: string;

  @prop()
  channelId?: string;

  @prop({ default: 'open' })
  status!: 'open' | 'full' | 'closed';

  @prop({ required: true })
  createdAt!: Date;

  @prop({ required: true })
  expiresAt!: Date;
}

const GroupModel = getModelForClass(Group, {
  schemaOptions: { collection: 'groups' },
});

export type IGroup = DocumentType<Group>;
export default GroupModel;
