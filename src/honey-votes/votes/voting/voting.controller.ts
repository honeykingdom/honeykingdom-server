import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtStrategyUser } from '../../auth/auth.interface';
import { PassportUser } from '../../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { API_BASE } from '../../honey-votes.interface';
import { AddVotingDto } from '../dto/addVotingDto';
import { UpdateVotingDto } from '../dto/updateVotingDto';
import { validationPipe } from '../votes.validation';
import { VotingService } from './voting.service';

@Controller(API_BASE)
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  @Get('/voting')
  getVotingList(@Query('channelId') channelId: string) {
    return this.votingService.getVotingList(channelId);
  }

  @Get('/voting/:votingId')
  getVoting(@Param('votingId', ParseIntPipe) votingId: number) {
    return this.votingService.getVoting(votingId);
  }

  @Post('/voting')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  addVoting(@PassportUser() user: JwtStrategyUser, @Body() data: AddVotingDto) {
    return this.votingService.addVoting(user.id, data);
  }

  @Put('/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  updateVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Body() data: UpdateVotingDto,
  ) {
    return this.votingService.updateVoting(user.id, votingId, data);
  }

  @Delete('/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  removeVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('votingId', ParseIntPipe) votingId: number,
  ) {
    return this.votingService.removeVoting(user.id, votingId);
  }
}
