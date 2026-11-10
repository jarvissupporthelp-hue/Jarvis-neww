# Day 28 public access and pilot opening

## Verified

On the production deployment from `96084ae`, a signed-out visitor could open the [public landing page](https://jarvis-three-olive.vercel.app/) and follow **Sign in to JARVIS** to the account form. At a simulated 390 × 844 phone viewport, both pages fit without horizontal scrolling. The account form showed sign-in and password reset controls, and the landing page described access as invitation-only.

## Pending launch acceptance

| Check | Status |
| --- | --- |
| Public landing page and sign-in navigation | Passed in a signed-out browser |
| Phone-width layout | Passed at a simulated 390 px |
| Independent visitor in a private browser over mobile data | Pending physical-device test |
| Student receives an invitation, activates, and completes the core workflow externally | Pending production acceptance |

Production pilot onboarding remains on hold until the [Day 26 readiness checks](day-twenty-six.md) and [Day 27 authenticated checks](day-twenty-seven.md) are complete.

After production is ready, have an independent visitor turn off Wi-Fi and open the public URL in a private browser on a physical phone. Have a designated invited student open the email on that network, activate the account, sign in, find their next class, save and confirm a study plan, and verify its sessions on the calendar. Record the tested deployment, device, network, and outcomes without retaining credentials or invitation links.
