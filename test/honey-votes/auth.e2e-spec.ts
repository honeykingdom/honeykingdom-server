import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { User } from '../../src/honey-votes/users/entities/User.entity';
import { API_BASE } from '../../src/honey-votes/honey-votes.interface';
import { RefreshTokenDto } from '../../src/honey-votes/auth/dto/refreshTokenDto';
import { JwtPayload } from '../../src/honey-votes/auth/auth.interface';
import { signRefreshToken } from './utils/auth';
import { getHoneyVotesTestContext } from './utils/getHoneyVotesTestContext';

describe('HoneyVotes - Auth (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  describe('/auth/me', () => {
    it('should return authenticated user', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .set(...ctx.getAuthorizationHeader(user))
        .expect(200)
        .expect({
          id: user.id,
          login: user.login,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          areTokensValid: true,
        } as Partial<User>);
    });

    it('should return 401 if there is no token', async () => {
      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 if token is expired', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .set(...ctx.getAuthorizationHeader(user, { expired: true }))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/auth/refresh-token', () => {
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
        .expect(201)
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
        .expect(401);
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
        .expect(400);
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
        .expect(400);
    });
  });
});
