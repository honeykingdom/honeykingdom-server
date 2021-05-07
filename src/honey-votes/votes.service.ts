import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateMessage } from 'twitch-js';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';
import { UserVote } from './entities/UserVote.entity';
import { ChannelVoting } from './entities/ChannelVoting';
import { TYPEORM_SUPABASE } from 'src/app.constants';

@Injectable()
export class VotesService {
  private readonly channelVotingList: Map<string, ChannelVoting> = new Map();

  constructor(
    private readonly twitchChatService: TwitchChatService,
    @InjectRepository(ChannelVoting, TYPEORM_SUPABASE)
    private readonly channelVotingRepository: Repository<ChannelVoting>,
    @InjectRepository(UserVote, TYPEORM_SUPABASE)
    private readonly userVoteRepository: Repository<UserVote>,
  ) {
    this.init();
  }

  private async init() {
    const votingList = await this.channelVotingRepository.find();

    votingList.forEach((voting) => {
      this.channelVotingList.set(voting.channelName, voting);

      this.twitchChatService.joinChannel(voting.channelName);
    });

    this.twitchChatService.addChatListener((message) =>
      this.handleChatMessage(message),
    );
  }

  private handleChatMessage(privateMessage: PrivateMessage) {
    const {
      channel: channelRaw,
      message,
      tags: { roomId, userId, username, displayName },
    } = privateMessage;

    const channelName = channelRaw.slice(1);

    const channelVoting = this.channelVotingList.get(channelName);

    if (!channelVoting) return;

    if (message === '!clearvotes') {
      const isAdmin = channelVoting.admins.includes(username);

      if (!isAdmin) return;

      this.userVoteRepository.delete({ channelName });

      return;
    }

    if (!message.startsWith('%')) return;

    if (!VotesService.hasPermissions(privateMessage, channelVoting.permissions))
      return;

    const content = message.slice(1).trim();

    this.userVoteRepository.save({
      channelId: roomId,
      channelName,
      content,
      userId,
      userName: username,
      displayName,
    });
  }

  private static hasPermissions(
    privateMessage: PrivateMessage,
    permissions: ChannelVoting['permissions'],
  ) {
    if (permissions.viewers) return true;

    const isSubscriber = 'subscriber' in privateMessage.tags.badges;

    if (permissions.subscribers && isSubscriber) return true;

    const isVip = 'vip' in privateMessage.tags.badges;

    if (permissions.vips && isVip) return true;

    const isMod = 'moderator' in privateMessage.tags.badges;

    if (permissions.mods && isMod) return true;

    return false;
  }
}
