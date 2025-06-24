import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILogs extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  channel: string;
}

const LogsSchema = new Schema<ILogs>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  channel: { type: String, default: '' }
});

const LogsModel = mongoose.model<ILogs>('Logs', LogsSchema);

export default LogsModel;
