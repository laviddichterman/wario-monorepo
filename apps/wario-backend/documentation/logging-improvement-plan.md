# Logging Improvement Plan for Wario Backend

## Objective
Improve the logging in `wario-backend` to be consistent, informative, succinct, and actionable. We will achieve this by migrating to `nestjs-pino`, a high-performance, JSON-based logger that integrates seamlessly with NestJS.

## Strategy

1.  **Library Selection**: Use `nestjs-pino`.
    *   **Why**: It provides structured JSON logging (succinct, machine-readable), automatic request/response logging (informative, actionable), and integrates with NestJS's dependency injection.
    *   **Performance**: It is significantly faster than the default logger because it logs asynchronously and uses `pino`.

2.  **Contextual Logging**:
    *   Enable `AsyncLocalStorage` (CLS) to automatically attach `req.id` (Request ID) to all logs generated within a request lifecycle.
    *   This ensures every log line can be traced back to a specific user request.

3.  **Standardization**:
    *   Enforce a pattern of logging objects rather than stringified JSON.
    *   Example: Instead of `logger.error('Error: ' + JSON.stringify(err))`, use `logger.error({ err }, 'Error message')`.

## Implementation Steps

### Phase 1: Setup and Configuration

1.  **Install Dependencies**:
    ```bash
    npm install nestjs-pino pino-http pino-pretty
    ```

2.  **Configure `AppModule`**:
    *   Import `LoggerModule` from `nestjs-pino`.
    *   Configure `pino-http` options:
        *   **Transport**: Use `pino-pretty` only in non-production environments.
        *   **Redaction**: Redact sensitive headers (e.g., `Authorization`, `cookie`).
        *   **AutoLogging**: Enable logging of incoming requests and outgoing responses.
        *   **GenReqId**: Ensure a unique Request ID is generated (or passed from headers).

3.  **Replace Global Logger**:
    *   Update `main.ts` to use `app.useLogger(app.get(Logger))`.

### Phase 2: Global Error Handling Update

1.  **Update `AllExceptionsFilter`**:
    *   Refactor to use the new logger.
    *   Remove manual logging of request details (method, url, etc.) since `nestjs-pino` handles this automatically via `autoLogging`.
    *   Focus on logging the *exception* details and the *response* structure.

### Phase 3: Service Refactoring (Incremental)

1.  **Refactor `CatalogProviderService`**:
    *   Update `this.logger` usage.
    *   Replace `JSON.stringify(err)` with structured logging.
    *   Example:
        ```typescript
        // Before
        this.logger.error(`Failed fetching categories with error: ${JSON.stringify(err)}`);
        
        // After
        this.logger.error(err, 'Failed fetching categories');
        // OR if using PinoLogger directly for more control
        this.logger.error({ err }, 'Failed fetching categories');
        ```

2.  **Refactor Other Services**:
    *   Apply the same pattern to other services using `Logger`.

## Example Configuration

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        redact: ['req.headers.authorization'],
        autoLogging: true,
        // customProps: (req, res) => ({
        //   context: 'HTTP',
        // }),
      },
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

```typescript
// main.ts
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  // ...
}
```

## Benefits

*   **Consistent**: All logs follow the same JSON structure.
*   **Informative**: Includes timestamp, hostname, pid, level, and request context (reqId).
*   **Succinct**: No massive stack traces in dev mode (thanks to pino-pretty), compact JSON in prod.
*   **Actionable**: Errors are linked to request IDs, making debugging easier.

---

## Implementation Status

### ✅ Phase 1: Setup and Configuration (Complete)

1.  **Dependencies Installed**:
    - `nestjs-pino ^4.5.0`
    - `pino-http ^11.0.0`
    - `pino-pretty ^13.1.3`

2.  **LoggerModule Configured** in `app.module.ts`:
    - `pino-pretty` transport for non-production environments
    - Sensitive header redaction (`authorization`, `cookie`)
    - Auto-logging of requests/responses
    - Custom log levels based on response status codes
    - Custom success/error message formatting

3.  **main.ts Updated**:
    - `bufferLogs: true` to capture startup logs
    - `app.useLogger(app.get(Logger))` to use pino for all NestJS logging

### 🔲 Phase 2: Global Error Handling Update (Pending)

- Refactor `AllExceptionsFilter` to use structured logging via `PinoLogger`

### 🔲 Phase 3: Service Refactoring (Pending)

- Incrementally update services to use structured logging patterns
- Replace `JSON.stringify(err)` with `{ err }` object logging

