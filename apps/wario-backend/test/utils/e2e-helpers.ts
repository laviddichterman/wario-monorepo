/**
 * E2E Test Helpers
 *
 * Utilities for making authenticated E2E requests and setting up test applications
 * with bypassed authentication.
 */

import type { INestApplication } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import request, { type Response, type Test } from 'supertest';
import type { App } from 'supertest/types';

import { type TestUser, TestUsers } from './mock-auth';

/**
 * E2E Auth helper that wraps supertest and attaches mock user context.
 *
 * This helper works by:
 * 1. Setting up the app with a bypassed auth guard (via overrideGuards)
 * 2. Attaching user info via custom headers that middleware can read
 *
 * @example
 * ```ts
 * const e2e = createE2EClient(app, TestUsers.admin);
 *
 * // Make authenticated requests
 * const response = await e2e.get('/api/v1/orders');
 * const createResponse = await e2e.post('/api/v1/order', { customerId: '123' });
 * ```
 */
export interface E2EClient {
  get(url: string): Test;
  post(url: string, body?: unknown): Test;
  put(url: string, body?: unknown): Test;
  patch(url: string, body?: unknown): Test;
  delete(url: string): Test;
  /** Raw supertest agent for advanced use cases */
  agent: unknown;
  /** Current user context */
  user: TestUser;
}

/**
 * Creates an E2E client for making authenticated requests.
 *
 * NOTE: The app must be configured with `overrideE2EAuth()` for this to work.
 *
 * @param app - NestJS application instance
 * @param user - Test user context to use for requests
 */
export function createE2EClient(app: INestApplication<App>, user: TestUser = TestUsers.admin): E2EClient {
  const agent = request.agent(app.getHttpServer());

  const makeRequest = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, body?: unknown): Test => {
    let req = agent[method](url)
      .set('Authorization', `Bearer mock-e2e-token`)
      .set('X-Test-User-Id', user.userId)
      .set('X-Test-User-Email', user.email)
      .set('X-Test-User-Scopes', user.scopes.join(','));

    if (body && (method === 'post' || method === 'put' || method === 'patch')) {
      req = req.send(body);
    }

    return req;
  };

  return {
    get: (url: string) => makeRequest('get', url),
    post: (url: string, body?: unknown) => makeRequest('post', url, body),
    put: (url: string, body?: unknown) => makeRequest('put', url, body),
    patch: (url: string, body?: unknown) => makeRequest('patch', url, body),
    delete: (url: string) => makeRequest('delete', url),
    agent,
    user,
  };
}

/**
 * Mock auth guard that reads user context from test headers.
 * This bypasses real JWT validation for E2E tests.
 */
const createE2EAuthGuard = () => ({
  canActivate: (context: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UnauthorizedException } = require('@nestjs/common') as {
      UnauthorizedException: new (message?: string) => Error;
    };

    const request = context.switchToHttp().getRequest();
    const headers = request.headers as Record<string, string | undefined>;

    // Read user from test headers
    const userId = headers['x-test-user-id'];
    const email = headers['x-test-user-email'];
    const scopesHeader = headers['x-test-user-scopes'] || '';

    if (userId) {
      request.user = {
        userId,
        email: email || 'test@test.com',
        scopes: scopesHeader ? scopesHeader.split(',') : [],
      };
      return true;
    }

    // No test headers - throw UnauthorizedException (401)
    throw new UnauthorizedException('Unauthorized');
  },
});

/**
 * Mock scopes guard that reads scopes from request.user (set by createE2EAuthGuard).
 * This checks if the user has scopes based on the URL pattern.
 *
 * Note: Since we can't easily access Reflector metadata in a mocked guard,
 * we use URL-based scope inference for common endpoints.
 */
const createE2EScopesGuard = () => ({
  canActivate: (context: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }): boolean => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { scopes?: string[] } | undefined;
    const url = request.url as string | undefined;

    // If no user, deny
    if (!user?.scopes) {
      return false;
    }

    // Infer required scope from URL pattern
    // This is a simplified check for common endpoints
    const scopeMap: Record<string, string> = {
      '/api/v1/order': 'read:order',
      '/api/v1/catalog': 'read:catalog',
      '/api/v1/settings': 'read:settings',
    };

    // Find matching scope requirement
    for (const [pattern, requiredScope] of Object.entries(scopeMap)) {
      if (url?.startsWith(pattern)) {
        return user.scopes.includes(requiredScope);
      }
    }

    // No specific scope required for unmatched URLs
    return true;
  },
});

/**
 * Overrides authentication guards on a TestingModuleBuilder for E2E tests.
 * This replaces the real JWT validation with a mock that reads from test headers.
 *
 * @example
 * ```ts
 * const moduleFixture = await overrideE2EAuth(
 *   Test.createTestingModule({ imports: [AppModule] })
 * ).compile();
 *
 * const app = moduleFixture.createNestApplication();
 * await app.init();
 *
 * const e2e = createE2EClient(app, TestUsers.admin);
 * ```
 */
export function overrideE2EAuth(builder: TestingModuleBuilder): TestingModuleBuilder {
  // Import guards dynamically to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JwtAuthGuard } = require('../../src/auth/guards/jwt-auth.guard') as {
    JwtAuthGuard: new () => unknown;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScopesGuard } = require('../../src/auth/guards/scopes.guard') as { ScopesGuard: new () => unknown };

  // Override the guard classes themselves, not the APP_GUARD token
  // This works because NestJS resolves the guard class when APP_GUARD uses useExisting
  return builder
    .overrideProvider(JwtAuthGuard)
    .useValue(createE2EAuthGuard())
    .overrideProvider(ScopesGuard)
    .useValue(createE2EScopesGuard());
}

/**
 * Convenience function to assert response success.
 */
export function expectSuccess(response: Response, expectedStatus = 200): void {
  if (response.status !== expectedStatus) {
    const bodyPreview = JSON.stringify(response.body).slice(0, 500);
    throw new Error(
      `Expected status ${String(expectedStatus)} but got ${String(response.status)}. Body: ${bodyPreview}`,
    );
  }
}

/**
 * Convenience function to assert response error.
 */
export function expectError(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected error status ${String(expectedStatus)} but got ${String(response.status)}`);
  }
}
