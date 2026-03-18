import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

class BetOption {
  @prop({ required: true })
  name!: string;

  @prop({ default: 0 })
  totalAmount!: number;

  @prop({ default: 0 })
  entryCount!: number;
}

class BetEntry {
  @prop({ required: true })
  userId!: string;

  @prop({ required: true })
  optionIndex!: number;

  @prop({ required: true })
  amount!: number;
}

export class Bet {
  @prop({ required: true })
  title!: string;

  @prop({ type: () => [BetOption], default: [] })
  options!: BetOption[];

  @prop({ type: () => [BetEntry], default: [] })
  entries!: BetEntry[];

  @prop({ enum: ['open', 'locked', 'closed', 'refunded'], default: 'open' })
  status!: string;

  @prop({ required: true })
  channelId!: string;

  @prop({ required: true })
  messageId!: string;

  @prop({ required: true })
  createdBy!: string;

  @prop()
  winnerIndex?: number;

  @prop({ default: 5 })
  rakePercent!: number;
}

const BetModel = getModelForClass(Bet, {
  schemaOptions: { collection: 'bets', timestamps: true },
});

export type IBet = DocumentType<Bet>;
export default BetModel;
