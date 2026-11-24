<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

TechCart: a multi-seller marketplace for new, refurbished and used electronics.
Next.js 16 (App Router, Server Actions in `src/lib/actions.ts`), Prisma 7 on
SQLite (`prisma/schema.prisma`, client generated to `src/generated/prisma`),
Tailwind v4, Vitest. Money is stored as integer minor units (`src/lib/money.ts`).

## Setup (fresh checkout or worktree)

```bash
npm ci
npx prisma generate
printf 'DATABASE_URL="file:./dev.db"\nSESSION_SECRET="dev-secret-change-me"\n' > .env   # if .env is missing
npx prisma migrate deploy
npm run db:seed
```

`.env` is gitignored. `SESSION_SECRET` is required at runtime (sessions are
HMAC-signed cookies). The SQLite file lives at the repo root and is gitignored.

## Dev server

```bash
npm run dev -- --port <port>
```

## Validation

These are exactly what `factory/checks.sh` runs:

```bash
npm ci
npx prisma generate
npm run lint
npx next typegen   # generates the PageProps/LayoutProps globals typecheck needs
npm run typecheck
npm test
npm run build
```

## Software factory

`/factory run` builds every open request queued through the factory's REST API
(`factory/bin/serve`, `POST /jobs`) via
intake → spec → build → gate → review → approve, one PR per request. State is in
`factory/jobs/` and `factory/requests/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory && python3 -m http.server`, then
open http://localhost:8000/dashboard.html.

Each job works in its own git worktree, a full checkout of the repo at
`.worktrees/<job-id>` (gitignored). A tool run from the repo root that doesn't
read `.gitignore` sees those copies too; exclude `.worktrees/` in its config.
`tsconfig.json` and `eslint.config.mjs` already exclude it.
