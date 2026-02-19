# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Production build
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/__tests__/file-system.test.ts

# Database reset
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Apply database migrations
npx prisma migrate dev
```

## Architecture

**UIGen** is an AI-powered React component generator with live preview. It uses Claude to generate components that run in a sandboxed iframe via a virtual file system — no files are ever written to disk.

### AI Integration (the core loop)

The chat flow lives in `src/lib/contexts/chat-context.tsx`. When a user sends a message:
1. The API route `src/app/api/chat/route.ts` streams responses from Claude (via Vercel AI SDK + `@ai-sdk/anthropic`).
2. Claude uses two tools defined in `src/lib/tools/`: `str_replace_editor` (for editing files) and `file_manager` (for creating/deleting files).
3. Tool calls update the `VirtualFileSystem` (in-memory, `src/lib/file-system.ts`).
4. The preview iframe reads from this virtual FS and hot-reloads.

The system prompt is in `src/lib/prompts/generation.tsx`. The language model provider (`src/lib/provider.ts`) falls back to a `MockLanguageModel` if no `ANTHROPIC_API_KEY` is set in `.env`.

### Authentication & Data

- JWT sessions stored in httpOnly cookies, managed in `src/lib/auth.ts`.
- Server Actions in `src/actions/` handle all authenticated mutations (create/get projects, sign in/up/out).
- Prisma with SQLite (`prisma/schema.prisma`) stores `User` and `Project` records. `Project.messages` and `Project.data` are stored as JSON columns.
- Anonymous users can generate components; persistence requires sign-up.

### Key Paths

| Path | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Streaming AI chat endpoint |
| `src/lib/contexts/chat-context.tsx` | Client-side chat + AI state |
| `src/lib/contexts/file-system-context.tsx` | VirtualFS React state |
| `src/lib/file-system.ts` | VirtualFileSystem class (core abstraction) |
| `src/lib/tools/` | Claude tool definitions (str_replace, file_manager) |
| `src/lib/provider.ts` | Anthropic vs Mock model selection |
| `src/lib/prompts/generation.tsx` | System prompt for component generation |
| `src/lib/transform/jsx-transformer.ts` | JSX transformation for preview |
| `src/components/preview/` | Iframe-based live preview |
| `src/components/editor/` | Monaco code editor + file tree |
| `prisma/schema.prisma` | SQLite schema (User, Project) |

### Path Aliases

`@/*` maps to `src/*` throughout the codebase.

### Testing

Tests live in `src/__tests__/` and use Vitest + `@testing-library/react` with jsdom. Test coverage includes contexts, file-system utilities, and UI components.
