# Roof — Claude Code Instructions

## Project Overview

React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Capacitor 8 (iOS) app for rental housing search in the Netherlands. Backend: Supabase (PostgreSQL + Auth + Realtime + Edge Functions).

## Critical Rules

- **App language is English** — all UI text, labels, placeholders, error messages, and code comments must be in English
- **Preserve visual styles** — do not change Tailwind classes, Framer Motion animations, colors, spacing, or layout unless explicitly asked
- **TypeScript strict mode** — `strict: true` in tsconfig. All code must be fully typed, no `any` unless absolutely necessary
- **Path alias** — use `@/` for imports from `src/` (e.g., `import { useAuth } from '@/stores/authStore'`)
- **No tests configured** — verify changes via `npm run build` (tsc + vite build)

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc + vite build (use this to verify changes)
npm run typecheck  # tsc --noEmit
npx cap sync       # Sync web build to iOS
npx cap open ios   # Open Xcode project
```

## Architecture (post-refactoring)

- **UI State**: Zustand stores in `src/stores/`
- **Server State**: TanStack Query hooks in `src/queries/`
- **Validation**: Zod schemas in `src/schemas/`
- **Error Handling**: react-error-boundary wrapping the app
- **Constants**: Shared in `src/data/` (sources, filters, cities)
- **Utilities**: `src/lib/` (supabase, storage, analytics, haptics, listings)

## Conventions

- Contexts in `src/context/` are thin re-exports of Zustand store hooks (backward compat)
- Zustand stores use selectors for granular re-renders: `useStore(s => s.field)`
- TanStack Query for all Supabase reads; mutations with optimistic updates
- Zod schemas validate all external data (storage, DB rows, webhook payloads)
- Source colors, filter options, city lists — single source of truth in `src/data/`

## Current Refactoring

See `REFACTORING_PLAN.md` for the phased migration plan. Execute one phase at a time. Run `npm run build` after each phase.
