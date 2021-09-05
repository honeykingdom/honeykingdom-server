import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtStrategyUser } from '../auth/auth.interface';
import { PassportUser } from '../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_BASE } from '../honey-votes.interface';
import { AddVotingDto } from './dto/addVotingDto';
import { AddVotingOptionDto } from './dto/addVotingOptionDto';
import { UpdateVotingDto } from './dto/updateVotingDto';
import { VotesService } from './votes.service';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller(API_BASE)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get('/channel-id/:channelName')
  getChannelIdByName(@Param('channelName') channelName: string) {
    return this.votesService.getChannelIdByName(channelName);
  }

  @Get('/:channelId/voting')
  getVotingList(@Param('channelId') channelId: string) {
    return this.votesService.getVotingList(channelId);
  }

  // Voting

  @Get('/:channelId/voting/:votingId')
  getVoting(
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
  ) {
    return this.votesService.getVoting(null, channelId, votingId);
  }

  @Post('/:channelId/voting')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  addVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Body() data: AddVotingDto,
  ) {
    return this.votesService.addVoting(user.id, channelId, data);
  }

  @Put('/:channelId/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  updateVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Body() data: UpdateVotingDto,
  ) {
    return this.votesService.updateVoting(user.id, channelId, votingId, data);
  }

  @Delete('/:channelId/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  removeVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
  ) {
    return this.votesService.removeVoting(user.id, channelId, votingId);
  }

  // Voting option

  @Post('/:channelId/voting/:votingId/option')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  addVotingOption(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Body() data: AddVotingOptionDto,
  ) {
    return this.votesService.addVotingOption(
      user.id,
      channelId,
      votingId,
      data,
    );
  }

  @Delete('/:channelId/voting/:votingId/option/:votingOptionId')
  @UseGuards(JwtAuthGuard)
  removeVotingOption(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Param('votingOptionId', ParseIntPipe) votingOptionId: number,
  ) {
    return this.votesService.removeVotingOption(
      user.id,
      channelId,
      votingId,
      votingOptionId,
    );
  }

  // Vote

  @Post('/:channelId/voting/:votingId/option/:votingOptionId/vote')
  @UseGuards(JwtAuthGuard)
  addVote(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Param('votingOptionId', ParseIntPipe) votingOptionId: number,
  ) {
    return this.votesService.addVote(
      user.id,
      channelId,
      votingId,
      votingOptionId,
    );
  }

  @Delete('/:channelId/voting/:votingId/option/:votingOptionId/vote/:voteId')
  @UseGuards(JwtAuthGuard)
  removeVote(
    @PassportUser() user: JwtStrategyUser,
    @Param('channelId') channelId: string,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Param('votingOptionId', ParseIntPipe) votingOptionId: number,
    @Param('voteId', ParseIntPipe) voteId: number,
  ) {
    return this.votesService.removeVote(
      user.id,
      channelId,
      votingId,
      votingOptionId,
      voteId,
    );
  }
}
