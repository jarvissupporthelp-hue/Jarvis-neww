# Day 4 invitation and account setup

Apply the invitation migration to staging. Keep Supabase public and anonymous sign-ups disabled.

Set `JARVIS_AUTH_ORIGIN` to the stable staging deployment origin and set `SUPABASE_SECRET_KEY` as a server-only Vercel environment variable. In Supabase Auth URL Configuration, allow the exact staging `/account?flow=invite` and `/account?flow=recovery` URLs. Configure the approved SMTP sender before testing delivery to recipients outside the Supabase team.

To bootstrap the first admin, have a project operator add an `admin` approval for the designated email in `public.account_invitations`. Send that account an invite from the Supabase dashboard after setting the Auth Site URL to the staging `/account?flow=invite` URL. The first admin must complete activation through the invitation link. The app can invite students and lecturers once an active admin signs in.

On `/account`, test that the admin can approve and invite, a recipient can set a password and sign in, and a student cannot call the invitation endpoint. Also test an expired or used link, an invitation retry, sign-out, password reset, and sign-in after reset. Do not put real email addresses, credentials, or invite links in Git.
