import { ChatGoal } from './entities/chat-goal.entity';

export enum ChatGoalStatus {
  Uninitialized,

  TimerIdle,
  TimerRunning,
  TimerPaused,

  VotingIdle,
  VotingRunning,
  VotingPaused,
  VotingFinished,
}

export enum ChatGoalEventType {
  Upvote = 'upvote',
  Downvote = 'downvote',
}

export type ChatGoalOptions = Pick<
  ChatGoal,
  | 'permissions'
  | 'listening'
  | 'title'
  | 'upvoteCommand'
  | 'downvoteCommand'
  | 'timerDuration'
  | 'maxVotesValue'
>;

export type ChatGoalState = Pick<
  ChatGoal,
  'status' | 'endTimerTimestamp' | 'remainingTimerDuration' | 'votesValue'
>;
