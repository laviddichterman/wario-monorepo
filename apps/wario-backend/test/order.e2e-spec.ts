/**
 * Order API E2E Tests
 *
 * Tests the order API endpoints with authenticated requests.
 * Demonstrates usage of e2e-helpers for making authenticated requests.
 */

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

import {
  createE2EClient,
  type E2EClient,
  expectError,
  expectSuccess,
  overrideE2EAuth,
  TestUsers,
} from './utils';

describe('Order API (e2e)', () => {
  let app: INestApplication<App>;
  let adminClient: E2EClient;
  let orderReaderClient: E2EClient;
  let noScopesClient: E2EClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await overrideE2EAuth(
      Test.createTestingModule({
        imports: [AppModule],
      }),
    ).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create clients with different permission levels
    adminClient = createE2EClient(app, TestUsers.admin);
    orderReaderClient = createE2EClient(app, TestUsers.orderReader);
    noScopesClient = createE2EClient(app, TestUsers.noScopes);
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // GET /api/v1/order - List orders
  // =========================================================================

  describe('GET /api/v1/order', () => {
    it('should return orders for user with read:order scope', async () => {
      const response = await adminClient.get('/api/v1/order');
      expectSuccess(response);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return orders for orderReader user', async () => {
      const response = await orderReaderClient.get('/api/v1/order');
      expectSuccess(response);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 for user without read:order scope', async () => {
      const response = await noScopesClient.get('/api/v1/order');
      expectError(response, 403);
    });
  });

  // =========================================================================
  // Auth enforcement tests
  // =========================================================================

  describe('Auth enforcement', () => {
    it('should return 401 without auth header', async () => {
      // Use raw supertest without auth headers
      const response = await request(app.getHttpServer()).get('/api/v1/order');
      expect(response.status).toBe(401);
    });
  });
});
