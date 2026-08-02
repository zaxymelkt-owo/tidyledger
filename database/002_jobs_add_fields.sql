-- Run this only if you already ran the original database/schema.sql
-- (i.e. your jobs table exists but is missing these two columns).
-- Safe to run multiple times.

alter table jobs add column if not exists assigned_employee text;
alter table jobs add column if not exists notes text;
