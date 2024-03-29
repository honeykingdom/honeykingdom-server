import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ChatUser } from '@twurple/chat/lib';
import { TwitchChatService } from '../../twitch-chat/twitch-chat.service';
import { ChatGoal } from './entities/chat-goal.entity';
import { ChatGoalData } from './entities/chat-goal-data.entity';
import { UsersService } from '../users/users.service';
import { CreateChatGoalDto } from './dto/create-chat-goal.dto';
import { UpdateChatGoalDto } from './dto/update-chat-goal.dto';
import {
  ChatGoalOptions,
  ChatGoalState,
  ChatGoalEventType,
  ChatGoalStatus,
} from './chat-goal.interface';
import { ChatGoalEvent } from './entities/chat-goal-event.entity';
import {
  CHAT_GOAL_OPTIONS_DEFAULT,
  CHAT_GOAL_STATE_DEFAULT,
} from './chat-goal.constants';
import { OnMessage } from '../../twitch-chat/twitch-chat.interface';

type GoalState = {
  options: ChatGoalOptions;
  state: ChatGoalState;
  votesCountByUser: ChatGoalData['votesCountByUser'];
  timeout: NodeJS.Timeout;
};

@Injectable()
export class ChatGoalService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly twitchChat: TwitchChatService,
    @InjectRepository(ChatGoal)
    private readonly goalRepo: Repository<ChatGoal>,
    /** @deprecated */
    @InjectRepository(ChatGoalEvent)
    private readonly goalEventRepo: Repository<ChatGoalEvent>,
    @InjectRepository(ChatGoalData)
    private readonly goalVotesCountRepo: Repository<ChatGoalData>,
    private readonly usersService: UsersService,
  ) {}

  private readonly goals = new Map<string, GoalState>();

  async onModuleInit(): Promise<void> {
    const goals = await this.goalRepo.find({
      relations: ['broadcaster', 'data'],
    });

    goals.forEach((goal) => {
      const {
        broadcaster,
        data,
        permissions,
        listening,
        title,
        upvoteCommand,
        downvoteCommand,
        timerDuration,
        maxVotesValue,
        status,
        endTimerTimestamp,
        remainingTimerDuration,
        votesValue,
      } = goal;

      let finalStatus = status;

      if (
        status === ChatGoalStatus.TimerRunning &&
        Date.now() >= endTimerTimestamp
      ) {
        finalStatus = ChatGoalStatus.VotingRunning;
      }

      const goalState: GoalState = {
        options: {
          permissions,
          listening,
          title,
          upvoteCommand,
          downvoteCommand,
          timerDuration,
          maxVotesValue,
        },
        state: {
          status: finalStatus,
          endTimerTimestamp,
          remainingTimerDuration,
          votesValue,
        },
        votesCountByUser: data?.votesCountByUser || {},
        timeout: null,
      };

      this.goals.set(broadcaster.id, goalState);

      if (listening) {
        this.twitchChat.join(broadcaster.login, ChatGoalService.name);
      }
    });

    this.twitchChat.on('message', (...args) => this.handleChatMessage(...args));
  }

  async onModuleDestroy() {
    const goalsToSave: DeepPartial<ChatGoal>[] = [];
    const userVotesToSave: DeepPartial<ChatGoalData>[] = [];

    this.goals.forEach((goal, goalId) => {
      goalsToSave.push({
        broadcaster: { id: goalId },
        ...goal.state,
      });

      userVotesToSave.push({
        chatGoal: { broadcaster: { id: goalId } },
        votesCountByUser: goal.votesCountByUser,
      });
    });

    return Promise.all([this.goalRepo.save(goalsToSave)]);
  }

  async createGoal(
    initiatorId: string,
    { broadcasterId, ...data }: CreateChatGoalDto,
  ): Promise<ChatGoal> {
    const canManage = await this.canManage(broadcasterId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    const hasTimer = data.timerDuration > 0;

    const status: ChatGoalStatus = hasTimer
      ? ChatGoalStatus.TimerIdle
      : ChatGoalStatus.VotingIdle;

    const goal: GoalState = {
      options: { ...CHAT_GOAL_OPTIONS_DEFAULT, ...data },
      state: { ...CHAT_GOAL_STATE_DEFAULT, status },
      votesCountByUser: {},
      timeout: null,
    };

    this.goals.set(broadcasterId, goal);

    const createdGoal = await this.goalRepo.save({
      broadcaster: { id: broadcasterId },
      ...data,
      status,
    });

    delete createdGoal.broadcaster;

    return createdGoal;
  }

  async updateGoal(
    initiatorId: string,
    goalId: string,
    data: UpdateChatGoalDto,
  ): Promise<ChatGoal> {
    const [canManage, chatGoal] = await Promise.all([
      this.canManage(goalId, initiatorId),
      this.goalRepo.findOne({
        where: { broadcasterId: goalId },
        relations: { broadcaster: true },
      }),
    ]);

    if (!canManage || !chatGoal) throw new ForbiddenException();

    const goal = this.goals.get(goalId);

    const additionalData: Partial<ChatGoalState> = {};

    if (data.listening !== undefined) {
      if (data.listening) {
        this.twitchChat.join(chatGoal.broadcaster.login, ChatGoalService.name);
      } else {
        this.twitchChat.part(chatGoal.broadcaster.login, ChatGoalService.name);
      }
    }

    if (data.timerDuration !== undefined) {
      const hasTimer = data.timerDuration > 0;

      if (
        chatGoal.status === ChatGoalStatus.VotingIdle ||
        chatGoal.status === ChatGoalStatus.TimerIdle
      ) {
        additionalData.status = hasTimer
          ? ChatGoalStatus.TimerIdle
          : ChatGoalStatus.VotingIdle;
      }
    }

    if (data.maxVotesValue !== undefined) {
      if (data.maxVotesValue <= goal.state.votesValue) {
        additionalData.status = ChatGoalStatus.VotingFinished;
      }
    }

    Object.assign(goal.state, additionalData);
    Object.assign(goal.options, data);

    const updatedGoal = await this.goalRepo.save({
      ...chatGoal,
      ...data,
      ...additionalData,
    });

    delete updatedGoal.broadcaster;

    return updatedGoal;
  }

  async deleteGoal(initiatorId: string, goalId: string): Promise<void> {
    const canManage = await this.canManage(goalId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    await this.goalRepo.delete(goalId);
  }

  async startGoal(initiatorId: string, goalId: string): Promise<void> {
    const canManage = await this.canManage(goalId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    const goal = this.goals.get(goalId);

    if (!goal) throw new BadRequestException();

    if (goal.state.status === ChatGoalStatus.TimerIdle) {
      goal.timeout = setTimeout(() => {
        this.updateGoalState(goalId, { status: ChatGoalStatus.VotingRunning });
      }, goal.options.timerDuration);

      await this.updateGoalState(goalId, {
        status: ChatGoalStatus.TimerRunning,
        endTimerTimestamp: Date.now() + goal.options.timerDuration,
      });

      return;
    }

    if (goal.state.status === ChatGoalStatus.TimerPaused) {
      goal.timeout = setTimeout(() => {
        this.updateGoalState(goalId, {
          status: ChatGoalStatus.VotingRunning,
        });
      }, goal.state.remainingTimerDuration);

      await this.updateGoalState(goalId, {
        status: ChatGoalStatus.TimerRunning,
        endTimerTimestamp: Date.now() + goal.state.remainingTimerDuration,
      });

      return;
    }

    if (goal.state.status === ChatGoalStatus.VotingIdle) {
      await this.updateGoalState(goalId, {
        status: ChatGoalStatus.VotingRunning,
      });

      return;
    }

    if (goal.state.status === ChatGoalStatus.VotingPaused) {
      goal.state.status = ChatGoalStatus.VotingRunning;

      await this.goalRepo.update(goalId, {
        status: ChatGoalStatus.VotingRunning,
      });

      return;
    }

    throw new BadRequestException();
  }

  async pauseGoal(initiatorId: string, goalId: string): Promise<void> {
    const canManage = await this.canManage(goalId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    const goal = this.goals.get(goalId);

    if (!goal) throw new BadRequestException();

    if (goal.state.status === ChatGoalStatus.TimerRunning) {
      clearTimeout(goal.timeout);

      await this.updateGoalState(goalId, {
        status: ChatGoalStatus.TimerPaused,
        remainingTimerDuration: goal.state.endTimerTimestamp - Date.now(),
      });

      return;
    }

    if (goal.state.status === ChatGoalStatus.VotingRunning) {
      await this.updateGoalState(goalId, {
        status: ChatGoalStatus.VotingPaused,
      });

      return;
    }

    throw new BadRequestException();
  }

  async resetGoal(initiatorId: string, goalId: string) {
    const canManage = await this.canManage(goalId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    const goal = this.goals.get(goalId);

    if (!goal) throw new BadRequestException();

    clearTimeout(goal.timeout);

    const hasTimer = goal.options.timerDuration > 0;

    const status = hasTimer
      ? ChatGoalStatus.TimerIdle
      : ChatGoalStatus.VotingIdle;

    await this.updateGoalState(goalId, {
      status,
      endTimerTimestamp: 0,
      remainingTimerDuration: 0,
      votesValue: 0,
    });
  }

  async resetVotes(initiatorId: string, goalId: string) {
    const canManage = await this.canManage(goalId, initiatorId);

    if (!canManage) throw new ForbiddenException();

    const goal = this.goals.get(goalId);

    if (!goal) throw new BadRequestException();

    goal.votesCountByUser = {};

    await this.goalVotesCountRepo.save({
      chatGoalId: goalId,
      byUser: {},
    });
  }

  private async updateGoalState(
    goalId: string,
    stateChanges: Partial<GoalState['state']> = null,
    optionsChanges: Partial<GoalState['options']> = null,
  ) {
    const goal = this.goals.get(goalId);

    if (stateChanges) Object.assign(goal.state, stateChanges);
    if (optionsChanges) Object.assign(goal.options, optionsChanges);

    await this.goalRepo.update(goalId, { ...stateChanges, ...optionsChanges });
  }

  private handleChatMessage: OnMessage = (channel, username, message, msg) => {
    const { displayName, userId } = msg.userInfo;
    const { channelId } = msg;

    const goal = this.goals.get(channelId);

    if (!goal || goal.state.status !== ChatGoalStatus.VotingRunning) return;

    let type: ChatGoalEventType | null = null;

    if (message === goal.options.upvoteCommand) type = ChatGoalEventType.Upvote;
    if (message === goal.options.downvoteCommand)
      type = ChatGoalEventType.Downvote;

    if (!type) return;

    if (!ChatGoalService.canVote(goal, msg.userInfo, type)) return;

    goal.votesCountByUser[userId] = (goal.votesCountByUser[userId] || 0) + 1;

    let votesValue = goal.state.votesValue;

    if (type === ChatGoalEventType.Upvote) votesValue += 1;
    if (type === ChatGoalEventType.Downvote) votesValue -= 1;

    const isVotingFinished = votesValue >= goal.options.maxVotesValue;

    const changes: Partial<GoalState['state']> = { votesValue };

    if (isVotingFinished) {
      changes.status = ChatGoalStatus.VotingFinished;
    }

    Promise.all([
      this.updateGoalState(channelId, changes),
      this.sendVoteEvent(channelId, {
        type,
        userId,
        userLogin: username,
        userDisplayName: displayName,
        votesCount: goal.votesCountByUser[userId],
      }),
    ]);
  };

  private async canManage(
    broadcasterId: string,
    initiatorId: string,
  ): Promise<boolean> {
    if (broadcasterId === initiatorId) return true;

    const relations = { credentials: true };
    const [broadcaster, initiator] = await Promise.all([
      this.usersService.findOne({ where: { id: broadcasterId }, relations }),
      this.usersService.findOne({ where: { id: initiatorId }, relations }),
    ]);

    if (!broadcaster || !initiator) return false;

    return this.usersService.isHasPermissions(broadcaster, initiator, {
      editor: true,
    });
  }

  private static canVote(
    {
      options: {
        permissions: { mod, vip, subTier1, subTier2, subTier3, viewer },
      },
      votesCountByUser,
    }: GoalState,
    chatUser: ChatUser,
    type: ChatGoalEventType,
  ): boolean {
    const subscriberBadgeText = chatUser.badges.get('subscriber');
    const subscriberBadge = Number.parseInt(subscriberBadgeText, 10);

    const isSubTier1 = subscriberBadge >= 0 && subscriberBadge < 1000;
    const isSubTier2 = subscriberBadge >= 2000 && subscriberBadge < 3000;
    const isSubTier3 = subscriberBadge >= 3000;
    const isVip = chatUser.isVip;
    const isMod = chatUser.isMod;

    if (
      type === ChatGoalEventType.Upvote &&
      !viewer.canUpvote &&
      !(subTier1.canUpvote && isSubTier1) &&
      !(subTier2.canUpvote && isSubTier2) &&
      !(subTier3.canUpvote && isSubTier3) &&
      !(vip.canUpvote && isVip) &&
      !(mod.canUpvote && isMod)
    ) {
      return false;
    }

    if (
      type === ChatGoalEventType.Downvote &&
      !viewer.canDownvote &&
      !(subTier1.canDownvote && isSubTier1) &&
      !(subTier2.canDownvote && isSubTier2) &&
      !(subTier3.canDownvote && isSubTier3) &&
      !(vip.canDownvote && isVip) &&
      !(mod.canDownvote && isMod)
    ) {
      return false;
    }

    const viewerCanVote = viewer.canUpvote || viewer.canDownvote;
    const subTier1canVote = subTier1.canUpvote || subTier1.canDownvote;
    const subTier2canVote = subTier2.canUpvote || subTier2.canDownvote;
    const subTier3canVote = subTier3.canUpvote || subTier3.canDownvote;
    const vipCanVote = vip.canUpvote || vip.canDownvote;
    const modCanVote = mod.canUpvote || mod.canDownvote;

    const maxVotesCount = Math.max(
      viewerCanVote ? viewer.votesAmount : 0,
      subTier1canVote && isSubTier1 ? subTier1.votesAmount : 0,
      subTier2canVote && isSubTier2 ? subTier2.votesAmount : 0,
      subTier3canVote && isSubTier3 ? subTier3.votesAmount : 0,
      vipCanVote && isVip ? vip.votesAmount : 0,
      modCanVote && isMod ? mod.votesAmount : 0,
    );

    const currentVotesCount = votesCountByUser[chatUser.userId] || 0;

    return currentVotesCount < maxVotesCount;
  }

  private sendVoteEvent(chatGoalId: string, action: Partial<ChatGoalEvent>) {
    return this.goalEventRepo.save({
      chatGoalId,
      ...action,
    } as ChatGoalEvent);
  }
}
