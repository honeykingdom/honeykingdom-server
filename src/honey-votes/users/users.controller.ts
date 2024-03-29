import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtStrategyUser } from '../auth/auth.interface';
import { PassportUser } from '../auth/decorators/passport-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_BASE } from '../honey-votes.constants';
import { User } from './entities/user.entity';
import { UserRoles } from './users.interface';
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
    if (id) return this.usersService.findById(id);
    if (login) return this.usersService.findByLogin(login);

    throw new BadRequestException();
  }

  @Get('/users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK', type: User })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  me(@PassportUser() user: JwtStrategyUser): Promise<User> {
    return this.usersService.findOneBy({ id: user.id });
  }

  @Get('/users/me/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'login', required: false })
  @ApiQuery({ name: 'id', required: false })
  @ApiOkResponse({ description: 'OK', type: UserRoles })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not found' })
  getUserRoles(
    @PassportUser() user: JwtStrategyUser,
    @Query('login') login: string,
    @Query('id') id: string,
  ): Promise<UserRoles> {
    return this.usersService.userRoles(user.id, id, login);
  }
}
