import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1639137908988 implements MigrationInterface {
    name = 'Init1639137908988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hv_user_credentials" ("scope" character varying array NOT NULL, "encryptedAccessToken" character varying NOT NULL, "encryptedRefreshToken" character varying NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "REL_39f9a3be4447560f37287c3aed" UNIQUE ("userId"), CONSTRAINT "PK_39f9a3be4447560f37287c3aed1" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "hv_chat_vote" ("chatVotingId" character varying NOT NULL, "userId" character varying NOT NULL, "userName" character varying NOT NULL, "tags" jsonb NOT NULL DEFAULT '{}', "content" character varying(500) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_129f2a54649ef6646e5dfbda686" PRIMARY KEY ("chatVotingId", "userId"))`);
        await queryRunner.query(`CREATE TABLE "hv_chat_voting" ("broadcasterId" character varying NOT NULL, "permissions" jsonb NOT NULL DEFAULT '{"viewer":false,"sub":true,"mod":true,"vip":true,"subMonthsRequired":0,"subTierRequired":1}', "listening" boolean NOT NULL DEFAULT false, "commands" jsonb NOT NULL DEFAULT '{"vote":"%","clearVotes":"!clearvotes"}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_c2d67a6fa1663c66e3bc48346b" UNIQUE ("broadcasterId"), CONSTRAINT "PK_c2d67a6fa1663c66e3bc48346b0" PRIMARY KEY ("broadcasterId"))`);
        await queryRunner.query(`CREATE TYPE "public"."hv_voting_option_type_enum" AS ENUM('kinopoiskMovie', 'igdbGame', 'custom')`);
        await queryRunner.query(`CREATE TABLE "hv_voting_option" ("id" SERIAL NOT NULL, "authorData" jsonb NOT NULL DEFAULT '{}', "type" "public"."hv_voting_option_type_enum" NOT NULL, "cardId" character varying, "cardTitle" character varying(50) NOT NULL, "cardSubtitle" character varying(255), "cardDescription" character varying(255), "cardImageUrl" character varying, "cardImageId" character varying, "cardUrl" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "authorId" character varying, "votingId" integer, CONSTRAINT "PK_f7f6289481dd33993f99f5ed96e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hv_vote" ("authorId" character varying NOT NULL, "votingId" integer NOT NULL, "value" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "votingOptionId" integer, CONSTRAINT "PK_b6e8c2e3bd8cd324c850f20aee5" PRIMARY KEY ("authorId", "votingId"))`);
        await queryRunner.query(`CREATE TYPE "public"."hv_voting_allowedvotingoptiontypes_enum" AS ENUM('kinopoiskMovie', 'igdbGame', 'custom')`);
        await queryRunner.query(`CREATE TABLE "hv_voting" ("id" SERIAL NOT NULL, "title" character varying(50), "description" character varying(255), "canManageVotes" boolean NOT NULL DEFAULT true, "canManageVotingOptions" boolean NOT NULL DEFAULT true, "permissions" jsonb NOT NULL DEFAULT '{"mod":{"canVote":true,"canAddOptions":true},"vip":{"canVote":true,"canAddOptions":true},"sub":{"canVote":true,"canAddOptions":true,"subTierRequiredToVote":1,"subTierRequiredToAddOptions":1},"follower":{"canVote":false,"canAddOptions":false,"minutesToFollowRequiredToVote":0,"minutesToFollowRequiredToAddOptions":0},"viewer":{"canVote":false,"canAddOptions":false}}', "showValues" boolean NOT NULL DEFAULT true, "allowedVotingOptionTypes" "public"."hv_voting_allowedvotingoptiontypes_enum" array NOT NULL DEFAULT '{kinopoiskMovie,igdbGame,custom}', "votingOptionsLimit" integer NOT NULL DEFAULT '100', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "broadcasterId" character varying, CONSTRAINT "PK_68958626a1ab2c2ceb08d3c6054" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hv_user" ("id" character varying NOT NULL, "login" character varying NOT NULL, "displayName" character varying NOT NULL DEFAULT '', "avatarUrl" character varying NOT NULL, "broadcasterType" character varying NOT NULL DEFAULT '', "areTokensValid" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bfcd8663f0c1a4a375043588784" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."hv_chat_goal_event_type_enum" AS ENUM('upvote', 'downvote')`);
        await queryRunner.query(`CREATE TABLE "hv_chat_goal_event" ("chatGoalId" character varying NOT NULL, "version" integer NOT NULL DEFAULT '0', "type" "public"."hv_chat_goal_event_type_enum" NOT NULL, "userId" character varying NOT NULL DEFAULT '', "userLogin" character varying NOT NULL DEFAULT '', "userDisplayName" character varying NOT NULL DEFAULT '', "votesCount" integer NOT NULL DEFAULT '1', CONSTRAINT "REL_4f7203556905f5122d1077c137" UNIQUE ("chatGoalId"), CONSTRAINT "PK_4f7203556905f5122d1077c1379" PRIMARY KEY ("chatGoalId"))`);
        await queryRunner.query(`CREATE TABLE "hv_chat_goal" ("broadcasterId" character varying NOT NULL, "permissions" jsonb NOT NULL DEFAULT '{"mod":{"canUpvote":true,"canDownvote":true,"votesAmount":5},"vip":{"canUpvote":true,"canDownvote":true,"votesAmount":5},"subTier1":{"canUpvote":true,"canDownvote":true,"votesAmount":5},"subTier2":{"canUpvote":true,"canDownvote":true,"votesAmount":10},"subTier3":{"canUpvote":true,"canDownvote":true,"votesAmount":15},"viewer":{"canUpvote":true,"canDownvote":false,"votesAmount":1}}', "listening" boolean NOT NULL DEFAULT false, "title" character varying(50) NOT NULL DEFAULT '', "upvoteCommand" character varying(500) NOT NULL DEFAULT 'VoteYea', "downvoteCommand" character varying(500) NOT NULL DEFAULT 'VoteNay', "timerDuration" integer NOT NULL DEFAULT '0', "maxVotesValue" integer NOT NULL DEFAULT '100', "status" integer NOT NULL DEFAULT '0', "endTimerTimestamp" bigint NOT NULL DEFAULT '0', "remainingTimerDuration" integer NOT NULL DEFAULT '0', "votesValue" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_e000cc8dc2255d534939cc5c31" UNIQUE ("broadcasterId"), CONSTRAINT "PK_e000cc8dc2255d534939cc5c31c" PRIMARY KEY ("broadcasterId"))`);
        await queryRunner.query(`CREATE TABLE "hv_chat_goal_data" ("chatGoalId" character varying NOT NULL, "votesCountByUser" jsonb NOT NULL DEFAULT '{}', "chatGoalBroadcasterId" character varying, CONSTRAINT "REL_ab2049436773383b14df7199d2" UNIQUE ("chatGoalBroadcasterId"), CONSTRAINT "PK_6b3c76789b036eac930d753bc38" PRIMARY KEY ("chatGoalId"))`);
        await queryRunner.query(`CREATE TABLE "ta_telegram_channels" ("channelName" character varying NOT NULL, "lastPostId" integer NOT NULL, CONSTRAINT "PK_2b3c9aa90df362f10ca47b3eea0" PRIMARY KEY ("channelName"))`);
        await queryRunner.query(`ALTER TABLE "hv_user_credentials" ADD CONSTRAINT "FK_39f9a3be4447560f37287c3aed1" FOREIGN KEY ("userId") REFERENCES "hv_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_chat_vote" ADD CONSTRAINT "FK_04144827d74d680622db4d0f4a4" FOREIGN KEY ("chatVotingId") REFERENCES "hv_chat_voting"("broadcasterId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_chat_voting" ADD CONSTRAINT "FK_c2d67a6fa1663c66e3bc48346b0" FOREIGN KEY ("broadcasterId") REFERENCES "hv_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_voting_option" ADD CONSTRAINT "FK_ae3758a798c356a162eb40ca938" FOREIGN KEY ("authorId") REFERENCES "hv_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_voting_option" ADD CONSTRAINT "FK_c0905f5471f10d37f2a28b7a474" FOREIGN KEY ("votingId") REFERENCES "hv_voting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_vote" ADD CONSTRAINT "FK_b22342bcec269b45f4a8d24212e" FOREIGN KEY ("authorId") REFERENCES "hv_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_vote" ADD CONSTRAINT "FK_60537ffc45510f5874a1c260c68" FOREIGN KEY ("votingId") REFERENCES "hv_voting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_vote" ADD CONSTRAINT "FK_17f527998aca5956fd96b0ead5e" FOREIGN KEY ("votingOptionId") REFERENCES "hv_voting_option"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_voting" ADD CONSTRAINT "FK_c5d83102fae660d1ce623063c1f" FOREIGN KEY ("broadcasterId") REFERENCES "hv_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_chat_goal_event" ADD CONSTRAINT "FK_4f7203556905f5122d1077c1379" FOREIGN KEY ("chatGoalId") REFERENCES "hv_chat_goal"("broadcasterId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_chat_goal" ADD CONSTRAINT "FK_e000cc8dc2255d534939cc5c31c" FOREIGN KEY ("broadcasterId") REFERENCES "hv_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hv_chat_goal_data" ADD CONSTRAINT "FK_ab2049436773383b14df7199d2c" FOREIGN KEY ("chatGoalBroadcasterId") REFERENCES "hv_chat_goal"("broadcasterId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hv_chat_goal_data" DROP CONSTRAINT "FK_ab2049436773383b14df7199d2c"`);
        await queryRunner.query(`ALTER TABLE "hv_chat_goal" DROP CONSTRAINT "FK_e000cc8dc2255d534939cc5c31c"`);
        await queryRunner.query(`ALTER TABLE "hv_chat_goal_event" DROP CONSTRAINT "FK_4f7203556905f5122d1077c1379"`);
        await queryRunner.query(`ALTER TABLE "hv_voting" DROP CONSTRAINT "FK_c5d83102fae660d1ce623063c1f"`);
        await queryRunner.query(`ALTER TABLE "hv_vote" DROP CONSTRAINT "FK_17f527998aca5956fd96b0ead5e"`);
        await queryRunner.query(`ALTER TABLE "hv_vote" DROP CONSTRAINT "FK_60537ffc45510f5874a1c260c68"`);
        await queryRunner.query(`ALTER TABLE "hv_vote" DROP CONSTRAINT "FK_b22342bcec269b45f4a8d24212e"`);
        await queryRunner.query(`ALTER TABLE "hv_voting_option" DROP CONSTRAINT "FK_c0905f5471f10d37f2a28b7a474"`);
        await queryRunner.query(`ALTER TABLE "hv_voting_option" DROP CONSTRAINT "FK_ae3758a798c356a162eb40ca938"`);
        await queryRunner.query(`ALTER TABLE "hv_chat_voting" DROP CONSTRAINT "FK_c2d67a6fa1663c66e3bc48346b0"`);
        await queryRunner.query(`ALTER TABLE "hv_chat_vote" DROP CONSTRAINT "FK_04144827d74d680622db4d0f4a4"`);
        await queryRunner.query(`ALTER TABLE "hv_user_credentials" DROP CONSTRAINT "FK_39f9a3be4447560f37287c3aed1"`);
        await queryRunner.query(`DROP TABLE "ta_telegram_channels"`);
        await queryRunner.query(`DROP TABLE "hv_chat_goal_data"`);
        await queryRunner.query(`DROP TABLE "hv_chat_goal"`);
        await queryRunner.query(`DROP TABLE "hv_chat_goal_event"`);
        await queryRunner.query(`DROP TYPE "public"."hv_chat_goal_event_type_enum"`);
        await queryRunner.query(`DROP TABLE "hv_user"`);
        await queryRunner.query(`DROP TABLE "hv_voting"`);
        await queryRunner.query(`DROP TYPE "public"."hv_voting_allowedvotingoptiontypes_enum"`);
        await queryRunner.query(`DROP TABLE "hv_vote"`);
        await queryRunner.query(`DROP TABLE "hv_voting_option"`);
        await queryRunner.query(`DROP TYPE "public"."hv_voting_option_type_enum"`);
        await queryRunner.query(`DROP TABLE "hv_chat_voting"`);
        await queryRunner.query(`DROP TABLE "hv_chat_vote"`);
        await queryRunner.query(`DROP TABLE "hv_user_credentials"`);
    }

}
