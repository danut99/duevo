-- Vehicles belong to a wallet; existing documents remain unassigned.
begin;
create table if not exists public.vehicles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null,
 plate text not null check(char_length(btrim(plate)) between 1 and 30),
 name text not null default '' check(char_length(name)<=60),
 created_at timestamptz not null default now(),
 unique(id,profile_id,user_id),unique(profile_id,plate),
 foreign key(profile_id,user_id) references public.wallet_profiles(id,user_id)
);
alter table public.vehicles enable row level security;
revoke all on public.vehicles from anon,authenticated;
grant select,insert on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
drop policy if exists own_vehicles on public.vehicles;
create policy own_vehicles on public.vehicles for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.documents add column if not exists vehicle_id uuid;
alter table public.documents drop constraint if exists documents_vehicle_wallet;
alter table public.documents add constraint documents_vehicle_wallet
 foreign key(vehicle_id,profile_id,user_id) references public.vehicles(id,profile_id,user_id);
alter table public.documents drop constraint if exists documents_vehicle_category;
alter table public.documents add constraint documents_vehicle_category check(vehicle_id is null or category='Vehicles');
create index if not exists documents_vehicle_expiry on public.documents(vehicle_id,expires);
commit;
