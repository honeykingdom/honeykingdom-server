import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { API_BASE } from '../../src/honey-votes/honey-votes.constants';
import { RefreshTokenDto } from '../../src/honey-votes/auth/dto/refresh-token.dto';
import { JwtPayload } from '../../src/honey-votes/auth/auth.interface';
import { signRefreshToken } from './utils/auth';
import HoneyVotesContext from './utils/honey-votes-context.class';

describe('HoneyVotes - Auth (e2e)', () => {
  const ctx = new HoneyVotesContext();

  beforeAll(() => ctx.create());
  afterEach(() => ctx.clearTables());
  afterAll(() => ctx.destroy());

  describe('/auth/refresh-token (POST)', () => {
    it('should refresh a valid token', async () => {
      const [user] = await ctx.createUsers();
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          ctx.jwtService,
          ctx.configService,
        ),
      };

      return request(ctx.app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set(...ctx.getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          const { accessToken, refreshToken } = response.body;

          expect(accessToken).toBeDefined();
          expect(refreshToken).toBeDefined();

          const accessTokenPayload = ctx.jwtService.decode(
            accessToken,
          ) as JwtPayload;
          const refreshTokenPayload = ctx.jwtService.decode(
            refreshToken,
          ) as JwtPayload;

          expect(accessTokenPayload.sub).toBe(user.id);
          expect(accessTokenPayload.login).toBe(user.login);
          expect(refreshTokenPayload.sub).toBe(user.id);
          expect(refreshTokenPayload.login).toBe(user.login);
        });
    });

    it('should return 401 if user is not authorized', async () => {
      const [user] = await ctx.createUsers();

      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          ctx.jwtService,
          ctx.configService,
        ),
      };

      return request(ctx.app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set('Authorization', 'Bearer not-valid-access-token')
        .send(refreshTokenDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 if refresh token is invalid', async () => {
      const [user] = await ctx.createUsers();
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'not-valid-refresh-token',
      };

      return request(ctx.app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set(...ctx.getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 if refresh token is expired', async () => {
      const [user] = await ctx.createUsers();
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          ctx.jwtService,
          ctx.configService,
          { expired: true },
        ),
      };

      return request(ctx.app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set(...ctx.getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
