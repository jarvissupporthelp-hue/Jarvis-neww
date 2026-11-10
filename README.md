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
