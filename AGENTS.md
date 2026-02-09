# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router entry points (`layout.tsx`, `page.tsx`, `globals.css`).
- `lib/`: Shared utilities and integrations. Supabase wrapper lives in `lib/supabase/`.
- `stores/`: Zustand stores for all state management (e.g., `supabaseStore.ts`).
- `public/`: Static assets.
- Config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.

## Build, Test, and Development Commands
- `pnpm dev`: Start the local dev server at `http://localhost:3000`.
- `pnpm build`: Create a production build.
- `pnpm start`: Run the production server from the build output.
- `pnpm lint`: Run ESLint (Next.js core-web-vitals + TypeScript rules).

## Coding Style & Naming Conventions
- Language: TypeScript + React 19 with Next.js App Router.
- State management: **Zustand only**. Do not use `useState` or `useReducer`.
- Store naming: file `stores/<domain>Store.ts`, hook `use<Domain>Store`.
- Imports: prefer `@/` path alias (e.g., `@/lib/supabase`, `@/stores/...`).
- Formatting: follow existing code style; rely on `pnpm lint` for enforcement.

## Testing Guidelines
- No test framework is configured yet.
- If you introduce tests, prefer co-locating files as `*.test.ts` or `*.test.tsx`
  near the code under test and document the chosen runner in this file.

## Commit & Pull Request Guidelines
- Git history is minimal (single initial commit), so no established convention.
- Recommended commit format: short, imperative summaries (e.g., `Add supabase hook`).
- PRs should include:
  - Clear summary of changes and rationale.
  - Testing performed (commands + results).
  - Screenshots or recordings for UI changes.
  - Linked issues if applicable.

## Configuration & Environment
- Copy `.env.example` to `.env.local` and set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase access should go through `lib/supabase/useSupabase.ts`.
