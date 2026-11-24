#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. Keep it fast, deterministic and non-interactive: no
# watch modes, no prompts, nothing that rewrites files.
set -euo pipefail

# A fresh worktree has no node_modules and no generated Prisma client (both gitignored).
npm ci --prefer-offline --no-audit --no-fund
npx prisma generate

npm run lint
npx next typegen  # PageProps/LayoutProps globals the typecheck needs
npm run typecheck
npm test
npm run build
