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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtStrategyUser } from '../../auth/auth.interface';
import { PassportUser } from '../../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { API_BASE } from '../../honey-votes.constants';
import { CreateVotingDto } from '../dto/create-voting.dto';
import { UpdateVotingDto } from '../dto/update-voting.dto';
import { validationPipe } from '../../honey-votes.validation';
import { VotingService } from './voting.service';
import { Voting } from '../entities/voting.entity';

@ApiTags('HoneyVotes - Votes')
@Controller(API_BASE)
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  @Get('/voting')
  @ApiOkResponse({ type: [Voting] })
  getVotingList(@Query('channelId') channelId: string): Promise<Voting[]> {
    return this.votingService.getVotingList(channelId);
  }

  @Get('/voting/:votingId')
  @ApiOkResponse({ description: 'OK', type: Voting })
  @ApiNotFoundResponse({ description: 'Not found' })
  getVoting(
    @Param('votingId', ParseIntPipe) votingId: number,
  ): Promise<Voting> {
    return this.votingService.getVoting(votingId);
  }

  @Post('/voting')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created', type: Voting })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  addVoting(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: CreateVotingDto,
  ): Promise<Voting> {
    return this.votingService.addVoting(user.id, data);
  }

  @Put('/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created', type: Voting })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  updateVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('votingId', ParseIntPipe) votingId: number,
    @Body() data: UpdateVotingDto,
  ): Promise<Voting> {
    return this.votingService.updateVoting(user.id, votingId, data);
  }

  @Delete('/voting/:votingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  removeVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('votingId', ParseIntPipe) votingId: number,
  ): Promise<void> {
    return this.votingService.removeVoting(user.id, votingId);
  }
}
