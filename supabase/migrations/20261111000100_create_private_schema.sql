-- Keep internal database objects outside the API-exposed public schema.
create schema jarvis_private;
revoke all on schema jarvis_private from public, anon, authenticated;
