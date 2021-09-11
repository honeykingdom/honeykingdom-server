import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { API_BASE } from '../honey-votes.interface';
import { User } from './entities/User.entity';
import { UsersService } from './users.service';

@ApiTags('HoneyVotes - Users')
@Controller(API_BASE)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/users')
  @ApiQuery({ name: 'login', required: false })
  @ApiQuery({ name: 'id', required: false })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiNotFoundResponse({ description: 'Not found' })
  getUserByLogin(
    @Query('login') login: string,
    @Query('id') id: string,
  ): Promise<User> {
    if (id) return this.usersService.getChannelById(id);
    if (login) return this.usersService.getChannelByLogin(login);

    throw new BadRequestException();
  }
}
