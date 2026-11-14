create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text not null default '',
  requirements text not null default '',
  website_url text,
  github_url text,
  progress_report text not null default '',
  is_demo boolean not null default false,
  github_meta jsonb,
  created_at timestamptz not null default now()
);
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'file',
  title text not null,
  storage_path text,
  mime_type text,
  extracted_text text not null default '',
  source text not null default 'upload',
  created_at timestamptz not null default now()
);
create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'running',
  stage text not null default 'started',
  summary text,
  verdict text,
  readiness jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_run_id uuid references public.audit_runs(id) on delete cascade,
  text text not null,
  requirement text,
  verification_method text not null default 'evidence',
  test_type text,
  status text not null default 'not_tested',
  reason text not null default '',
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  audit_run_id uuid not null references public.audit_runs(id) on delete cascade,
  step int not null,
  tool text not null,
  args jsonb not null default '{}',
  result jsonb,
  status text not null default 'ok',
  duration_ms int,
  created_at timestamptz not null default now()
);
create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_run_id uuid references public.audit_runs(id) on delete cascade,
  test_type text not null,
  target text not null,
  passed boolean not null,
  details text not null default '',
  logs jsonb not null default '[]',
  is_retest boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_run_id uuid references public.audit_runs(id) on delete cascade,
  test_result_id uuid references public.test_results(id) on delete set null,
  title text not null,
  severity text not null default 'medium',
  repro_steps text not null default '',
  error_evidence text not null default '',
  hypotheses jsonb,
  status text not null default 'open',
  fixable boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.fix_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  finding_id uuid not null references public.findings(id) on delete cascade,
  file_path text not null,
  original_code text not null,
  patched_code text not null,
  explanation text not null default '',
  status text not null default 'proposed',
  applied boolean not null default false,
  retest_passed boolean,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index on public.projects(user_id);
create index on public.evidence(project_id);
create index on public.claims(project_id);
create index on public.audit_runs(project_id);
create index on public.tool_calls(audit_run_id);
create index on public.test_results(project_id);
create index on public.findings(project_id);
create index on public.fix_proposals(project_id);

do $$ declare t text; begin
  foreach t in array array['projects','evidence','audit_runs','claims','tool_calls','test_results','findings','fix_proposals'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

create policy "own evidence read" on storage.objects for select to authenticated using (bucket_id='evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own evidence write" on storage.objects for insert to authenticated with check (bucket_id='evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own evidence delete" on storage.objects for delete to authenticated using (bucket_id='evidence' and (storage.foldername(name))[1] = auth.uid()::text);