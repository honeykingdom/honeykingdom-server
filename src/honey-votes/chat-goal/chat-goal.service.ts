import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TwitchChatService } from '../../twitch-chat/twitch-chat.service';
import { InjectChat } from '../../twitch-chat/twitch-chat.decorators';
import {
  POSTGRES_CONNECTION,
  TWITCH_CHAT_ANONYMOUS,
} from '../../app.constants';
import { ChatGoal } from './entities/chat-goal.entity';
import { ChatGoalData } from './entities/chat-goal-data.entity';
import { UsersService } from '../users/users.service';
import { CreateChatGoalDto } from './dto/create-chat-goal.dto';
import { UpdateChatGoalDto } from './dto/update-chat-goal.dto';
import {
  ChatGoalOptions,
  ChatGoalState,
  ChatEventType,
  ChatGoalStatus,
} from './chat-goal.interface';
import { PrivateMessage } from 'twitch-js';
import { ChatGoalEvent } from './entities/chat-goal-event.entity';
import { ChatVoteEvent } from './classes/chat-vote-event';
import {
  CHAT_GOAL_OPTIONS_DEFAULT,
  CHAT_GOAL_STATE_DEFAULT,
} from './chat-goal.constants';

type GoalState = {
  options: ChatGoalOptions;
  state: ChatGoalState;
  votesCountByUser: ChatGoalData['votesCountByUser'];
  timeout: NodeJS.Timeout;
};

@Injectable()
export class ChatGoalService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectChat(TWITCH_CHAT_ANONYMOUS)
    private readonly twitchChatService: TwitchChatService,
    @InjectRepository(ChatGoal, POSTGRES_CONNECTION)
    private readonly goalRepo: Repository<ChatGoal>,
    @InjectRepository(ChatGoalEvent, POSTGRES_CONNECTION)
    private readonly goalEventRepo: Repository<ChatGoalEvent>,
    @InjectRepository(ChatGoalData, POSTGRES_CONNECTION)
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
        this.twitchChatService.joinChannel(
          broadcaster.login,
          ChatGoalService.name,
        );
      }
    });

    this.twitchChatService.addChatListener((message) =>
      this.handleChatMessage(message),
    );
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
      this.goalRepo.findOne(goalId),
    ]);

    if (!canManage || !chatGoal) throw new ForbiddenException();

    const additionalData: DeepPartial<ChatGoal> = {};

    // TODO:
    if (!data.listening) {
      // this.twitchChatService.partChannel()
    }

    if (data.timerDuration !== undefined) {
      const hasTimer = data.timerDuration > 0;

      if (hasTimer && chatGoal.status === ChatGoalStatus.VotingIdle) {
        additionalData.status = ChatGoalStatus.TimerIdle;
      }

      if (!hasTimer && chatGoal.status === ChatGoalStatus.TimerIdle) {
        additionalData.status = ChatGoalStatus.VotingIdle;
      }
    }

    // TODO: if maxVotesCount was changed check if it needs to set status to completed

    const goal = this.goals.get(goalId);

    Object.assign(goal, { options: data });

    const updatedGoal = await this.goalRepo.save({
      ...chatGoal,
      ...data,
      ...additionalData,
    });

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
      chatGoal: { broadcaster: { id: goalId } },
      byUser: {},
    });
  }

  private async updateGoalState(
    goalId: string,
    stateChanges: Partial<GoalState['state']> = null,
    optionsChanges: Partial<GoalState['options']> = null,
  ) {
    const goal = this.goals.get(goalId);

    Object.assign(goal, { state: stateChanges, options: optionsChanges });

    await this.goalRepo.update(goalId, { ...stateChanges, ...optionsChanges });
  }

  private handleChatMessage(privateMessage: PrivateMessage) {
    const {
      message,
      username,
      tags: { displayName, roomId, userId },
    } = privateMessage;

    const goal = this.goals.get(roomId);

    if (!goal || goal.state.status !== ChatGoalStatus.VotingRunning) return;

    let type: ChatEventType | null = null;

    if (message !== goal.options.upvoteCommand) type = ChatEventType.Upvote;
    if (message !== goal.options.downvoteCommand) type = ChatEventType.Downvote;

    if (!type) return;

    if (!ChatGoalService.canVote(goal, privateMessage)) return;

    goal.votesCountByUser[userId] = (goal.votesCountByUser[userId] || 0) + 1;

    let votesValue = goal.state.votesValue;

    if (type === ChatEventType.Upvote) votesValue += 1;
    if (type === ChatEventType.Downvote) votesValue -= 1;

    const isVotingFinished = votesValue >= goal.options.maxVotesValue;

    let changes: Partial<GoalState['state']> = { votesValue };

    if (isVotingFinished) {
      changes.status = ChatGoalStatus.VotingFinished;
    }

    Promise.all([
      this.updateGoalState(roomId, changes),
      this.sendVoteEvent(roomId, {
        type,
        payload: {
          userId,
          userLogin: username,
          userDisplayName: displayName,
        },
      }),
    ]);
  }

  private async canManage(
    broadcasterId: string,
    initiatorId: string,
  ): Promise<boolean> {
    if (broadcasterId === initiatorId) return true;

    const options = { relations: ['credentials'] };
    const [broadcaster, initiator] = await Promise.all([
      this.usersService.findOne(broadcasterId, options),
      this.usersService.findOne(initiatorId, options),
    ]);

    if (!broadcaster || !initiator) return false;

    return this.usersService.isEditor(broadcaster, initiator);
  }

  private static canVote(
    {
      options: {
        permissions: { mod, vip, subTier1, subTier2, subTier3, viewer },
      },
      votesCountByUser,
    }: GoalState,
    { tags }: PrivateMessage,
  ): boolean {
    const subscriberBadge = tags.badges.subscriber as number;

    const isSubTier1 = subscriberBadge >= 0 && subscriberBadge < 1000;
    const isSubTier2 = subscriberBadge >= 2000 && subscriberBadge < 3000;
    const isSubTier3 = subscriberBadge >= 3000;
    const isVip = 'vip' in tags.badges;
    const isMod = 'moderator' in tags.badges;

    const maxVotesCount = Math.max(
      viewer.canVote ? viewer.votesAmount : 0,
      subTier1.canVote && isSubTier1 ? subTier1.votesAmount : 0,
      subTier2.canVote && isSubTier2 ? subTier2.votesAmount : 0,
      subTier3.canVote && isSubTier3 ? subTier3.votesAmount : 0,
      vip.canVote && isVip ? vip.votesAmount : 0,
      mod.canVote && isMod ? mod.votesAmount : 0,
    );

    const currentVotesCount = votesCountByUser[tags.userId] || 0;

    return currentVotesCount < maxVotesCount;
  }

  private sendVoteEvent(goalId: string, action: ChatVoteEvent) {
    return this.goalEventRepo.save({
      chatGoal: { broadcasterId: goalId },
      action,
    });
  }
}
