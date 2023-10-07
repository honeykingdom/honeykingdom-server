import { HttpStatus } from '@nestjs/common';
import { sub } from 'date-fns';
import { setupServer } from 'msw/node';
import {
  type Path,
  rest,
  type ResponseResolver,
  type RestRequest,
  type RestContext,
} from 'msw';
import type { User } from '../../../src/honey-votes/users/entities/user.entity';
import type { UserRoles } from '../../../src/honey-votes/users/users.interface';
import MakeResponse from './make-response.class';

type Method = keyof typeof rest;

export type MockRequestOneConfig = {
  status: HttpStatus;
  response?: any;
};
export type MockRequestConfig = MockRequestOneConfig | MockRequestOneConfig[];

export type MockUserRoles = Partial<Omit<UserRoles, 'broadcaster'>>;

const PATHS = {
  twitchOAuthToken: 'https://id.twitch.tv/oauth2/token',
  twitchOAuthRevoke: 'https://id.twitch.tv/oauth2/revoke',
  twitchGetChannelEditors: 'https://api.twitch.tv/helix/channels/editors',
  twitchGetModerators: 'https://api.twitch.tv/helix/moderation/moderators',
  twitchGetVips: 'https://api.twitch.tv/helix/channels/vips',
  twitchCheckUserSubscription: 'https://api.twitch.tv/helix/subscriptions/user',
  twitchGetChannelFollowers: 'https://api.twitch.tv/helix/channels/followers',

  kinopoiskGetFilmData:
    'https://kinopoiskapiunofficial.tech/api/v2.2/films/:id',
  igdbGames: 'https://api.igdb.com/v4/games',
};

class MockRequests {
  server = setupServer();
  rest = rest;

  listen() {
    return this.server.listen({
      onUnhandledRequest(req) {
        if (req.url.href.startsWith('http://127.0.0.1')) return;
        console.error('Unhandled Request: %s %s', req.method, req.url.href);
      },
    });
  }
  close() {
    return this.server.close();
  }
  resetHandlers() {
    return this.server.resetHandlers();
  }

  private mockRequest(path: Path, method: Method, config: MockRequestConfig) {
    let i = 0;

    const handler: ResponseResolver<RestRequest, RestContext> = (
      req,
      res,
      ctx,
    ) => {
      let status: number;
      let body: any;
      if (Array.isArray(config)) {
        const currentConfig = config[i] || config.at(-1);
        status = currentConfig.status;
        body = currentConfig.response;
      } else {
        status = config.status;
        body = config.response;
      }
      i += 1;
      return res(ctx.status(status), ctx.json(body));
    };

    this.server.use(this.rest[method](path, handler));
  }

  mockTwitchUserRoles(
    broadcaster: User,
    initiator: User,
    roles: MockUserRoles = {},
  ) {
    this.mockTwitchGetChannelEditors({
      status: 200,
      response: MakeResponse.twitchGetChannelEditors(
        roles.editor ? [initiator] : [],
      ),
    });
    this.mockTwitchGetModerators({
      status: 200,
      response: MakeResponse.twitchGetModerators(roles.mod ? [initiator] : []),
    });
    this.mockTwitchGetVips({
      status: 200,
      response: MakeResponse.twitchGetModerators(roles.vip ? [initiator] : []),
    });
    this.mockTwitchCheckUserSubscription({
      status: roles.sub ? 200 : 404,
      response: roles.sub
        ? MakeResponse.twitchCheckUserSubscription(broadcaster, roles.subTier)
        : undefined,
    });
    this.mockTwitchGetChannelFollowers({
      status: 200,
      response: MakeResponse.twitchGetChannelFollowers(
        roles.follower ? [initiator] : [],
        roles.minutesFollowed
          ? sub(new Date(), { minutes: roles.minutesFollowed }).toISOString()
          : undefined,
      ),
    });
  }

  mockTwitchOAuthToken(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchOAuthToken, 'post', config);
  }
  mockTwitchOAuthRevoke(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchOAuthRevoke, 'post', config);
  }

  mockTwitchGetChannelEditors(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchGetChannelEditors, 'get', config);
  }
  mockTwitchGetModerators(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchGetModerators, 'get', config);
  }
  mockTwitchGetVips(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchGetVips, 'get', config);
  }
  mockTwitchCheckUserSubscription(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchCheckUserSubscription, 'get', config);
  }
  mockTwitchGetChannelFollowers(config: MockRequestConfig) {
    return this.mockRequest(PATHS.twitchGetChannelFollowers, 'get', config);
  }

  mockKinopoiskGetFilmData(config: MockRequestConfig) {
    return this.mockRequest(PATHS.kinopoiskGetFilmData, 'get', config);
  }
  mockIgdbGames(config: MockRequestConfig) {
    return this.mockRequest(PATHS.igdbGames, 'post', config);
  }
}

export default MockRequests;
