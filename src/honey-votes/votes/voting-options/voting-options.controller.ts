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
import { AddVotingOptionDto } from '../dto/addVotingOptionDto';
import { validationPipe } from '../../honey-votes.validation';
import { VotingOptionsService } from './voting-options.service';
import { VotingOption } from '../entities/VotingOption.entity';

@Controller(API_BASE)
export class VotingOptionsController {
  constructor(private readonly votingOptionsService: VotingOptionsService) {}

  @Post('/voting-options')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  addVotingOption(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: AddVotingOptionDto,
  ): Promise<VotingOption> {
    return this.votingOptionsService.addVotingOption(user.id, data);
  }

  @Delete('/voting-options/:votingOptionId')
  @UseGuards(JwtAuthGuard)
  removeVotingOption(
    @PassportUser() user: JwtStrategyUser,
    @Param('votingOptionId', ParseIntPipe) votingOptionId: number,
  ): Promise<void> {
    return this.votingOptionsService.removeVotingOption(
      user.id,
      votingOptionId,
    );
  }
}
