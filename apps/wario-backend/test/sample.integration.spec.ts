import { type INestApplication } from '@nestjs/common';
import { type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';

import {
  createMockAuthGuard,
  createMockModelProvider,
  createTestingModuleWithMocks,
  MockProviders,
  ModelNames,
  TestUsers,
} from './utils';

describe('Sample Integration Test (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Create a testing module that imports AppModule but overrides specific providers
    const moduleFixture: TestingModule = await createTestingModuleWithMocks({
      imports: [AppModule],
      providers: [
        // Mock Auth Guard to simulate a logged-in user
        createMockAuthGuard(TestUsers.admin),

        // Mock specific services if needed (e.g. external APIs)
        MockProviders.SquareService(),
        MockProviders.GoogleService(),

        // Mock Database Models to avoid connecting to real DB
        createMockModelProvider(ModelNames.WOrder),
        createMockModelProvider(ModelNames.WProduct),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) - Public Route', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  // Example of testing a protected route (if one existed)
  // it('/orders (GET) - Protected Route', () => {
  //   return request(app.getHttpServer())
  //     .get('/orders')
  //     .expect(200);
  // });
});
