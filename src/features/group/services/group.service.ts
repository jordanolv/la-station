import { Client, TextChannel } from 'discord.js';
import groupRepository from '../repositories/group.repository';
import { IGroup } from '../models/group.model';
import { getGame } from '../data/games';
import GroupUIService from './group-ui.service';

export class GroupService {
  async createGroup(data: {
    creatorId: string;
    gameId: string;
    types: string[];
    modes?: string[];
    rankMin: string | undefined;
    totalSlots: number;
    description?: string;
    sessionTime?: string;
  }): Promise<IGroup> {
    const existing = await groupRepository.findActiveByCreator(data.creatorId);
    if (existing) {
      await this.closeGroup(existing._id.toString(), null);
    }

    return groupRepository.create(data);
  }

  async join(groupId: string, userId: string): Promise<{ group: IGroup | null; alreadyIn: boolean; isFull: boolean }> {
    const group = await groupRepository.findById(groupId);
    if (!group) return { group: null, alreadyIn: false, isFull: false };

    if (group.joinedUserIds.includes(userId)) {
      return { group, alreadyIn: true, isFull: false };
    }

    if (group.joinedUserIds.length >= group.totalSlots) {
      return { group, alreadyIn: false, isFull: true };
    }

    const updated = await groupRepository.addUser(groupId, userId);

    if (updated && updated.joinedUserIds.length >= updated.totalSlots) {
      await groupRepository.setStatus(groupId, 'full');
      updated.status = 'full';
    }

    return { group: updated, alreadyIn: false, isFull: false };
  }

  async leave(groupId: string, userId: string): Promise<{ group: IGroup | null; wasCreator: boolean }> {
    const group = await groupRepository.findById(groupId);
    if (!group) return { group: null, wasCreator: false };

    const wasCreator = group.creatorId === userId;
    const updated = await groupRepository.removeUser(groupId, userId);

    if (updated && updated.status === 'full') {
      await groupRepository.setStatus(groupId, 'open');
      updated.status = 'open';
    }

    return { group: updated, wasCreator };
  }

  async closeGroup(groupId: string, client: Client | null): Promise<void> {
    const group = await groupRepository.findById(groupId);
    if (!group) return;

    await groupRepository.setStatus(groupId, 'closed');

    if (client && group.messageId && group.channelId) {
      try {
        const channel = await client.channels.fetch(group.channelId) as TextChannel;
        const message = await channel.messages.fetch(group.messageId);
        const game = getGame(group.gameId);
        await message.edit({
          content: '',
          components: GroupUIService.buildClosedPost(group, game),
        });
      } catch {}
    }
  }

  async updatePostMessage(client: Client, group: IGroup): Promise<void> {
    if (!group.messageId || !group.channelId) return;

    try {
      const channel = await client.channels.fetch(group.channelId) as TextChannel;
      const message = await channel.messages.fetch(group.messageId);
      const game = getGame(group.gameId);
      await message.edit({
        content: '',
        components: GroupUIService.buildGroupPost(group, game),
      });
    } catch {}
  }
}

export default new GroupService();
