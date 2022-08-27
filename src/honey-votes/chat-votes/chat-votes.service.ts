import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwitchChatService } from '../../twitch-chat/twitch-chat.service';
import { ChatVote } from './entities/chat-vote.entity';
import { ChatVoting } from './entities/chat-voting.entity';
import { UpdateChatVotingDto } from './dto/update-chat-voting.dto';
import {
  CreateChatVotingDto,
  ChatVotingPermissions,
} from './dto/create-chat-voting.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { SubTier } from '../honey-votes.constants';
import {
  CHAT_VOTING_COMMANDS_DEFAULT,
  CHAT_VOTING_PERMISSIONS_DEFAULT,
} from './chat-votes.constants';
import { OnMessage } from '../../twitch-chat/twitch-chat.interface';
import { ChatUser } from '@twurple/chat/lib';

@Injectable()
export class ChatVotesService implements OnModuleInit {
  private readonly chatVotingList = new Map<string, ChatVoting>();

  constructor(
    private readonly twitchChat: TwitchChatService,
    @InjectRepository(ChatVoting)
    private readonly chatVotingRepo: Repository<ChatVoting>,
    @InjectRepository(ChatVote)
    private readonly chatVoteRepo: Repository<ChatVote>,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const chatVotingItems = await this.chatVotingRepo.find({
      relations: ['broadcaster'],
    });

    chatVotingItems.forEach((chatVoting) => {
      this.chatVotingList.set(chatVoting.broadcaster.id, chatVoting);

      if (chatVoting.listening) {
        this.twitchChat.join(
          chatVoting.broadcaster.login,
          ChatVotesService.name,
        );
      }
    });

    this.twitchChat.on('message', (...args) => this.handleChatMessage(...args));
  }

  // TODO: refactor this
  async addChatVoting(
    initiatorId: string,
    { broadcasterId, ...data }: CreateChatVotingDto,
  ): Promise<ChatVoting> {
    let broadcaster: User;

    if (broadcasterId === initiatorId) {
      broadcaster = await this.usersService.findOneBy({ id: broadcasterId });
    } else {
      const relations = { credentials: true };
      const [channel, initiator] = await Promise.all([
        this.usersService.findOne({ where: { id: broadcasterId }, relations }),
        this.usersService.findOne({ where: { id: initiatorId }, relations }),
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
      this.twitchChat.join(broadcaster.login, ChatVotesService.name);
    }

    if (listening === false) {
      this.twitchChat.part(broadcaster.login, ChatVotesService.name);
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
      this.usersService.findOne({
        where: { id: initiatorId },
        relations: { credentials: true },
      }),
      this.chatVotingRepo.findOne({
        where: { broadcasterId: chatVotingId },
        relations: { broadcaster: { credentials: true } },
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
      this.usersService.findOne({
        where: { id: initiatorId },
        relations: { credentials: true },
      }),
      this.usersService.findOne({
        where: { id: broadcasterId },
        relations: { credentials: true },
      }),
    ]);

    return this.usersService.isEditor(broadcaster, initiator);
  }

  private handleChatMessage: OnMessage = (channel, userName, message, msg) => {
    const { badgeInfo, badges, color, displayName, userId } = msg.userInfo;
    const { emoteOffsets, channelId } = msg;

    const chatVoting = this.chatVotingList.get(channelId);

    if (!chatVoting) return;

    if (message === chatVoting.commands.clearVotes) {
      this.canClearVotes(userId, channelId).then(
        (hasAccess) => {
          if (hasAccess) this.deleteChatVotes(channelId);
        },
        () => {},
      );

      return;
    }

    if (!message.startsWith(chatVoting.commands.vote)) return;

    const vote = message.slice(chatVoting.commands.vote.length).trim();

    if (!vote) return;

    if (!ChatVotesService.isUserCanVote(msg.userInfo, chatVoting.permissions)) {
      return;
    }

    // TODO: omit twitch voting badges. Or do it on the frontend
    this.chatVoteRepo.save({
      chatVotingId: channelId,
      content: message,
      userId,
      userName,
      tags: {
        badgeInfo: Object.fromEntries(badgeInfo),
        badges: Object.fromEntries(badges),
        color,
        displayName,
        emoteOffsets: Object.fromEntries(emoteOffsets),
      },
    } as ChatVote);
  };

  private static isUserCanVote(
    chatUser: ChatUser,
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
    if (
      sub &&
      ChatVotesService.isSub(chatUser, subMonthsRequired, subTierRequired)
    ) {
      return true;
    }
    if (vip && chatUser.isVip) return true;
    if (mod && chatUser.isMod) return true;

    return false;
  }

  private static isSub(
    chatUser: ChatUser,
    subMonthsRequired = 0,
    subTierRequired = SubTier.Tier1,
  ) {
    if (subMonthsRequired > 0) {
      const subMonthsText = chatUser.badgeInfo.get('subscriber');
      if (!subMonthsText) return false;
      const subMonths = Number.parseInt(subMonthsText, 10);
      if (subMonths < subMonthsRequired) return false;
    }

    const subBadgeValueText = chatUser.badges.get('subscriber');
    if (!subBadgeValueText) return false;
    const subBadgeValue = Number.parseInt(subBadgeValueText, 10);

    if (subTierRequired === SubTier.Tier1) return subBadgeValue >= 0;
    if (subTierRequired === SubTier.Tier2) return subBadgeValue >= 2000;
    if (subTierRequired === SubTier.Tier3) return subBadgeValue >= 3000;

    return false;
  }

  private static validateChatVoting(data: UpdateChatVotingDto) {
    if (data.commands && data.commands.vote === data.commands.clearVotes) {
      throw new BadRequestException();
    }
  }
}
