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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TwitchAuthGuard } from './guards/twitch-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  JwtStrategyUser,
  RefreshTokenResponse,
  TwitchStrategyUser,
} from './auth.interface';
import { API_BASE } from '../honey-votes.constants';
import { PassportUser } from './decorators/passport-user.decorator';

@ApiTags('HoneyVotes - Auth')
@Controller(API_BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const url = await this.authService.twitchRedirect(user);

    return { url };
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
