enum HoneyError {
  VotingCreateNoPermission = 'VotingCreateNoPermission',
  // TODO:
  VotingCreateLimitReached = 'VotingCreateLimitReached',

  VotingOptionCreateDisabled = 'VotingOptionCreateDisabled',
  VotingOptionCreateLimitReached = 'VotingOptionCreateLimitReached',
  VotingOptionCreateAlreadyCreatedByUser = 'VotingOptionCreateAlreadyCreatedByUser',
  VotingOptionCreateNoPermission = 'VotingOptionCreateNoPermission',
  VotingOptionCreateAlreadyExists = 'VotingOptionCreateAlreadyExists',
  VotingOptionCreateKinopoiskMovieNotFound = 'VotingOptionCreateKinopoiskMovieNotFound',
  VotingOptionCreateIgdbGameNotFound = 'VotingOptionCreateIgdbGameNotFound',

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
