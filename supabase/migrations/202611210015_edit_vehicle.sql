begin;
grant update(plate,name,vin) on public.vehicles to authenticated;
-- The existing owner RLS, plate uniqueness and VIN constraints still apply.
commit;
