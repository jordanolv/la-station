import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class UnlockedMountain {
  @prop({ required: true })
  mountainId!: string;

  @prop({ required: true })
  unlockedAt!: Date;
}

export class UserMountains {
  @prop({ required: true, unique: true })
  userId!: string;

  @prop({ type: () => [UnlockedMountain], default: [] })
  unlockedMountains!: UnlockedMountain[];
}

const UserMountainsModel = getModelForClass(UserMountains, {
  schemaOptions: {
    timestamps: true,
    collection: 'user_mountains'
  }
});

export type IUserMountains = UserMountains;
export type IUserMountainsDoc = DocumentType<UserMountains>;
export default UserMountainsModel;
