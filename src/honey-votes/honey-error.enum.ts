enum HoneyError {
  VotingCreateNoPermission = 'votingCreateNoPermission',
  // TODO:
  VotingCreateLimitReached = 'votingCreateLimitReached',

  VotingOptionCreateDisabled = 'votingOptionCreateDisabled',
  VotingOptionCreateLimitReached = 'votingOptionCreateLimitReached',
  VotingOptionCreateAlreadyCreatedByUser = 'votingOptionCreateAlreadyCreatedByUser',
  VotingOptionCreateNoPermission = 'votingOptionCreateNoPermission',
  VotingOptionCreateAlreadyExists = 'votingOptionCreateAlreadyExists',
  VotingOptionCreateKinopoiskMovieNotFound = 'votingOptionCreateKinopoiskMovieNotFound',
  VotingOptionCreateIgdbGameNotFound = 'votingOptionCreateIgdbGameNotFound',

  VotingOptionDeleteDisabled = 'votingOptionDeleteDisabled',
  VotingOptionDeleteNotOwner = 'votingOptionDeleteNotOwner',
  VotingOptionDeleteHasVotes = 'votingOptionDeleteHasVotes',

  VoteCreateDisabled = 'voteCreateDisabled',
  VoteCreateTooQuickly = 'voteCreateTooQuickly',
  VoteCreateNoPermission = 'voteCreateNoPermission',

  VoteDeleteDisabled = 'voteDeleteDisabled',
  VoteDeleteNotOwner = 'voteDeleteNotOwner',
  VoteDeleteTooQuickly = 'voteDeleteTooQuickly',
}

export default HoneyError;
