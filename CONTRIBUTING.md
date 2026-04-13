# Contributing to ByteSwarm

Thanks for your interest in contributing! ByteSwarm is an open-source project and we welcome contributions of all kinds.

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommend using [fnm](https://github.com/Schniz/fnm) or nvm)
- **pnpm** 8+ (`npm install -g pnpm`)
- **Go** 1.22+ (for the worker service)
- **Docker** (for local Supabase and full-stack development)

### Setup

```bash
# Clone the repo
git clone https://github.com/byteswarm/byteswarm.git
cd byteswarm

# Install dependencies
pnpm install

# Set up environment
cp packages/web/.env.example packages/web/.env.local
# Fill in your Supabase credentials

# Start the development stack
docker compose -f docker/compose.dev.yaml up

# In a separate terminal, start the web app
cd packages/web && pnpm dev
```

### Project Structure

```
byteswarm/
  packages/
    web/          # Next.js 15 frontend + API routes
    worker/       # Go agent worker (MCP, Socket.IO)
    shared/       # Shared TypeScript types and schemas
  supabase/
    migrations/   # Database migrations
  docker/         # Docker Compose configs
```

## Development Workflow

### Branching

- `feature/short-desc` for new features
- `fix/short-desc` for bug fixes
- `chore/short-desc` for maintenance

### Commits

Use conventional commits:

```
feat(scope): add new feature
fix(scope): fix a bug
chore(scope): maintenance task
docs(scope): documentation change
test(scope): add or update tests
```

### Testing

```bash
# Run web tests
cd packages/web && pnpm test

# Run Go tests
cd packages/worker && go test ./...

# Type check
cd packages/web && pnpm tsc --noEmit
```

### Code Quality

- **TypeScript** for all frontend code (strict mode)
- **Go** for the worker service
- **Tailwind CSS** with semantic design tokens (see `globals.css`)
- **Vitest** for frontend tests
- All PRs must pass CI (tests + type check + lint)

## What to Contribute

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/byteswarm/byteswarm/labels/good%20first%20issue).

### Areas We Need Help

- **Documentation** -- better guides, examples, tutorials
- **Testing** -- more integration tests, E2E tests
- **Accessibility** -- screen reader testing, keyboard navigation
- **Internationalization** -- i18n support
- **New AI providers** -- adapters for Anthropic, Gemini, local models
- **MCP tools** -- new built-in tools for agents

## Pull Request Process

1. Fork the repo and create your branch from `main`
2. Make your changes with tests
3. Ensure all tests pass and there are no TypeScript errors
4. Update documentation if you changed any public APIs
5. Open a PR with a clear description of what and why

## Code of Conduct

Be kind. Be respectful. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
