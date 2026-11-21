-- Remove a vehicle while retaining its documents, files and reminders.
begin;
create or replace function public.delete_vehicle(vehicle_id_to_delete uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 perform 1 from public.vehicles where id=vehicle_id_to_delete and user_id=auth.uid() for update;
 if not found then raise exception 'Vehicle not found';end if;
 -- Saved export data may include the old plate/VIN; start preparation afresh.
 delete from public.renewal_packets p using public.documents d
 where p.document_id=d.id and d.vehicle_id=vehicle_id_to_delete and d.user_id=auth.uid();
 update public.documents set vehicle_id=null where vehicle_id=vehicle_id_to_delete and user_id=auth.uid();
 update public.vault_documents set vehicle_id=null where vehicle_id=vehicle_id_to_delete and user_id=auth.uid();
 delete from public.vehicles where id=vehicle_id_to_delete and user_id=auth.uid();
end $$;
revoke all on function public.delete_vehicle(uuid) from public,anon;
grant execute on function public.delete_vehicle(uuid) to authenticated;
commit;
