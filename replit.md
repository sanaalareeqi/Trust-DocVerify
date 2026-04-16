# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: Trust-DocVerify

A digital document signing and verification system for Arabic universities.

- **Frontend artifact**: `artifacts/trust-docverify` — React + Vite, Arabic RTL UI (Cairo font), previewPath `/`
- **Backend artifact**: `artifacts/api-server` — Express API with routes at `/api/documents`, `/api/users`, `/api/login`, `/api/notifications`
- **Database schema**: `lib/db/src/schema/index.ts` — tables: `users`, `documents`, `signatureLogs`, `notifications`
- **Pages**: Home, Login, Dashboard, RoleDashboard, Verify, Reports, CreateDocument, SignDocument, Settings, NotFound
- **Sample users**: admin/admin123, khalid/khalid123, sara/sara123, ahmed/ahmed123, fatima/fatima123, nasser/nasser123, ali/ali123
- **User roles**: Document-Creator, Graduate-Affairs, College-Registrar, Dean, General-Registrar, University-President, Accountant
- **Dependencies installed**: jspdf, jspdf-autotable, crypto-js, framer-motion, wouter, react-hook-form, recharts, radix-ui components
- **Hero image**: `attached_assets/generated_images/` (vite alias `@assets` → `../../attached_assets`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
