-- Minimal stand-in for the Supabase-managed auth/storage objects so migrations and role tests run on plain PostgreSQL.
-- Only for disposable local or CI databases. Never run this against a real Supabase project.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create extension if not exists pgcrypto;
create schema if not exists extensions; create extension if not exists "uuid-ossp" with schema extensions;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text,
  email_confirmed_at timestamptz, invited_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
create function auth.jwt() returns jsonb language sql stable as $f$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), jsonb_build_object('sub', nullif(current_setting('request.jwt.claim.sub', true), ''))::text)::jsonb $f$;
create function auth.uid() returns uuid language sql stable as $f$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $f$;
create function auth.role() returns text language sql stable as $f$ select coalesce(auth.jwt()->>'role', current_user) $f$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Storage tables referenced by the course PDF migration.
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
