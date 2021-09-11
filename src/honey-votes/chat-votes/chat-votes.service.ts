import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateMessage } from 'twitch-js';
import { TwitchChatService } from '../../twitch-chat/twitch-chat.service';
import { InjectChat } from '../../twitch-chat/twitch-chat.decorators';
import {
  POSTGRES_CONNECTION,
  TWITCH_CHAT_ANONYMOUS,
} from '../../app.constants';
import { ChatVote } from './entities/ChatVote.entity';
import {
  ChatVoting,
  DEFAULT_CHAT_VOTING_RESTRICTIONS,
} from './entities/ChatVoting.entity';
import { UpdateChatVotingDto } from './dto/updateChatVotingDto';
import {
  AddChatVotingDto,
  ChatVotingRestrictions,
} from './dto/addChatVotingDto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/User.entity';
import { SubTier } from '../honey-votes.interface';

const CHAT_CONSUMER_ID = 'ChatVotes';

@Injectable()
export class ChatVotesService {
  private readonly restrictions = new Map<string, ChatVotingRestrictions>();

  constructor(
    @InjectChat(TWITCH_CHAT_ANONYMOUS)
    private readonly twitchChatService: TwitchChatService,
    @InjectRepository(ChatVoting, POSTGRES_CONNECTION)
    private readonly chatVotingRepo: Repository<ChatVoting>,
    @InjectRepository(ChatVote, POSTGRES_CONNECTION)
    private readonly chatVoteRepo: Repository<ChatVote>,
    private readonly usersService: UsersService,
  ) {
    this.init();
  }

  private async init() {
    const chatVotingList = await this.chatVotingRepo.find({
      relations: ['broadcaster'],
    });

    const chatsToListen = chatVotingList.filter(
      (chatVoting) => chatVoting.listening,
    );

    chatsToListen.forEach((chatVoting) => {
      this.restrictions.set(chatVoting.broadcaster.id, chatVoting.restrictions);
      this.twitchChatService.joinChannel(
        chatVoting.broadcaster.login,
        CHAT_CONSUMER_ID,
      );
    });

    this.twitchChatService.addChatListener((message) =>
      this.handleChatMessage(message),
    );
  }

  // TODO: refactor this
  async addChatVoting(
    initiatorId: string,
    { broadcasterId, ...data }: AddChatVotingDto,
  ): Promise<ChatVoting> {
    let broadcaster: User;

    if (broadcasterId === initiatorId) {
      broadcaster = await this.usersService.findOne(broadcasterId);
    } else {
      const [channel, initiator] = await Promise.all([
        this.usersService.findOne(broadcasterId, {
          relations: ['credentials'],
        }),
        this.usersService.findOne(initiatorId, { relations: ['credentials'] }),
      ]);

      const hasAccess = await this.canCreateChatVoting(channel, initiator);

      if (!hasAccess) throw new ForbiddenException();

      broadcaster = channel;
    }

    this.onChatVotingChange(
      broadcaster,
      data.listening,
      data.restrictions || DEFAULT_CHAT_VOTING_RESTRICTIONS,
    );

    const savedChatVoting = await this.chatVotingRepo.save({
      broadcaster,
      ...data,
    } as ChatVoting);

    delete savedChatVoting.broadcaster;

    return savedChatVoting;
  }

  async updateChatVoting(
    initiatorId: string,
    chatVotingId: string,
    data: UpdateChatVotingDto,
  ): Promise<ChatVoting> {
    const [hasAccess, , chatVoting] = await this.canManageChatVoting(
      initiatorId,
      chatVotingId,
    );

    if (!hasAccess) throw new ForbiddenException();

    const broadcaster = chatVoting.broadcaster;

    this.onChatVotingChange(broadcaster, data.listening, data.restrictions);

    const updatedChatVoting = await this.chatVotingRepo.save({
      ...chatVoting,
      ...data,
    } as ChatVoting);

    delete updatedChatVoting.broadcaster;

    return updatedChatVoting;
  }

  async deleteChatVoting(
    initiatorId: string,
    chatVotingId: string,
  ): Promise<void> {
    const [hasAccess, , chatVoting] = await this.canManageChatVoting(
      initiatorId,
      chatVotingId,
    );

    if (!hasAccess) throw new ForbiddenException();

    const broadcaster = chatVoting.broadcaster;

    this.onChatVotingChange(broadcaster, false);

    await this.chatVotingRepo.delete(chatVoting.broadcaster.id);
  }

  async clearChatVotes(
    initiatorId: string,
    chatVotingId: string,
  ): Promise<void> {
    const [hasAccess] = await this.canManageChatVoting(
      initiatorId,
      chatVotingId,
    );

    if (!hasAccess) throw new ForbiddenException();

    await this.deleteChatVotes(chatVotingId);
  }

  private deleteChatVotes(chatVotingId: string) {
    return this.chatVoteRepo.delete({ chatVotingId });
  }

  private onChatVotingChange(
    broadcaster: User,
    listening?: boolean,
    restrictions?: ChatVotingRestrictions,
  ) {
    if (listening === true) {
      this.twitchChatService.joinChannel(broadcaster.login, CHAT_CONSUMER_ID);
    }

    if (listening === false) {
      this.twitchChatService.partChannel(broadcaster.login, CHAT_CONSUMER_ID);
    }

    if (restrictions) {
      this.restrictions.set(broadcaster.id, restrictions);
    }
  }

  private async canCreateChatVoting(
    broadcaster: User,
    initiator: User,
  ): Promise<boolean> {
    if (!broadcaster || !initiator) return false;

    const isEditor = await this.usersService.isEditor(broadcaster, initiator);

    return isEditor;
  }

  private async canManageChatVoting(
    initiatorId: string,
    chatVotingId: string,
  ): Promise<[hasAccess: boolean, initiator?: User, chatVoting?: ChatVoting]> {
    const [initiator, chatVoting] = await Promise.all([
      this.usersService.findOne(initiatorId, { relations: ['credentials'] }),
      this.chatVotingRepo.findOne(chatVotingId, {
        relations: ['broadcaster', 'broadcaster.credentials'],
      }),
    ]);

    if (!initiator || !chatVoting) return [false];

    const isOwner = chatVoting.broadcaster.id === initiator.id;

    if (isOwner) return [true, initiator, chatVoting];

    const isEditor = await this.usersService.isEditor(
      chatVoting.broadcaster,
      initiator,
    );

    return [isEditor, initiator, chatVoting];
  }

  private async canClearVotes(initiatorId: string, broadcasterId: string) {
    if (initiatorId === broadcasterId) return true;

    const [initiator, broadcaster] = await Promise.all([
      this.usersService.findOne(initiatorId, { relations: ['credentials'] }),
      this.usersService.findOne(broadcasterId, { relations: ['credentials'] }),
    ]);

    return this.usersService.isEditor(broadcaster, initiator);
  }

  private handleChatMessage(privateMessage: PrivateMessage) {
    const {
      message,
      username,
      tags: { badgeInfo, badges, color, displayName, emotes, roomId, userId },
    } = privateMessage;

    const restrictions = this.restrictions.get(roomId);

    if (!restrictions) return;

    if (message === '!clearvotes') {
      this.canClearVotes(userId, roomId).then(
        (hasAccess) => {
          if (hasAccess) this.deleteChatVotes(roomId);
        },
        () => {},
      );

      return;
    }

    if (!message.startsWith('%')) return;

    const content = message.slice(1).trim();

    if (!content) return;

    if (!ChatVotesService.isUserCanVote(privateMessage, restrictions)) return;

    // TODO: omit twitch voting badges
    this.chatVoteRepo.save({
      chatVoting: { id: roomId } as any,
      content,
      userId,
      userName: username,
      tags: { badgeInfo, badges, color, displayName, emotes },
    } as ChatVote);
  }

  private static isUserCanVote(
    message: PrivateMessage,
    {
      mod,
      vip,
      subTier1,
      subTier2,
      subTier3,
      viewer,
      subMonthsRequired: months,
    }: ChatVotingRestrictions,
  ) {
    if (viewer) return true;
    if (subTier1 && this.isSub(message, months, SubTier.t1)) return true;
    if (subTier2 && this.isSub(message, months, SubTier.t2)) return true;
    if (subTier3 && this.isSub(message, months, SubTier.t3)) return true;
    if (vip && 'vip' in message.tags.badges) return true;
    if (mod && 'moderator' in message.tags.badges) return true;

    return false;
  }

  private static isSub(
    message: PrivateMessage,
    monthsRequired = 0,
    tier: SubTier = SubTier.t1,
  ) {
    if (monthsRequired > 0) {
      const [, monthsText] = message.tags['badgeInfo'].split('/');

      if (!monthsText) return false;

      const months = Number.parseInt(monthsText, 10);

      if (months < monthsRequired) return false;
    }

    const subBadgeValue = message.tags.badges.subscriber as number;

    if (subBadgeValue === undefined) return false;

    if (tier === SubTier.t1) return true;

    if (tier === SubTier.t2) {
      return subBadgeValue >= 2000 && subBadgeValue < 3000;
    }

    if (tier === SubTier.t3) {
      return subBadgeValue > 3000;
    }

    // TODO: assert never
    return false;
  }
}
