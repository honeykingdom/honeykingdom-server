import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtStrategyUser } from '../../auth/auth.interface';
import { PassportUser } from '../../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { API_BASE } from '../../honey-votes.interface';
import { AddVoteDto } from '../dto/addVoteDto';
import { RemoveVoteDto } from '../dto/deleteVoteDto';
import { VotesService } from './votes.service';
import { validationPipe } from '../../honey-votes.validation';

@ApiTags('HoneyVotes - Votes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(API_BASE)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post('/votes')
  @UsePipes(validationPipe)
  @ApiCreatedResponse({ description: 'Created' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  addVote(
    @PassportUser() user: JwtStrategyUser,
    @Body() addVoteDto: AddVoteDto,
  ): Promise<void> {
    return this.votesService.addVote(user.id, addVoteDto);
  }

  @Delete('/votes')
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  removeVote(
    @PassportUser() user: JwtStrategyUser,
    @Body() removeVoteDto: RemoveVoteDto,
  ): Promise<void> {
    return this.votesService.removeVote(user.id, removeVoteDto);
  }
}
