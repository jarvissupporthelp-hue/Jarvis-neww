# Day 29 judge rehearsal

**Status:** Production rehearsal is blocked. Production Supabase still records only the first migration, and the isolated judge group and first-time email activation remain pending. See the [release candidate checks](day-twenty-seven.md) and [pilot launch checks](day-twenty-eight.md).

## Verified before rehearsal

- The [public health endpoint](https://jarvis-three-olive.vercel.app/healthz) returned a healthy response.
- Vercel's production runtime log query returned no error or fatal groups for the queried 30-minute window. This check does not establish invitation delivery or AI usage.
- The local regression suite passed, including simulated invitation, AI, and PDF failure recovery.

## Judge rehearsal script

Start in a fresh private browser session on the [public JARVIS URL](https://jarvis-three-olive.vercel.app/). Use an invited judge account scoped to a synthetic judge group. Assign a separate pilot test identity for the isolation check.

| Step | Expected result | Evidence |
| --- | --- | --- |
| Receive and open the invitation | Email arrives and opens activation on the same public origin | Delivery time and callback outcome |
| Activate and sign in | Judge lands on a dashboard with the synthetic course and next class | Course, class time, and room |
| Open course materials | Judge can open the sample PDF and get a cited passage in Ask JARVIS | Document title and cited page |
| Ask a general study question | A hosted reply appears and the turn is saved | Reply status and matching gateway usage |
| Save and confirm a plan | Saved sessions appear on the calendar | Plan title and one confirmed session time |
| Sign out and start another private session | Same URL opens the saved chat and confirmed plan | Both records found after sign-in |
| Check course isolation | Judge cannot access the pilot course resource, and the pilot account cannot access the judge resource | Denial from each role-scoped session |

During the session, watch Vercel errors, invitation delivery and callback outcomes, and AI Gateway request usage. Record the deployment SHA, timestamps, and outcomes. Keep credentials, invitation URLs, and private records out of the report. For any blocker, record the failing step, fix the cause, and repeat that step and any dependent steps in a fresh session.
