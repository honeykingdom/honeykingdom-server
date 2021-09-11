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
import { JwtStrategyUser } from '../auth/auth.interface';
import { PassportUser } from '../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_BASE } from '../honey-votes.interface';
import { validationPipe } from '../honey-votes.validation';
import { ChatVotesService } from './chat-votes.service';
import { AddChatVotingDto } from './dto/addChatVotingDto';
import { UpdateChatVotingDto } from './dto/updateChatVotingDto';
import { ChatVoting } from './entities/ChatVoting.entity';

@Controller(API_BASE)
export class ChatVotesController {
  constructor(private readonly chatVotesService: ChatVotesService) {}

  @Post('/chat-votes')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  async addChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: AddChatVotingDto,
  ): Promise<ChatVoting> {
    return this.chatVotesService.addChatVoting(user.id, data);
  }

  @Put('/chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  async updateChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
    @Body() data: UpdateChatVotingDto,
  ): Promise<ChatVoting> {
    return this.chatVotesService.updateChatVoting(user.id, chatVotingId, data);
  }

  @Delete('/chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  async removeChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
  ): Promise<void> {
    return this.chatVotesService.deleteChatVoting(user.id, chatVotingId);
  }

  @Post('/chat-votes/:chatVotingId/clear')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async clearChatVotes(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId') chatVotingId: string,
  ): Promise<void> {
    return this.chatVotesService.clearChatVotes(user.id, chatVotingId);
  }
}
