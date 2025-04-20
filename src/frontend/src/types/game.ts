export interface IGame {
  _id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  guildId: string;
  threadId?: string;
  messageId?: string;
  roleId?: string;
  reactions?: Array<{
    messageId: string;
    emoji: string;
    roleId: string;
  }>;
} 