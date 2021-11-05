import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
import { ChatVoting } from './entities/ChatVoting.entity';
import { UpdateChatVotingDto } from './dto/update-chat-voting.dto';
import {
  CreateChatVotingDto,
  ChatVotingPermissions,
} from './dto/create-chat-voting.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/User.entity';
import { SubTier } from '../honey-votes.interface';
import {
  CHAT_VOTING_COMMANDS_DEFAULT,
  CHAT_VOTING_PERMISSIONS_DEFAULT,
} from './chat-votes.constants';

@Injectable()
export class ChatVotesService {
  private readonly chatVotingList = new Map<string, ChatVoting>();

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
      this.chatVotingList.set(chatVoting.broadcaster.id, chatVoting);
      this.twitchChatService.joinChannel(
        chatVoting.broadcaster.login,
        ChatVotesService.name,
      );
    });

    this.twitchChatService.addChatListener((message) =>
      this.handleChatMessage(message),
    );
  }

  // TODO: refactor this
  async addChatVoting(
    initiatorId: string,
    { broadcasterId, ...data }: CreateChatVotingDto,
  ): Promise<ChatVoting> {
    let broadcaster: User;

    if (broadcasterId === initiatorId) {
      broadcaster = await this.usersService.findOne(broadcasterId);
    } else {
      const options = { relations: ['credentials'] };
      const [channel, initiator] = await Promise.all([
        this.usersService.findOne(broadcasterId, options),
        this.usersService.findOne(initiatorId, options),
      ]);

      const hasAccess = await this.canCreateChatVoting(channel, initiator);

      if (!hasAccess) throw new ForbiddenException();

      broadcaster = channel;
    }

    ChatVotesService.validateChatVoting(data);

    this.onChatVotingChange(broadcaster, {
      listening: data.listening,
      permissions: data.permissions || CHAT_VOTING_PERMISSIONS_DEFAULT,
      commands: data.commands || CHAT_VOTING_COMMANDS_DEFAULT,
    });

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

    ChatVotesService.validateChatVoting(data);

    this.onChatVotingChange(broadcaster, data);

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

    this.onChatVotingChange(broadcaster, { listening: false });

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
    { listening, permissions, commands }: UpdateChatVotingDto,
  ) {
    if (listening === true) {
      this.twitchChatService.joinChannel(
        broadcaster.login,
        ChatVotesService.name,
      );
    }

    if (listening === false) {
      this.twitchChatService.partChannel(
        broadcaster.login,
        ChatVotesService.name,
      );
    }

    if (permissions) {
      const chatVoting = this.chatVotingList.get(broadcaster.id);

      this.chatVotingList.set(broadcaster.id, {
        ...chatVoting,
        permissions,
      });
    }

    if (commands) {
      const chatVoting = this.chatVotingList.get(broadcaster.id);

      this.chatVotingList.set(broadcaster.id, { ...chatVoting, commands });
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

    const chatVoting = this.chatVotingList.get(roomId);

    if (!chatVoting) return;

    if (message === chatVoting.commands.clearVotes) {
      this.canClearVotes(userId, roomId).then(
        (hasAccess) => {
          if (hasAccess) this.deleteChatVotes(roomId);
        },
        () => {},
      );

      return;
    }

    if (!message.startsWith(chatVoting.commands.vote)) return;

    const vote = message.slice(chatVoting.commands.vote.length).trim();

    if (!vote) return;

    if (
      !ChatVotesService.isUserCanVote(privateMessage, chatVoting.permissions)
    ) {
      return;
    }

    // TODO: omit twitch voting badges
    this.chatVoteRepo.save({
      chatVotingId: roomId,
      content: message,
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
      sub,
      viewer,
      subMonthsRequired,
      subTierRequired,
    }: ChatVotingPermissions,
  ) {
    if (viewer) return true;
    if (sub && this.isSub(message, subMonthsRequired, subTierRequired)) {
      return true;
    }
    if (vip && 'vip' in message.tags.badges) return true;
    if (mod && 'moderator' in message.tags.badges) return true;

    return false;
  }

  private static isSub(
    message: PrivateMessage,
    subMonthsRequired = 0,
    subTierRequired: SubTier,
  ) {
    if (subMonthsRequired > 0) {
      const [, monthsText] = message.tags['badgeInfo'].split('/');

      if (!monthsText) return false;

      const months = Number.parseInt(monthsText, 10);

      if (months < subMonthsRequired) return false;
    }

    const subBadgeValue = message.tags.badges.subscriber as number;

    if (subTierRequired === SubTier.Tier1) return subBadgeValue >= 1000;
    if (subTierRequired === SubTier.Tier2) return subBadgeValue >= 2000;
    if (subTierRequired === SubTier.Tier3) return subBadgeValue >= 3000;

    // TODO: assert never
    return false;
  }

  private static validateChatVoting(data: UpdateChatVotingDto) {
    if (data.commands && data.commands.vote === data.commands.clearVotes) {
      throw new BadRequestException();
    }
  }
}
