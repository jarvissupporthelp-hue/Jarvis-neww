# Day 30 competition handoff

**Release decision:** The public landing and sign-in pages are live. Authenticated production release acceptance is on hold. Production Supabase records 1 of the 22 migrations verified in staging.

## Final checks

| Check | Result |
| --- | --- |
| Production deployment `523ba8a` | Vercel reported Ready. |
| Public URL | HTTPS health check passed. Landing and account returned 200. Anonymous identity request returned 401. |
| Student | Pending production sign-in, next class, course PDF, saved chat, and confirmed plan reopening. |
| Lecturer | Pending production sign-in, assigned-course access, and assignment or PDF publication. |
| Admin | Pending production sign-in, invitation delivery and activation, and role and group checks. |
| Recovery | All 14 local tests passed, including simulated email, AI, and PDF failures. A live competition recovery rehearsal and isolated backup restore are pending. |

## Two-minute pitch walkthrough

- **0:00–0:25 · The student problem.** “Students have a timetable, course materials, and exam deadlines, but deciding what to study next still takes work. JARVIS brings those inputs together in one workspace.”
- **0:25–1:10 · Student demo.** Show the next class, ask a question against a course PDF, and point out the page citation. Confirm a study plan around the timetable and show its sessions on the calendar.
- **1:10–1:40 · Lecturer and admin.** Show how an assigned lecturer publishes a deadline, then show the student calendar. Explain that an admin controls invitations and course assignments.
- **1:40–2:00 · Close.** “The goal is to turn course material into an actionable study schedule that the student controls. Our public site is live and the staged workflows use synthetic course data. Production judge access is pending release verification.”

Use staging with pre-verified demo access for a walkthrough. If staging access is unavailable, show the public landing page and walk through the prepared demo sequence verbally. Identify any simulated steps during the pitch.

## Judge access

Start at the [public JARVIS URL](https://jarvis-three-olive.vercel.app/). Once the operator clears the release and provisions an isolated judge account, open the invitation email in a fresh browser session and activate it. Return to the same public URL to sign in and follow the [judge rehearsal checklist](day-twenty-nine.md). The operator shares any credentials privately.

## Operator checklist

1. Verify the backup and isolated restore, reconcile production migrations, and verify production secrets, callbacks, email, AI limits, and alert delivery. Use the [Day 26 runbook](day-twenty-six.md).
2. Provision a synthetic judge group. Run and record the student, lecturer, and admin workflows from the [Day 27 report](day-twenty-seven.md). Confirm the judge and pilot accounts cannot access each other's course data.
3. Rehearse the [Day 29 sequence](day-twenty-nine.md) in a fresh session, then reopen the saved work via the same public URL. Complete the [external phone check](day-twenty-eight.md).
4. Before the event, exercise the fallback using staging or a verbal walkthrough. For an email failure, verify configuration and retry the same approval. If live AI is unavailable, use cited course PDF search. If production is down, check liveness and the incident logs before selecting the fallback. Record which recovery steps worked.
