# JARVIS 2.0 — Arena + Academic Portal Integration Roadmap

Status: **Step 3 / 9 — Arena route and ten practice activities deployed to preview**.
Source packages: `jarvis-arena.zip` (10-game React/Vite Arena with Django/DRF backend); `jarvis-46xtjrfq-20261119.zip` (React/Vite + Hono/tRPC/Drizzle standalone academic portal). Base JARVIS branch: `main`, starting SHA `e73336497a05f88e638d8a83abd7a11eeb7e393c`.

## Rules and architectural decisions

- **Preserve existing JARVIS**: Next.js/React/TypeScript frontend and API, Supabase Auth/Postgres/RLS, Vercel deployment. Do not bolt on a second independently maintained login system or replace existing academic workflows.
- **Integrate relevant source features, not incompatible frameworks**: port Arena UI/game code into the existing website; adapt Arena persistence and verified progression to Supabase-backed authenticated APIs instead of starting a separate Django server. Map portal modules into existing JARVIS courses, materials, professor guidance, AI chat, progress and integration panels; do not create a second Hono/Drizzle/Neon database.
- **Strict tenancy/permissions**: active membership and server-side group/role checks; service credentials and model keys only in encrypted environment variables/secret stores; never commit credentials or expose them via `NEXT_PUBLIC_`.
- **Faithful scope**: demo academic catalogue is **illustrative**, not verified student records or official UFAR API data. Do not silently replace genuine data. Optional SIS/schedule sync only when an official authorized API is configured.
- **Honest XP**: Arena has 10 game implementations, but four currently advertise `verifiedSupported: true`. The other six must remain playable practice-only until we implement and test authoritative result validation. Do not issue competitive XP for unverified client claims.
- **Preview before production**: use integration branch + staging data. Do not migrate production or merge into `main` until staging tests and user review have passed.
- **Verification gate for every step**: identify changed routes/files, run relevant type/build/unit/integration tests, and record unresolved limitations. Final stage includes actual authenticated browser scenarios where credentials are available.

## Execution steps

1. **Source audit + integration plan** — inspect both ZIPs, compare GitHub architecture, create isolated branch and write this roadmap. (Done)
2. **Repair JARVIS baseline** — corrected incomplete root npm lockfile, isolated embedded Math Lab TypeScript compilation with its own installed dependencies, and verified lint/typechecks/unit/build/route-smoke. (**Done**)
3. **Arena UI + navigation** — integrated a native `/arena` quiz-style practice library with 10 original-catalogue subjects, responsive UI, question feedback, difficulty selection, optional audio, restart and local practice history; added `/arena/simulations` with ten adapted interactive simulation exercises (logic, projectile, matrices, sorting, chemistry, economics, ciphers, binary, integrals, atomic forge). Linked to existing JARVIS navigation. (**Done — practice prototypes, NOT the exact original full-fidelity game UIs**).
4. **Arena API + persistence** — Supabase schema/migrations/RLS for player profile, sessions, validated scores, achievements, missions, history, league and leaderboard. Implement anti-cheat server validation, idempotency, daily XP caps and Yerevan weekly resets. Keep unverified games explicitly practice-only, unless independently validated.
5. **Academic portal features** — compare the standalone portal's SIS/schedule, subject catalogue, course/material/topic management, professor-specific exam preparation, retrieval, progress and chat/history against current JARVIS. Integrate missing useful behavior into existing routes without duplicating authentication or databases. Clearly label demo data.
6. **Unified student/lecturer/admin journeys** — role/group boundaries, course-resource ownership, invite/activation workflow, timetable, personal planner, agent context and learning widgets. Confirm email/SIS/model provider configuration requirements and show truthful failure messages.
7. **Functional game QA** — test launch, input, scoring, completion, retry/reset, mobile controls, keyboard interactions and no-crash paths for **each of the 10 games**. Test practice vs verified results, history, profile, XP limits, achievement triggers, leaderboard queries and permissions.
8. **Whole-system quality and security** — full lint/typecheck/build, unit and integration checks, auth/authorization/RLS tests, regression of existing modules, failure modes, performance/accessibility/mobile review. Document any blocked external-provider tests.
9. **Staging deployment + walkthrough** — deploy the integrated branch to Vercel preview, confirm actual ready/healthy URL and working authenticated workflows, present link and tested feature checklist for user review; release to `main` only after approval.

## Initial evidence from source inspection

- Arena `src/components/games/GameRegistry.tsx` has 10 playable game component cases: logic-circuit-lab, orbital-ballistics-sim, matrix-transform-arena, algorithm-sort-duel, stoichiometry-balancer, equilibrium-market-sim, cipher-breaker-lab, binary-hex-bridge, calculus-integral-estimator, periodic-element-forge.
- Arena `src/services/djangoAdapter.ts` and `django_arena/` require a Django backend for ranked persistence. The frontend records unverified sessions as practice-only; verified game subset initially consists of logic-circuit-lab, matrix-transform-arena, algorithm-sort-duel and binary-hex-bridge.
- Standalone academic portal uses separate Hono/tRPC + Drizzle/Postgres + self-managed JWT/local/SSO. Source reference catalogue uses explicitly illustrative professor/exam facts. Do not treat as real university data.
- Current `main` GitHub CI run `43216741903` fails at `npm ci`, with missing optional dependency entries in the lockfile, before tests execute.
- Build-test status for these ZIPs in JARVIS: **not yet performed**. Inspection is not acceptance testing.
- Baseline verification on integration branch: CI run `44492616742` passed with **57/59 unit tests (2 skipped), 32/33 integration tests (1 skipped), zero failures**, lint, root TypeScript check, independent Math Lab TypeScript check, production build, and smoke routes all green. Vercel preview build `jarvis-53zvdso9t-jarvis-8637.vercel.app` was **READY** at commit `a6fd4c782deda1df81ad6cc62e4f462bbf690137`. Skipped tests remain unverified and will need environment-backed follow-up checks.
- Root `package-lock.json` was regenerated by a clean GitHub runner to restore optional platform dependencies. One-time repair workflow removed after use.

## Step 3 verification

- GitHub Actions CI `44502070986` passed lint, root and Math Lab typechecks, unit tests, build and route integration smoke tests after exposing both Arena modes.
- Preview `https://jarvis-8m5mwlqrm-jarvis-8637.vercel.app/arena` was `READY` at commit `18396b78e857184aa6bcc554738962663add7f97`.
- Interactive simulations: `/arena/simulations` (10 adapted activities with interactive controls, retry and success states); quiz challenges: `/arena` (10 catalogue topics with answer feedback, practice score local storage, no ranked XP).
- **Scope limit:** Original ZIP's full simulation interface details and Django rankings/leaderboards have NOT been imported. Step 4 addresses persistence and server-authoritative scoring; Step 7 still must perform browser interaction tests for every game, accessibility, mobile and reset behavior. Current automated tests verify catalogues, route rendering and build, not all manual gameplay flows.

## Definition of done

All 10 games launch/play/end/reset without errors; ranked results are computed and persisted only via authenticated, verified server logic; leaderboards/progress survive reload; academic/admin/auth workflows have passing regression tests; no leaked secrets; staging deployment shows `READY`; a reproducible test report lists any externally blocked integrations.
