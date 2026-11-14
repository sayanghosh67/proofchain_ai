-- Apply after the two existing drizzle migrations in Supabase SQL Editor.
-- No credentials belong in this file.
begin;
create table if not exists public.milestones (
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check (length(title) between 1 and 200),
 acceptance_criteria text not null, weight numeric not null check (weight > 0 and weight <= 100),
 claimed_progress numeric not null default 0 check (claimed_progress between 0 and 100),
 evidence_ids uuid[] not null default '{}', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Upgrade older milestone tables without replacing their records.
alter table public.milestones add column if not exists claimed_progress numeric not null default 0 check (claimed_progress between 0 and 100);
alter table public.milestones add column if not exists evidence_ids uuid[] not null default '{}';
alter table public.milestones add column if not exists updated_at timestamptz not null default now();
create table if not exists public.evidence_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 project_id uuid not null references public.projects(id) on delete cascade,
 milestone_id uuid not null references public.milestones(id) on delete cascade,
 model text not null, result jsonb not null, input_snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create table if not exists public.investigator_messages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null,
 project_id uuid not null references public.projects(id) on delete cascade,
 question text not null, answer text not null, evidence_ids uuid[] not null default '{}',
 model text not null, created_at timestamptz not null default now()
);
alter table public.evidence add column if not exists sha256 text;
create unique index if not exists evidence_content_hash on public.evidence(project_id, sha256) where sha256 is not null;
create index if not exists milestone_project on public.milestones(project_id);
create index if not exists review_project on public.evidence_reviews(project_id, created_at desc);
create index if not exists investigator_project on public.investigator_messages(project_id, created_at);

do $$ declare t text; begin
 foreach t in array array['milestones','evidence_reviews','investigator_messages'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('drop policy if exists "owned project records" on public.%I', t);
  execute format('create policy "owned project records" on public.%I for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t);
 end loop;
 -- Prevent a user attaching their own child row to someone else's project.
 foreach t in array array['evidence','audit_runs','claims','test_results','findings','fix_proposals'] loop
  execute format('drop policy if exists "parent project ownership" on public.%I', t);
  execute format('create policy "parent project ownership" on public.%I as restrictive for all to authenticated using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())) with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t);
 end loop;
end $$;
-- Existing permissive policies must not bypass parent-project ownership.
do $$ declare t text; begin
 foreach t in array array['milestones','evidence_reviews','investigator_messages'] loop
  execute format('drop policy if exists "product parent scope" on public.%I', t);
  execute format('create policy "product parent scope" on public.%I as restrictive for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))', t);
 end loop;
end $$;
drop policy if exists "owned audit parent" on public.tool_calls;
create policy "owned audit parent" on public.tool_calls as restrictive for all to authenticated
using (exists (select 1 from public.audit_runs r where r.id = audit_run_id and r.user_id = auth.uid()))
with check (exists (select 1 from public.audit_runs r where r.id = audit_run_id and r.user_id = auth.uid()));
create table if not exists public.ai_rate_limits (user_id uuid primary key, window_start timestamptz not null, requests integer not null);
alter table public.ai_rate_limits enable row level security;
create or replace function public.proofchain_consume_ai_budget() returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 insert into public.ai_rate_limits values (auth.uid(), now(), 1)
 on conflict (user_id) do update set
 requests = case when ai_rate_limits.window_start < now() - interval '1 minute' then 1 else ai_rate_limits.requests + 1 end,
 window_start = case when ai_rate_limits.window_start < now() - interval '1 minute' then now() else ai_rate_limits.window_start end
 returning requests into n;
 return n <= 30;
end $$;
revoke all on function public.proofchain_consume_ai_budget() from public;
grant execute on function public.proofchain_consume_ai_budget() to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 10485760, null)
on conflict (id) do update set public = false, file_size_limit = 10485760;
commit;
