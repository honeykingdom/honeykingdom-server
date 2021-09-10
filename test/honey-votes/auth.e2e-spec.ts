import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Connection, Repository } from 'typeorm';
import { HoneyVotesModule } from '../../src/honey-votes/honey-votes.module';
import { User } from '../../src/honey-votes/users/entities/User.entity';
import { DatabaseModule } from '../../src/database/database.module';
import { typeOrmPostgresModule } from '../../src/typeorm';
import { DatabaseService } from '../../src/database/database.service';
import { Config } from '../../src/config/config.interface';
import { API_BASE } from '../../src/honey-votes/honey-votes.interface';
import { RefreshTokenDto } from '../../src/honey-votes/auth/dto/refreshTokenDto';
import { JwtPayload } from '../../src/honey-votes/auth/auth.interface';
import {
  signAccessToken,
  signRefreshToken,
  SignTokenOptions,
} from './utils/auth';
import { MockUser, users } from './utils/users';
import { TwitchChatModule } from '../../src/twitch-chat/twitch-chat.module';
import { twitchChatServiceMock } from './chat-votes.e2e-spec';

describe('HoneyVotes - Auth (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userRepo: Repository<User>;
  let configService: ConfigService<Config>;
  let jwtService: JwtService;

  const getAuthorizationHeader = (
    { id, login }: MockUser,
    signTokenOptions?: SignTokenOptions,
  ) =>
    `Bearer ${signAccessToken(
      { sub: id, login },
      jwtService,
      configService,
      signTokenOptions,
    )}`;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({ envFilePath: '.env.test' }),
        typeOrmPostgresModule,
        HoneyVotesModule,
      ],
    })
      .overrideProvider(TwitchChatModule)
      .useValue({})
      .overrideProvider('TwitchChatModuleAnonymous')
      .useValue(twitchChatServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    connection = moduleFixture
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();

    userRepo = connection.getRepository(User);
    configService = app.get<ConfigService<Config>>(ConfigService);
    jwtService = app.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await connection.query(`TRUNCATE ${User.tableName} CASCADE;`);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('/auth/twitch', () => {
    it.todo('should redirect to the twitch auth page');
  });

  describe('/auth/twitch/redirect', () => {
    it.todo('should redirect and set auth cookies');
  });

  describe('/auth/me', () => {
    it('should return authenticated user', async () => {
      const [user] = await userRepo.save(users);

      return request(app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .set('Authorization', getAuthorizationHeader(user))
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
      return request(app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .expect(HttpStatus.UNAUTHORIZED)
        .expect({ statusCode: 401, message: 'Unauthorized' });
    });

    it('should return 401 if token is expired', async () => {
      const [user] = await userRepo.save(users);

      return request(app.getHttpServer())
        .get(`${API_BASE}/auth/me`)
        .set('Authorization', getAuthorizationHeader(user, { expired: true }))
        .expect(HttpStatus.UNAUTHORIZED)
        .expect({ statusCode: 401, message: 'Unauthorized' });
    });
  });

  describe('/auth/refresh-token', () => {
    it('should refresh a valid token', async () => {
      const [user] = await userRepo.save(users);
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          jwtService,
          configService,
        ),
      };

      return request(app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set('Authorization', getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(201)
        .expect((response) => {
          const { accessToken, refreshToken } = response.body;

          expect(accessToken).toBeDefined();
          expect(refreshToken).toBeDefined();

          const accessTokenPayload = jwtService.decode(
            accessToken,
          ) as JwtPayload;
          const refreshTokenPayload = jwtService.decode(
            refreshToken,
          ) as JwtPayload;

          expect(accessTokenPayload.sub).toBe(user.id);
          expect(accessTokenPayload.login).toBe(user.login);
          expect(refreshTokenPayload.sub).toBe(user.id);
          expect(refreshTokenPayload.login).toBe(user.login);
        });
    });

    it('should return 401 if user is not authorized', async () => {
      const [user] = await userRepo.save(users);

      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          jwtService,
          configService,
        ),
      };

      return request(app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set('Authorization', 'Bearer not-valid-access-token')
        .send(refreshTokenDto)
        .expect(401)
        .expect({ statusCode: 401, message: 'Unauthorized' });
    });

    it('should return 400 if refresh token is invalid', async () => {
      const [user] = await userRepo.save(users);
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'not-valid-refresh-token',
      };

      return request(app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set('Authorization', getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(400)
        .expect({ statusCode: 400, message: 'Bad Request' });
    });

    it('should return 400 if refresh token is expired', async () => {
      const [user] = await userRepo.save(users);
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: signRefreshToken(
          { sub: user.id, login: user.login },
          jwtService,
          configService,
          { expired: true },
        ),
      };

      return request(app.getHttpServer())
        .post(`${API_BASE}/auth/refresh-token`)
        .set('Authorization', getAuthorizationHeader(user))
        .send(refreshTokenDto)
        .expect(400)
        .expect({ statusCode: 400, message: 'Bad Request' });
    });
  });
});
