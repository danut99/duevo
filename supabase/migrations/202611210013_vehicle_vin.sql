-- Optional chassis number, preserving existing vehicles.
begin;
alter table public.vehicles add column if not exists vin text;
alter table public.vehicles drop constraint if exists vehicles_vin_valid;
alter table public.vehicles add constraint vehicles_vin_valid check(vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$');
commit;
