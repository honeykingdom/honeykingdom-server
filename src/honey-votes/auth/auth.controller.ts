import { Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from '../../config/config.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { RefreshTokenDto } from './dto/refreshTokenDto';
import { JwtStrategyUser, TwitchStrategyUser } from './auth.interface';
import { PassportUser } from './decorators/passport-user.decorator';

@Controller('api/honey-votes/auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly authService: AuthService,
  ) {}

  @Get('twitch')
  @UseGuards(TwitchAuthGuard)
  async twitchAuth() {}

  @Get('twitch/redirect')
  @UseGuards(TwitchAuthGuard)
  @Redirect()
  async twitchAuthRedirect(
    @PassportUser() user: TwitchStrategyUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.twitchLogin(user);

    if (!tokens) return;

    const { accessToken, refreshToken } = tokens;

    // TODO: add expires param
    res.cookie('accessToken', accessToken, { httpOnly: false });
    res.cookie('refreshToken', refreshToken, { httpOnly: false });

    return {
      url: this.configService.get<string>('HONEY_VOTES_REDIRECT_FRONTEND_URL'),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@PassportUser() user: JwtStrategyUser) {
    const dbUser = await this.authService.getUser(user.id);
    const { id, login, displayName, avatarUrl } = dbUser;

    return { id, login, displayName, avatarUrl };
  }

  @Post('/refresh-token')
  @UseGuards(JwtAuthGuard)
  refreshToken(
    @PassportUser() user: JwtStrategyUser,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refreshToken(user.id, refreshTokenDto.refreshToken);
  }
}
