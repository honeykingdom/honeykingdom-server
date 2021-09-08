import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtStrategyUser } from '../auth/auth.interface';
import { PassportUser } from '../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_BASE } from '../honey-votes.interface';
import { ChatVotesService } from './chat-votes.service';
import { AddChatVotingDto } from './dto/addChatVotingDto';
import { UpdateChatVotingDto } from './dto/updateChatVotingDto';

@Controller(API_BASE)
export class ChatVotesController {
  constructor(private readonly chatVotesService: ChatVotesService) {}

  @Post('/chat-votes')
  async addChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: AddChatVotingDto,
  ) {
    return this.chatVotesService.addChatVoting(user.id, data);
  }

  @Put('chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  async updateChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId', ParseIntPipe) chatVotingId: number,
    @Body() data: UpdateChatVotingDto,
  ) {
    return this.chatVotesService.updateChatVoting(user.id, chatVotingId, data);
  }

  @Delete('/chat-votes/:chatVotingId')
  @UseGuards(JwtAuthGuard)
  async removeChatVoting(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId', ParseIntPipe) chatVotingId: number,
  ) {
    return this.chatVotesService.deleteChatVoting(user.id, chatVotingId);
  }

  @Post('/chat-votes/:chatVotingId/clear')
  @UseGuards(JwtAuthGuard)
  async clearChatVotes(
    @PassportUser() user: JwtStrategyUser,
    @Param('chatVotingId', ParseIntPipe) chatVotingId: number,
  ) {
    return this.chatVotesService.clearChatVotes(user.id, chatVotingId);
  }
}
