# JARVIS AI integration

## Roles and data paths

- `/api/me` reads the active membership and profile name from Supabase.
- Student chat loads only the caller's conversation, study context, editable memory, enrolled course professor guidance, and authorized course passages. It never reads lecturer-private notes or files.
- Lecturer AI requires an active lecturer assigned to the course. A lecturer chooses whether to include their own private notes and one private PDF per question. The request requires consent before selected excerpts are sent to the configured AI provider.
- Supabase RLS is the source of access control. Chroma is a retrieval index. Student retrieval first gets authorized resource IDs from Supabase and verifies every returned result against them.

## Configuration

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the matching staging or production database. Configure either Vercel AI Gateway or all three `FREE_LLM_*` variables in `.env.example` on the server. The free provider must implement OpenAI-compatible chat completions and return `usage.prompt_tokens` and `usage.completion_tokens` for exact token display; otherwise the sidebar labels token totals as partial.

The preview defaults to the zero-priced `nvidia/nemotron-3.5-lightning-free` Gateway model. Its provider may retain and use requests for model improvement. Both chat interfaces ask for consent; do not select lecturer private materials or include confidential student data unless the provider's data practices are acceptable. A private/self-hosted provider can be configured with `FREE_LLM_*` instead.

Optional semantic retrieval requires Chroma Cloud `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`, plus an OpenAI-compatible embeddings endpoint with `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY`, and `EMBEDDING_MODEL`. Use the same embedding model for indexing and querying. Without these settings, student PDF search uses the existing Supabase index. Uploading a new public course PDF indexes its pages in Supabase and attempts Chroma indexing when configured. Existing PDFs need the lecturer's Reindex action or a controlled backfill.

Apply the new migrations in filename order, `20261203000100` through `20261207000100`, to staging before previewing the branch. Verify migration history and the RLS policies there. Do not apply to production until the existing production migration gap has been reconciled.

Staging received the five SQL changes through the Supabase migration API on 2026-11-12. That API assigned history versions `20261112085004`, `20261112085023`, `20261112085029`, `20261112085036`, and `20261112085042` while the repository files use `20261203`–`20261207`. The schema is present, but the migration histories are not aligned. Reconcile them with the team's normal Supabase migration workflow before running `db push`, resetting a database, or merging. Do not replay the five SQL files on staging.

## Merge checks

1. Sign in as two students and one lecturer. `/api/me` returns the right name and role.
2. Each student can see only their own saved chats, memory, usage, and enrolled course PDFs. A student request to `/api/lecturer/private` or `/api/lecturer/assistant` returns 403. Direct Supabase reads of private lecturer tables return no rows.
3. A lecturer can save private notes, upload and download a private PDF, and ask a question using selected material. The student chat and course resource list cannot retrieve those private items.
4. Ask a student question grounded in an indexed PDF. Confirm the cited title and page, and confirm a non-enrolled PDF does not appear. Repeat with Chroma configured and with fallback search.
5. Check the sidebar before and after an AI request. The 20-attempt daily quota decrements once, reported token totals advance if the provider returns usage, and PDF-only search does not use quota. Confirm the midnight UTC reset.
6. Confirm draft preservation after AI failure and rejected requests. Confirm lecturer and student AI notices describe which data reaches the configured provider.

The lecturer AI currently returns a response without saving lecturer chat history. Student memory is explicitly editable; it is not silently inferred from conversations.
