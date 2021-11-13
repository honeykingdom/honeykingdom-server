import {
  Body,
  Controller,
  Delete,
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
import { API_BASE } from '../honey-votes.constants';
import { validationPipe } from '../honey-votes.validation';
import { ChatGoalService } from './chat-goal.service';
import { CreateChatGoalDto } from './dto/create-chat-goal.dto';
import { UpdateChatGoalDto } from './dto/update-chat-goal.dto';
import { ChatGoal } from './entities/chat-goal.entity';

@ApiTags('HoneyVotes - Chat Goal')
@ApiBearerAuth()
@Controller(API_BASE)
export class ChatGoalController {
  constructor(private readonly chatGoalService: ChatGoalService) {}

  @Post('/chat-goal')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiCreatedResponse({ description: 'Created', type: ChatGoal })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  createGoal(
    @PassportUser() user: JwtStrategyUser,
    @Body() data: CreateChatGoalDto,
  ): Promise<ChatGoal> {
    return this.chatGoalService.createGoal(user.id, data);
  }

  @Put('/chat-goal/:goalId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(validationPipe)
  @ApiCreatedResponse({ description: 'Created' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  updateGoal(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
    @Body() data: UpdateChatGoalDto,
  ): Promise<ChatGoal> {
    return this.chatGoalService.updateGoal(user.id, goalId, data);
  }

  @Delete('/chat-goal/:goalId')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  deleteGoal(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    return this.chatGoalService.deleteGoal(user.id, goalId);
  }

  @Post('/chat-goal/:goalId/start')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  startGoal(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    return this.chatGoalService.startGoal(user.id, goalId);
  }

  @Post('/chat-goal/:goalId/pause')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  pauseGoal(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    return this.chatGoalService.pauseGoal(user.id, goalId);
  }

  @Post('/chat-goal/:goalId/reset')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  resetGoal(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    return this.chatGoalService.resetGoal(user.id, goalId);
  }

  @Post('/chat-goal/:goalId/reset-votes')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  resetVotes(
    @PassportUser() user: JwtStrategyUser,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    return this.chatGoalService.resetVotes(user.id, goalId);
  }
}
