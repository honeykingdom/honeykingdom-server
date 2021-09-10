import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtStrategyUser } from '../../auth/auth.interface';
import { PassportUser } from '../../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { API_BASE } from '../../honey-votes.interface';
import { AddVoteDto } from '../dto/addVoteDto';
import { VotesService } from './votes.service';
import { validationPipe } from '../../honey-votes.validation';

@Controller(API_BASE)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post('/votes')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  addVote(
    @PassportUser() user: JwtStrategyUser,
    @Body() addVoteDto: AddVoteDto,
  ) {
    return this.votesService.addVote(user.id, addVoteDto);
  }

  @Delete('/votes/:voteId')
  @UseGuards(JwtAuthGuard)
  removeVote(
    @PassportUser() user: JwtStrategyUser,
    @Param('voteId', ParseIntPipe) voteId: number,
  ) {
    return this.votesService.removeVote(user.id, voteId);
  }
}
