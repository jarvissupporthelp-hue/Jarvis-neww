# Day 2 academic foundation

Apply the migrations in order. Use `supabase db reset` against the local stack to verify a clean database, then run `supabase db push --linked` against the intended hosted project. The synthetic seed is separate from schema changes. To load it locally or into staging, execute the checked-in `supabase/seed.sql` through the staging SQL editor. The seed is idempotent. Never load the synthetic seed into the production database during this step.

The seed creates the demo IMA Year 2 group and two course offerings. It does not create Auth identities or store credentials. The first admin is assigned by verified Auth user ID after the invitation flow is ready. Day 3 adds application access policies, and Day 4 exercises sign-in and invitation activation.
