# wario-bridge Agent Guide

## Overview

`@wcp/wario-bridge` is an edge server application designed to run at the restaurant location. It handles real-time message routing between:

- **Ticket Printers** - ESC/POS compatible thermal printers for order tickets
- **KDS Tablets** - Kitchen Display System tablets for order management
- **wario-pos** - Staff Point of Sale clients

## Purpose

The bridge server provides:

1. **Local Network Communication** - Direct communication with printers and KDS on the restaurant LAN
2. **WebSocket Relay** - Real-time event relay between devices and POS clients
3. **Offline Resilience** - Buffering and retry for messages during network issues
4. **Device Discovery** - Auto-discovery of printers and KDS on the network

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   wario-pos     │◄───►│   wario-bridge   │◄───►│  wario-backend  │
│   (Browser)     │ WS  │   (Edge Server)  │ HTTP│   (Cloud API)   │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │ Printer │  │ Printer │  │   KDS   │
              │    1    │  │    2    │  │ Tablet  │
              └─────────┘  └─────────┘  └─────────┘
```

## Directory Structure

```
src/
├── main.ts                 # Bootstrap & server startup
├── app.module.ts           # Root module
├── app.controller.ts       # Health check endpoint
├── app.service.ts          # Core service
└── config/
    ├── app-config.service.ts  # Environment configuration
    └── config.module.ts       # Config module
```

## Configuration

Environment variables (see `.env.example`):

| Variable       | Default                 | Description          |
| -------------- | ----------------------- | -------------------- |
| `PORT`         | `3001`                  | Server port          |
| `BACKEND_URL`  | `http://localhost:3000` | Backend API URL      |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |
| `NODE_ENV`     | `development`           | Environment mode     |

## Development

```bash
# Start in development mode (with watch)
pnpm bridge:dev

# Build for production
pnpm bridge:build

# Type-check
pnpm bridge:typecheck

# Lint
pnpm bridge:lint

# Run tests
pnpm bridge:test
```

## Dependencies

- **@wcp/wario-shared-private** - Internal shared types
- **NestJS** - Server framework
- **Socket.IO** - WebSocket communication
- **nestjs-pino** - Structured logging

## Conventions

1. **Logging**: Use `this.logger` from `nestjs-pino`. Never use `console.log`.
2. **Message Types**: Import from `@wcp/wario-shared-private` for type safety.
3. **Error Handling**: Throw domain exceptions, not generic errors.

## Future Modules (To Be Implemented)

- **PrinterGateway** - WebSocket gateway for printer communication
- **KdsGateway** - WebSocket gateway for KDS tablets
- **DeviceDiscoveryService** - Network device auto-discovery
- **MessageQueueService** - Offline message buffering
