import { Document } from 'mongoose';

interface IGame extends Document {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  messageId: string;
  roleId: string;
}

export default IGame;
