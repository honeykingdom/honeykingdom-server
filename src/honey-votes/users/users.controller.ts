import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { API_BASE } from '../honey-votes.interface';
import { User } from './entities/User.entity';
import { UsersService } from './users.service';

@Controller(API_BASE)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/users')
  getUserByLogin(
    @Query('login') login: string,
    @Query('id') id: string,
  ): Promise<User> {
    if (id) return this.usersService.getChannelById(id);
    if (login) return this.usersService.getChannelByLogin(login);

    throw new BadRequestException();
  }
}
