# Day 27 release candidate

**Decision: hold production onboarding.** The candidate app can be deployed independently of the database, but production has only the first migration recorded. The production backup and isolated restore evidence from [Day 26](day-twenty-six.md) is still pending.

## Production smoke results

Tested the deployment from `3ef36a9` on the [production origin](https://jarvis-three-olive.vercel.app).

| Check | Result |
| --- | --- |
| HTTPS liveness | `GET /healthz` returned 200 and `{"status":"ok"}`. |
| Public landing and account pages | `GET /` and `GET /account` returned 200. |
| Anonymous access | `GET /api/me`, `GET /api/resources`, `POST /api/chat`, `POST /api/invitations`, and `POST /api/study-plans/{id}/schedule` each returned 401. |
| Authenticated production acceptance | Pending schema reconciliation, production configuration, and approved test accounts. |

## Steps to accept the candidate

1. Close the Day 26 backup and isolated restore gate. Confirm the production Supabase target and reconcile its migration history with the candidate commit. Verify the deployment's environment settings and the production email sender and callbacks.
2. Create a separate synthetic judge group and an offering assigned to that group. Use labeled sample timetable entries, assignments, and PDFs. Create separate judge demo accounts and assign only that offering. Verify they cannot read pilot materials and pilot accounts cannot read judge materials. Share credentials privately after verification.
3. Load UFAR records only after written approval for the exact roster, timetable, and course materials. Keep those records separate from the judge demo group.
4. On the production hostname, verify invitation delivery and activation, sign in as a demo student, receive a live chat reply, confirm a study plan and see it on the calendar, and open an authorized course PDF. Verify as a demo lecturer that assigned course materials can be published. Verify denied access as an unrelated student and as a disabled account. Record each result and the tested deployment SHA.
