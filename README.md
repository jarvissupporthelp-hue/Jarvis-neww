# JARVIS

JARVIS 2.0 is an academic workspace for the UFAR pilot. It uses the Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

Use Node.js 24. Run `npm ci` and `npm run dev`, then open http://localhost:3000.

Run `npm run lint`, `npm run typecheck`, and `npm run build` to reproduce the GitHub checks. The `/healthz` route checks whether the app responds. Verify the database separately.

See [Day 1 scope and deployment](docs/day-one.md).

## Daily progress

| Day | Work completed | Testing |
| --- | --- | --- |
| 1 | Next.js foundation, GitHub CI, Vercel staging and production, and separate Supabase databases. | [Staging landing page](https://jarvis-git-staging-jarvis-8637.vercel.app) |
| 2 | Academic and membership schema, plus a synthetic UFAR group and two course offerings in staging. | [Staging landing page](https://jarvis-git-staging-jarvis-8637.vercel.app) · [Database setup](docs/day-two.md) |
| 3 | Server-side role checks, protected identity endpoint, and staging database tests for student, lecturer, admin, disabled, and anonymous access. | [Protected identity preview](https://jarvis-hd8uu0v0d-jarvis-8637.vercel.app/api/me) |
| 4 | Account page, admin approvals and invitations, invite activation, sign-in, sign-out, and password reset. Email delivery and real-account sign-in still need staging verification. | See [Day 4 setup and test steps](docs/day-four.md). |
