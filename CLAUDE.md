# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

Read files first. Write complete solution. Test once. No over-engineering. Use LSP for navigation.

## Project Overview

Pegasussio is a Next.js 16 super-app combining multiple productivity micro-apps: **Pull Requestio** (GitHub PR dashboard) and **Sprint Planio** (real-time planning poker with Jira integration). Uses Bun as the runtime.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server (Turbopack, http://localhost:3000)
bun run build        # Production build
bun run lint         # ESLint
```

No test framework is configured.

## Architecture

### Micro-App Pattern

Each micro-app lives under `app/<app-name>/` with its own components, Zustand store, and types:

- `app/pull-requestio/` — GitHub PR dashboard (Octokit for GitHub API)
- `app/sprint-planio/` — Planning poker with real-time multiplayer (Supabase realtime)
- `app/page.tsx` — Central hub/launchpad

### State Management

Zustand stores per micro-app (`store.ts` in each app directory). No global store.

### API Routes

`app/api/` contains Next.js route handlers for:
- `jira/` — OAuth flow, JQL search, comment posting, issue updates
- `sprint/leave/` — Sprint room leave handling

Jira integration uses both OAuth and Basic Auth via axios.

### Realtime

Supabase client (`lib/supabase.ts`) powers real-time presence and voting in Sprint Planio.

### UI Stack

- **Shadcn UI** (new-york style) as primary component library — use Shadcn components for all new UI
- **Tailwind CSS v4** for custom styling
- **next-themes** for dark/light mode
- Shared UI components in `components/ui/`

### Component Guidelines

- Keep `"use client"` components small, pushed to leaves of the component tree
- Use Server Components for data fetching and layout
- Prefer external libraries over reinventing solutions

### Path Aliases

`@/*` maps to the project root (e.g., `@/components/ui/button`).

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_WATCHED_REPOS=owner/repo1,owner/repo2
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
```

### Code Intelligence

Prefer LSP over Grep/Glob/Read for code navigation:
- `goToDefinition` / `goToImplementation` to jump to source
- `findReferences` to see all usages across the codebase
- `workspaceSymbol` to find where something is defined
- `documentSymbol` to list all symbols in a file
- `hover` for type info without reading the file
- `incomingCalls` / `outgoingCalls` for call hierarchy

Before renaming or changing a function signature, use
`findReferences` to find all call sites first.

Use Grep/Glob only for text/pattern searches (comments,
strings, config values) where LSP doesn't help.

After writing or editing code, check LSP diagnostics before
moving on. Fix any type errors or missing imports immediately.
