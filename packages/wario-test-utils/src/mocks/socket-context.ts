/**
 * Mock Socket.io Context for testing
 *
 * Provides mock values for the SocketContext used by TanStack Query hooks.
 */

import { vi } from 'vitest';

/**
 * Socket context value type for mocking
 * Matches SocketContextValue from wario-ux-shared
 */
export interface MockSocketContextValue {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  socket: null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock socket context value for testing.
 *
 * @example
 * ```typescript
 * const mockSocket = createMockSocketContext({ status: 'connected' });
 * ```
 */
export function createMockSocketContext(overrides: Partial<MockSocketContextValue> = {}): MockSocketContextValue {
  return {
    status: 'disconnected',
    socket: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
}
