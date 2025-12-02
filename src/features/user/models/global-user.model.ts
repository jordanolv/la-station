import { prop, getModelForClass } from '@typegoose/typegoose';

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