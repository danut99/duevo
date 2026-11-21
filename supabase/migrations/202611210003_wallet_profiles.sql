-- One account owns several independent wallets. No separate logins or sharing grants.
begin;
create table if not exists public.wallet_profiles(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 40),is_default boolean not null default false,
 created_at timestamptz not null default now(),unique(id,user_id)
);
create unique index if not exists wallet_profiles_default on public.wallet_profiles(user_id) where is_default;
alter table public.wallet_profiles enable row level security;
revoke all on public.wallet_profiles from anon,authenticated;
grant select on public.wallet_profiles to authenticated;
grant insert(user_id,name) on public.wallet_profiles to authenticated;
grant update(name) on public.wallet_profiles to authenticated;
grant all on public.wallet_profiles to service_role;
drop policy if exists own_wallet_profiles on public.wallet_profiles;
create policy own_wallet_profiles on public.wallet_profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.ensure_wallet_profile() returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;owner_id uuid:=auth.uid();
begin
 if owner_id is null then raise exception 'Sign in required';end if;
 insert into public.wallet_profiles(user_id,name,is_default) values(owner_id,'Eu',true) on conflict(user_id) where is_default do nothing;
 select id into result from public.wallet_profiles where user_id=owner_id and is_default;return result;
end $$;
revoke all on function public.ensure_wallet_profile() from public,anon;
grant execute on function public.ensure_wallet_profile() to authenticated;
insert into public.wallet_profiles(user_id,name,is_default) select id,'Eu',true from auth.users on conflict(user_id) where is_default do nothing;
alter table public.documents add column if not exists profile_id uuid;
update public.documents d set profile_id=p.id from public.wallet_profiles p where d.user_id=p.user_id and p.is_default and d.profile_id is null;
alter table public.documents alter column profile_id set not null;
alter table public.documents drop constraint if exists documents_profile_owner;
alter table public.documents add constraint documents_profile_owner foreign key(profile_id,user_id) references public.wallet_profiles(id,user_id);
create index if not exists documents_wallet_expiry on public.documents(profile_id,expires);
create or replace function public.assign_wallet_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.profile_id is null then
  insert into public.wallet_profiles(user_id,name,is_default) values(new.user_id,'Eu',true) on conflict(user_id) where is_default do nothing;
  select id into new.profile_id from public.wallet_profiles where user_id=new.user_id and is_default;
 end if;
 if tg_op='UPDATE' and new.profile_id is distinct from old.profile_id then raise exception 'The document belongs to its original wallet';end if;
 return new;
end $$;
drop trigger if exists assign_wallet_profile on public.documents;
create trigger assign_wallet_profile before insert or update on public.documents for each row execute function public.assign_wallet_profile();
commit;
