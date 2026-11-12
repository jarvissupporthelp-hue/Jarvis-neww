# CI additions for the role tests

The token used for the Prisma 7 upgrade could not edit `.github/workflows/ci.yml`, so the two CI additions below are kept here.
Apply them with `git apply docs/ci-additions.patch` (or copy the lines by hand) using an account that may change workflows.

1. In the `build` job, after `npm run test:e2e`, run the role matrix: `npm run test:roles`.
2. Add a `database` job with a `postgres:16` service that runs `bash scripts/test-database.sh`
   (migrations, seed and all SQL role tests on a throwaway database).
