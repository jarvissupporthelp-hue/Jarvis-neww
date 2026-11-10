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
| 5 | Admin workspace for account status, student groups, semesters, courses, course offerings, assignments, and audit history. | [Day 5 account and admin preview](https://jarvis-git-day-five-admin-workspace-jarvis-8637.vercel.app/account) · Admin sign-in requires an activated staging account. |
| 6 | Weekly timetable in Yerevan time, admin lesson editing, student and lecturer views, and room, lecturer, and group conflict checks. | [Day 6 timetable preview](https://jarvis-git-day-six-timetable-jarvis-8637.vercel.app/account) · Sign in with a staging account. |
| 7 | Responsive student dashboard with today’s classes, the next scheduled lesson, enrolled courses, and timetable shortcuts. | [Day 7 student dashboard preview](https://jarvis-git-day-seven-dashboard-jarvis-8637.vercel.app/account) · Use the staging student login. |
| 8 | Private student tasks, personal calendar events, and a weekly view with official classes and personal events labeled separately. | [Day 8 planner preview](https://jarvis-git-day-eight-planner-jarvis-8637.vercel.app/account) · Use the staging student login. |
| 9 | Ask JARVIS study assistant with a hosted model, a data-use notice, per-student daily quota, and draft-preserving error handling. | [Day 9 AI preview](https://jarvis-git-day-nine-oidc-jarvis-8637.vercel.app/account#study-assistant) · Use the staging student login. |
