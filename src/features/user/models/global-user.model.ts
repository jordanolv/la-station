import { prop, getModelForClass, index } from '@typegoose/typegoose';

@index({ id: 1 }, { unique: true })
export class GlobalUser {
  @prop({ required: true, unique: true })
  id!: string;

  @prop({ required: true })
  name!: string;
}

const GlobalUserModel = getModelForClass(GlobalUser, {
  schemaOptions: {
    timestamps: true,
    collection: 'global_users'
  }
});

export type IGlobalUser = GlobalUser;
export default GlobalUserModel; 