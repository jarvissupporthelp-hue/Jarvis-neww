# Day 1 scope and deployment

## Competition release

Ship one UFAR group and one or two courses. The landing page is public over HTTPS and the workspace is invite-only. Give judges accounts in an isolated demo group with labeled sample data.

- Students can view their timetable and courses, manage tasks and events, use academic chat, confirm and rebalance study plans, and track progress with quizzes.
- Lecturers can view their assigned classes and publish course materials, assignment briefs, and deadlines.
- Admins can manage invitations, users, groups, enrollments, courses, and timetables.
- Learning tools include private course PDFs with citations for supported documents, a resource list, and a basic focus timer.

Defer submissions, grading, LMS integration, advanced analytics, push reminders, cross-chat memory, and games.

## Environments

| Environment | App | Database | Data |
| --- | --- | --- | --- |
| Staging | Vercel preview | Dedicated Supabase staging project | Synthetic records |
| Production | Vercel deployment from main | Dedicated Supabase production project | Approved pilot records and isolated judge data |

1. Import the repository into Vercel as a Next.js app with Node.js 24 and use main as the production branch.
2. Set each environment's Supabase URL and publishable key using the names in `.env.example`. Keep database credentials and privileged keys out of source control.
3. Disable public signups in each hosted Supabase Auth project. Local Auth configuration lives in `supabase/config.toml`.
4. Authenticate the Supabase CLI, then run `supabase link --project-ref <staging-ref>` and `supabase db push --linked`. Verify with `supabase migration list --linked`. Verify the staging migration before applying it to production and check which project is linked before each push.
5. Open the staging URL and verify `GET /healthz` returns HTTP 200.

## Pending external decisions

- **UFAR data approval.** Confirm the university contact who can approve use of the roster, timetable, and course materials. Use synthetic records until approval.
- **Invitation email.** Confirm a project-controlled sender address and verified domain before onboarding. Use university branding only with authorization.
