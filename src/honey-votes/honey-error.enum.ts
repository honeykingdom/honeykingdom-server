enum HoneyError {
  VotingNoPermission = 'VotingNoPermission',
  // TODO:
  VotingCreateLimitReached = 'VotingCreateLimitReached',

  VotingOptionCreateDisabled = 'VotingOptionCreateDisabled',
  VotingOptionCreateLimitReached = 'VotingOptionCreateLimitReached',
  VotingOptionCreateAlreadyCreatedByUser = 'VotingOptionCreateAlreadyCreatedByUser',
  VotingOptionCreateNoPermission = 'VotingOptionCreateNoPermission',
  VotingOptionCreateAlreadyExists = 'VotingOptionCreateAlreadyExists',
  VotingOptionCreateKinopoiskMovieNotFound = 'VotingOptionCreateKinopoiskMovieNotFound',
  VotingOptionCantIgdbGameNotFound = 'VotingOptionCantIgdbGameNotFound',

  VotingOptionDeleteDisabled = 'VotingOptionDeleteDisabled',
  VotingOptionDeleteNotOwner = 'VotingOptionDeleteNotOwner',
  VotingOptionDeleteHasVotes = 'VotingOptionDeleteHasVotes',

  VoteCreateDisabled = 'VoteCreateDisabled',
  VoteCreateTooQuickly = 'VoteCreateTooQuickly',
  VoteCreateNoPermission = 'VoteCreateNoPermission',

  VoteDeleteDisabled = 'VoteDeleteDisabled',
  VoteDeleteNotOwner = 'VoteDeleteNotOwner',
  VoteDeleteTooQuickly = 'VoteDeleteTooQuickly',
}

export default HoneyError;
