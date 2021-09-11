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
import { Config } from '../../config/config.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { RefreshTokenDto } from './dto/refreshTokenDto';
import {
  JwtStrategyUser,
  TwitchLoginResponse,
  TwitchStrategyUser,
} from './auth.interface';
import { API_BASE } from '../honey-votes.interface';
import { PassportUser } from './decorators/passport-user.decorator';
import { User } from '../users/entities/User.entity';

@Controller(API_BASE)
export class AuthController {
  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly authService: AuthService,
  ) {}

  @Get('/auth/twitch')
  @UseGuards(TwitchAuthGuard)
  async twitchAuth() {}

  @Get('/auth/twitch/redirect')
  @UseGuards(TwitchAuthGuard)
  @Redirect()
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
  me(@PassportUser() user: JwtStrategyUser): Promise<User> {
    return this.authService.getUser(user.id);
  }

  @Post('/auth/refresh-token')
  @UseGuards(JwtAuthGuard)
  refreshToken(
    @PassportUser() user: JwtStrategyUser,
    @Body() { refreshToken }: RefreshTokenDto,
  ): Promise<TwitchLoginResponse> {
    return this.authService.refreshToken(user.id, refreshToken);
  }
}
