import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';
import { CDM_EVENT_KEY } from '../constants/cdm.constants';

class CdmPrediction {
  @prop({ required: true })
  userId!: string;

  @prop()
  team?: string;

  @prop()
  outsider?: string;
}

export class CdmEvent {
  @prop({ default: CDM_EVENT_KEY, unique: true })
  key!: string;

  @prop({ enum: ['open', 'locked', 'closed'], default: 'open' })
  status!: string;

  @prop({ type: () => [CdmPrediction], default: [] })
  predictions!: CdmPrediction[];

  @prop()
  resultTeam?: string;

  @prop()
  resultOutsider?: string;

  @prop()
  announceChannelId?: string;

  @prop()
  paidAt?: Date;
}

const CdmEventModel = getModelForClass(CdmEvent, {
  schemaOptions: { collection: 'cdm_events', timestamps: true },
});

export type ICdmEvent = DocumentType<CdmEvent>;
export type ICdmPrediction = CdmPrediction;
export default CdmEventModel;
