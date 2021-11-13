import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { JwtStrategyUser } from '../auth/auth.interface';
import { PassportUser } from '../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_BASE } from '../honey-votes.interface';
import { validationPipe } from '../honey-votes.validation';
import { ChatVotesService } from './chat-votes.service';
import { CreateChatVotingDto } from './dto/create-chat-voting.dto';
import { UpdateChatVotingDto } from './dto/update-chat-voting.dto';
import { ChatVoting } from './entities/chat-voting.entity';

@ApiTags('HoneyVotes - Chat Votes')
@ApiBearerAuth()
@Controller(API_BASE)
export class ChatVotesController {
  constructor(private readonly chatVotesService: ChatVotesService) {}

  @Post('/chat-votes')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiCreatedResponse({ description: 'Created', type: ChatVoting })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async addChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: CreateChatVotingDto,
  ): Promise<ChatVoting> {
    return this.chatVotesService.addChatVoting(user.id, data);
  }

  @Put('/chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiCreatedResponse({ description: 'Created', type: ChatVoting })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async updateChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
    @Body() data: UpdateChatVotingDto,
  ): Promise<ChatVoting> {
    return this.chatVotesService.updateChatVoting(user.id, chatVotingId, data);
  }

  @Delete('/chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async removeChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
  ): Promise<void> {
    return this.chatVotesService.deleteChatVoting(user.id, chatVotingId);
  }

  @Post('/chat-votes/:chatVotingId/clear')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async clearChatVotes(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
  ): Promise<void> {
    return this.chatVotesService.clearChatVotes(user.id, chatVotingId);
  }
}
