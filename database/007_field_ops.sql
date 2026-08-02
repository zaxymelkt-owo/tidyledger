-- Field ops: photos, GPS check-in/out, digital signatures
-- Also creates a public Storage bucket "job-media" (run storage policies in SQL editor)

-- ─────────────────────────────────────────────
-- JOB PHOTOS
-- ─────────────────────────────────────────────
create table if not exists job_photos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  job_id        uuid not null references jobs(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  taken_at      timestamptz not null default now(),
  lat           double precision,
  lng           double precision,
  uploaded_by   text
);

create index if not exists job_photos_job_id_idx on job_photos (job_id);

-- ─────────────────────────────────────────────
-- GPS CHECK-IN / CHECK-OUT
-- ─────────────────────────────────────────────
create table if not exists job_checkins (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  job_id          uuid not null references jobs(id) on delete cascade,
  employee_name   text,
  kind            text not null check (kind in ('check_in','check_out')),
  lat             double precision not null,
  lng             double precision not null,
  accuracy_m      double precision,
  noted_at        timestamptz not null default now()
);

create index if not exists job_checkins_job_id_idx on job_checkins (job_id);

-- ─────────────────────────────────────────────
-- DIGITAL SIGNATURES
-- ─────────────────────────────────────────────
create table if not exists job_signatures (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  job_id          uuid not null references jobs(id) on delete cascade,
  signer_name     text not null,
  signer_role     text not null default 'customer'
                    check (signer_role in ('customer','employee','manager')),
  storage_path    text not null,
  signed_at       timestamptz not null default now(),
  lat             double precision,
  lng             double precision
);

create index if not exists job_signatures_job_id_idx on job_signatures (job_id);

-- Optional columns on jobs for quick field status
alter table jobs
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz,
  add column if not exists signature_captured boolean not null default false;

-- RLS
alter table job_photos enable row level security;
alter table job_checkins enable row level security;
alter table job_signatures enable row level security;

drop policy if exists "Authenticated manage job_photos" on job_photos;
create policy "Authenticated manage job_photos"
  on job_photos for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage job_checkins" on job_checkins;
create policy "Authenticated manage job_checkins"
  on job_checkins for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage job_signatures" on job_signatures;
create policy "Authenticated manage job_signatures"
  on job_signatures for all to authenticated using (true) with check (true);

-- Storage bucket (idempotent via insert ignore pattern)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-media',
  'job-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated upload job media" on storage.objects;
create policy "Authenticated upload job media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'job-media');

drop policy if exists "Authenticated update job media" on storage.objects;
create policy "Authenticated update job media"
  on storage.objects for update to authenticated
  using (bucket_id = 'job-media');

drop policy if exists "Authenticated delete job media" on storage.objects;
create policy "Authenticated delete job media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'job-media');

drop policy if exists "Public read job media" on storage.objects;
create policy "Public read job media"
  on storage.objects for select to public
  using (bucket_id = 'job-media');
