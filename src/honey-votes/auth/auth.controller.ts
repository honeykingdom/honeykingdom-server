import { Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Config } from '../../config/config.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { RefreshTokenDto } from './dto/refreshTokenDto';
import {
  JwtStrategyUser,
  RefreshTokenResponse,
  TwitchStrategyUser,
} from './auth.interface';
import { API_BASE } from '../honey-votes.interface';
import { PassportUser } from './decorators/passport-user.decorator';
import { User } from '../users/entities/User.entity';

@ApiTags('HoneyVotes - Auth')
@Controller(API_BASE)
export class AuthController {
  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly authService: AuthService,
  ) {}

  @Get('/auth/twitch')
  @UseGuards(TwitchAuthGuard)
  @ApiExcludeEndpoint()
  async twitchAuth() {}

  @Get('/auth/twitch/redirect')
  @UseGuards(TwitchAuthGuard)
  @Redirect()
  @ApiExcludeEndpoint()
  async twitchAuthRedirect(
    @PassportUser() user: TwitchStrategyUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.twitchLogin(user);

    if (!tokens) return;

    const { accessToken, refreshToken } = tokens;

    res.cookie('accessToken', accessToken, { httpOnly: false });
    res.cookie('refreshToken', refreshToken, { httpOnly: false });

    return {
      url: this.configService.get<string>('HONEY_VOTES_REDIRECT_FRONTEND_URL'),
    };
  }

  @Get('/auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK', type: User })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  me(@PassportUser() user: JwtStrategyUser): Promise<User> {
    return this.authService.getUser(user.id);
  }

  @Post('/auth/refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'OK', type: RefreshTokenResponse })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  refreshToken(
    @PassportUser() user: JwtStrategyUser,
    @Body() { refreshToken }: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(user.id, refreshToken);
  }
}
