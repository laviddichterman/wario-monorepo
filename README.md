# Wario Monorepo

Welcome to the Wario platform monorepo.

## 📚 Documentation

**Start Here:**

- **[Repository Map](.agent/rules/repository-map.md)** - Visual guide to the codebase structure.
- **[Tech Stack](.agent/rules/tech-stack.md)** - libraries and architectural decisions (The "Trinity" of State).
- **[Development](.agent/rules/development.md)** - How to run, build, and test.
- **[Conventions](.agent/rules/conventions.md)** - Coding rules and best practices.

**Detailed Package Guides:**

- [Backend](apps/wario-backend/AGENT_GUIDE.md)
- [POS](apps/wario-pos/AGENT_GUIDE.md)
- [Shared Logic](packages/wario-shared/AGENT_GUIDE.md)
- [UX Shared](packages/wario-ux-shared/AGENT_GUIDE.md)
- [FE UX Shared](packages/wario-fe-ux-shared/AGENT_GUIDE.md)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Backend
pnpm output backend:start:dev
```
