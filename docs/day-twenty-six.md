# Day 26 production readiness

## Verified baseline

- Vercel lists `jarvis-three-olive.vercel.app` as the verified production domain. Its HTTPS health endpoint returned HTTP 200 and `{"status":"ok"}`.
- Supabase has separate staging and production projects. At review, staging recorded 22 migrations and production recorded one. Keep onboarding closed until the production schema is reconciled.
- Ask JARVIS enforces 20 provider attempts per student per UTC day and a 15-second provider timeout. Verify live replies and configure a project-level spend limit separately.

## Release gates

| Area | Required evidence |
| --- | --- |
| Environment | Confirm production and preview each point to their own Supabase project. Check the publishable URL/key pair and server-only invitation key against the selected environment. Use [.env.example](../.env.example) for names and keep values out of logs. |
| Schema | Compare linked migration history to the release commit, secure a recoverable backup, review pending migrations, and verify the production application with isolated demo accounts after migration. Confirm the intended project before each write. |
| HTTPS and email | Verify the approved production hostname over HTTPS. Set the production `JARVIS_AUTH_ORIGIN` to that origin. Allow the exact invite and recovery callback URLs, verify the sender, and test delivery, activation and password reset with designated test recipients. |
| AI | Confirm Gateway credentials and billing, set a project spend limit and alert owner, and verify a hosted reply with a demo student. |
| Monitoring | Monitor the production health URL with a 10-second timeout and validate both HTTP 200 and the JSON status. Separately check an authenticated test account workflow so database or Auth failures are visible. |
| Backup | Record the actual backup schedule, retention, latest recoverable timestamp, and the operator responsible for restoring it. Verify recovery in an isolated target before onboarding. |

## Alert drill

Run `node scripts/check-health.mjs https://jarvis-three-olive.vercel.app`. It exits nonzero on timeout, redirects, HTTP errors, or unexpected response bodies. The endpoint measures app liveness. Use a separate authenticated smoke test for database readiness.

Create a disposable test check in the selected monitoring service and route its notifications to the designated operator. Start with a healthy test target. Switch that check to a controlled endpoint returning HTTP 503, then switch it back. Record the detection and notification times, delivery channel, and recovery time. Leave the production endpoint serving throughout the drill.

## Isolated restore drill

1. Identify an approved backup and record its timestamp. Use a separate Supabase project or an isolated local instance with no connection to live consumers. Keep outgoing email disabled on the restore target.
2. Verify source and target identifiers before restoring. Follow the appropriate [Supabase backup and restore procedure](https://supabase.com/docs/guides/platform/backups) for the backup type. Keep any downloaded backup encrypted and out of Git.
3. Check the expected migration history, representative course and timetable counts, and an authorized student's ability to read their course while an unrelated account is denied. Verify a representative PDF download where the backup includes one. Record the source timestamp, elapsed restore time and test outcomes.
4. Remove temporary copies and retire the restore target according to the approved retention policy.

**Open at handoff:** production schema reconciliation, secret and redirect verification, live mail and AI tests, external alert delivery, and isolated restore evidence. The Day 24 participant pilot also remains pending.
