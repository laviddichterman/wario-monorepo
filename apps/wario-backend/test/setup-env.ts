/**
 * E2E Test Environment Setup
 *
 * This file is loaded before E2E tests run (via jest setupFiles).
 * It imports and applies the centralized E2E configuration.
 */

import { setE2EEnvironment } from './e2e-config';

// Apply all E2E environment variables
setE2EEnvironment();
