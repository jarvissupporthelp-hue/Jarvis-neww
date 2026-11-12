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
| 10 | Dedicated Ask JARVIS page with private saved conversations, rename/delete controls, and recent-message context. | [Day 10 chat preview](https://jarvis-git-day-ten-conversations-jarvis-8637.vercel.app/chat) · Use the staging student login. Hosted replies still require gateway activation. |
| 11 | Student-scoped academic context for Ask JARVIS, a context preview, and a clarification when exam dates are unverified. | [Day 11 context preview](https://jarvis-git-day-eleven-study-context-jarvis-8637.vercel.app/chat) · Use the staging student login. Hosted AI replies still require gateway activation. |
| 12 | Dedicated Study Plans page with enrolled course selection, exam goals, topic confidence, availability, and previewable private drafts. | [Day 12 Study Plans preview](https://jarvis-git-day-twelve-study-plans-jarvis-8637.vercel.app/study-plans) · Use the staging student login. |
| 13 | Schedule previews for saved study plans with class and personal-event conflict checks, lower-confidence topics first, breaks, and a list of topics that do not fit. | [Day 13 scheduler preview](https://jarvis-git-day-thirteen-scheduler-jarvis-8637.vercel.app/study-plans) · Open a saved plan and generate a preview. |
| 14 | Exam-plan handoff from Ask JARVIS, explicit schedule confirmation, current-availability checks, and saved study sessions in the weekly calendar. | [Day 14 chat-to-plan preview](https://jarvis-git-day-fourteen-confirm-plans-jarvis-8637.vercel.app/chat) · Sign in and open **Plan for an exam**. |
| 15 | Mark confirmed study sessions complete, record topic confidence, and see saved progress in Study Plans, on the dashboard, and in the calendar. | [Day 15 progress preview](https://jarvis-git-day-fifteen-study-progress-jarvis-8637.vercel.app/study-plans) · Open a confirmed plan and view its sessions. |
| 16 | Preview and confirm changes to missed and upcoming unfinished study sessions, with a fresh conflict check and completed work preserved. | [Day 16 rebalance preview](https://jarvis-git-day-sixteen-rebalance-jarvis-8637.vercel.app/study-plans) · Open a confirmed plan and select **Preview rebalance**. |
| 17 | Short Computer Networks and Databases practice quizzes, answer explanations, topic feedback, and an editable study-plan draft or revised copy based on missed topics. | [Day 17 quiz preview](https://jarvis-git-day-seventeen-quizzes-jarvis-8637.vercel.app/quizzes) · Sign in as a staging student, take a quiz, and use the feedback in Study Plans. |
| 18 | Lecturer workspace with a teaching timetable and assigned course pages. Published assignment briefs and deadlines appear on enrolled students’ dashboards and weekly calendars. | [Day 18 lecturer preview](https://jarvis-git-day-eighteen-lecturer-jarvis-8637.vercel.app/lecturer) · Sign in with a staging lecturer account. |
| 19 | Private course PDF publishing for assigned lecturers, search by title or filename, and authenticated PDF access for enrolled students. | [Day 19 PDF library preview](https://jarvis-git-day-nineteen-course-pdfs-jarvis-8637.vercel.app/resources) · Sign in as a staging student. Lecturers publish from their assigned course page. |
| 20 | Page-level PDF text indexing with a status per document, plus course-scoped chat search with cited passages. PDFs without extractable text remain available to authorized readers. | [Day 20 Ask JARVIS preview](https://jarvis-git-day-twenty-pdf-search-jarvis-8637.vercel.app/chat) · Enable **Search course PDFs** and ask about IPv4 subnetting. |
| 21 | Pomodoro focus and break timers with pause, resume, reset, reload recovery, private completed-session history, and dashboard shortcuts for focus and unfinished plans. | [Day 21 Pomodoro preview](https://jarvis-git-day-twenty-one-focus-jarvis-8637.vercel.app/focus) · Sign in as a staging student. |
| 22 | Direct authorization checks for course and PDF access, private chats and study plans, and disabled accounts. Tested an instruction-bearing PDF as a cited quotation and aligned PDF indexing errors for missing and out-of-scope documents. | [Day 22 Ask JARVIS preview](https://jarvis-git-day-twenty-two-authorization-jarvis-8637.vercel.app/chat) · Sign in as the staging student and search course PDFs for **DAY22CANARY**. |
| 23 | Phone and desktop usability checks for account setup, chat, and study plans. Improved keyboard focus, password guidance, progress announcements, and retry controls. | [Day 23 student preview](https://jarvis-git-day-twenty-three-usability-jarvis-8637.vercel.app/account) · Sign in and try Ask JARVIS and Study Plans. |
| 24 | Prepared the UFAR pilot tasks, acceptance criteria, and blocker log for 3–5 students and one lecturer. Participant sessions and results are pending. | [Pilot runbook](docs/day-twenty-four.md) · [Staging account page](https://jarvis-git-day-twenty-three-usability-jarvis-8637.vercel.app/account) |
| 25 | Added simulated recovery tests for failed invitation delivery, AI responses, and PDF indexing. Clarified how to retry an invitation. Pilot feedback and live provider retests are pending. | Run `node --test tests/recovery.test.mjs` · [Staging account page](https://jarvis-git-day-twenty-five-recovery-jarvis-8637.vercel.app/account) |
| 26 | Audited production HTTPS and migration history, added a health probe, and documented launch, alert, and isolated restore checks. Production configuration and recovery drills are pending. | [Production readiness runbook](docs/day-twenty-six.md) · [Production liveness endpoint](https://jarvis-three-olive.vercel.app/healthz) |
| 27 | Recorded release-candidate smoke results. Public pages and anonymous access checks passed. Authenticated production acceptance and judge setup remain pending. | [Release candidate checks](docs/day-twenty-seven.md) · [Production account page](https://jarvis-three-olive.vercel.app/account) |
| 28 | Verified the public landing-to-sign-in flow in a signed-out browser at 390 px. Physical mobile-data and first-time invitation acceptance are pending. | [Public landing page](https://jarvis-three-olive.vercel.app/) · [Day 28 launch checks](docs/day-twenty-eight.md) |
| 29 | Verified production liveness, checked runtime errors, reran recovery tests, and prepared the judge rehearsal. The authenticated production rehearsal is blocked. | [Judge rehearsal](docs/day-twenty-nine.md) · [Public JARVIS URL](https://jarvis-three-olive.vercel.app/) |
| 30 | Rechecked the live public URL and local recovery suite. Prepared the competition pitch, judge access instructions, and operator checklist. Authenticated production acceptance remains on hold. | [Competition handoff](docs/day-thirty.md) · [Public JARVIS URL](https://jarvis-three-olive.vercel.app/) |

## Hackathon development

| Day | Work completed | Testing |
| --- | --- | --- |
| 1 | Armenian-default landing page with English switching. Removed hosted AI chat from the hackathon branch. Course PDF search and study planning remain available. | Open `/hy` and `/en` locally and follow the sign-in link. |
| Foundation | Added the shared Prisma model, role-aware dashboard, per-user language preferences, module registry, and in-app notifications. | Run `npm run test:e2e` against a running app. |

### Run the hackathon foundation locally

With Node 24, Docker, and the Supabase CLI installed:

1. Run `npm ci` and `supabase start`. On the first run Docker may need to download the local service images.
2. Copy `.env.example` to `.env`. Set the local Supabase API URL, publishable key and secret key from `supabase status`. Set `DATABASE_URL` to the local direct PostgreSQL URL with `?schema=foundation` and choose a private `JARVIS_DEMO_PASSWORD` of at least 12 characters.
3. Run `npm run db:migrate`, `npm run db:seed`, and `npm run dev`. Open `http://localhost:3000` and sign in as `jarvis-student@example.com`, `jarvis-staff@example.com`, or `jarvis-admin@example.com` using the configured demo password.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. With the app running, use `npm run test:e2e` for the HTTP smoke checks. The authenticated cases require the local demo seed and environment values.

The seed is restricted to local Supabase. Prisma migrations apply to the database selected in `DATABASE_URL`. Hosted previews need their own server-side connection with the foundation migration applied for saved preferences and notifications. See the [architecture note](docs/hackathon-foundation.md) for the module registry.

### Academics hackathon demo

Open the homepage and choose **Academics**. Use `student@example.com`, `lecturer@example.com`, `staff@example.com`, or `admin@example.com` with the public demo password `JarvisDemo2026`. Switch roles in the same browser tab to demonstrate draft publishing and assignment feedback. Demo changes live in that tab's session storage. The GPA calculator keeps hypothetical values only in memory.

The demo uses synthetic records and role-specific navigation. File submission records the selected filename. Management edits change demo lists. Production authentication, database persistence, file storage, and cross-device sharing for these new screens are separate integration work. Run `npm test` for the exact grading example and scheduling checks.

### Learning hackathon demo

Open **Learning** and choose a class date to start a quiz, flashcards, or focus session for a timetable subject. The six decks cover Mathematics for CS, Computer Networks 1, French, English, Algorithms, and Computer Architecture. Each contains twelve cards grouped by topic. Quiz mistakes can be retried separately.

Use Code Trace to predict JavaScript output and Pomodoro presets for quick review, problem solving, and coding sprints. Exam Plan still uses Academics exam dates and availability. Progress is stored in the current browser.
