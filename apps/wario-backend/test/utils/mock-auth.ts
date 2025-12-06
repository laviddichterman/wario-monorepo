/**
 * Auth Test Utilities
 *
 * Utilities for testing authenticated endpoints, mocking JWT guards,
 * and creating test user contexts.
 */

import type { Provider } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

/**
 * Test user data with common scopes for testing.
 */
export interface TestUser {
  userId: string;
  email: string;
  scopes: string[];
}

/**
 * Pre-defined test users with different permission levels.
 */
export const TestUsers = {
  admin: {
    userId: 'test-admin-id',
    email: 'admin@test.com',
    scopes: [
      'read:catalog',
      'write:catalog',
      'delete:catalog',
      'read:order',
      'write:order',
      'delete:order',
      'read:settings',
      'write:settings',
      'read:storecredit',
      'write:storecredit',
    ],
  } satisfies TestUser,

  catalogWriter: {
    userId: 'test-catalog-writer-id',
    email: 'catalog-writer@test.com',
    scopes: ['read:catalog', 'write:catalog'],
  } satisfies TestUser,

  orderReader: {
    userId: 'test-order-reader-id',
    email: 'order-reader@test.com',
    scopes: ['read:order'],
  } satisfies TestUser,

  noScopes: {
    userId: 'test-no-scopes-id',
    email: 'no-scopes@test.com',
    scopes: [],
  } satisfies TestUser,
};

/**
 * Creates a mock JWT guard that always allows access and attaches
 * the specified test user to the request.
 *
 * @example
 * ```ts
 * const module = await Test.createTestingModule({
 *   controllers: [OrderController],
 *   providers: [
 *     createMockAuthGuard(TestUsers.admin),
 *   ],
 * }).compile();
 * ```
 */
export function createMockAuthGuard(user: TestUser = TestUsers.admin): Provider {
  return {
    provide: APP_GUARD,
    useValue: {
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<{ user: TestUser }>();
        request.user = user;
        return true;
      },
    },
  };
}

/**
 * Creates a mock JWT guard that always denies access.
 * Useful for testing unauthorized scenarios.
 */
export function createDenyingAuthGuard(): Provider {
  return {
    provide: APP_GUARD,
    useValue: {
      canActivate: () => false,
    },
  };
}

/**
 * Mock JwtStrategy provider that bypasses actual JWT validation.
 */
export const MockJwtStrategy: Provider = {
  provide: 'JwtStrategy',
  useValue: {
    validate: jest.fn().mockImplementation((payload: { sub: string }) => ({
      userId: payload.sub,
      email: 'test@test.com',
      scopes: ['read:catalog', 'write:catalog'],
    })),
  },
};

/**
 * Creates a mock request object with a user attached.
 *
 * @example
 * ```ts
 * const req = createMockRequest(TestUsers.admin, {
 *   params: { id: '123' },
 *   body: { name: 'Test' },
 * });
 * ```
 */
export function createMockRequest(
  user: TestUser = TestUsers.admin,
  overrides: Partial<{
    params: Record<string, string>;
    query: Record<string, string>;
    body: unknown;
    headers: Record<string, string>;
  }> = {},
) {
  return {
    user,
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: overrides.body ?? {},
    headers: {
      authorization: 'Bearer mock-token',
      ...overrides.headers,
    },
  };
}
