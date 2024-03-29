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
import { API_BASE } from '../../honey-votes.constants';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { DeleteVoteDto } from '../dto/delete-vote.dto';
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
    @Body() data: CreateVoteDto,
  ): Promise<void> {
    return this.votesService.createVote(user.id, data);
  }

  @Delete('/votes')
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  removeVote(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: DeleteVoteDto,
  ): Promise<void> {
    return this.votesService.deleteVote(user.id, data);
  }
}
