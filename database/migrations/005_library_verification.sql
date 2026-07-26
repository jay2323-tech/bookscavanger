-- Library verification trust pack
-- Run in Supabase SQL editor after 004_onboarding_hardening.sql

alter table public.libraries
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists reject_reason text;

comment on column public.libraries.website is 'Official library website (required at application)';
comment on column public.libraries.phone is 'Public contact phone (required at application)';
comment on column public.libraries.reject_reason is 'Admin reason when rejected; cleared on approve/reapply';

-- Keep approve_librarian in sync: clear reject_reason on approve
create or replace function public.approve_librarian(p_library_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select supabase_user_id into v_user
  from public.libraries
  where id = p_library_id;

  if v_user is null then
    raise exception 'Library not found';
  end if;

  update public.libraries
  set approved = true,
      rejected = false,
      reject_reason = null
  where id = p_library_id;

  insert into public.profiles (id, role, approved)
  values (v_user, 'librarian', true)
  on conflict (id) do update
    set role = 'librarian',
        approved = true;
end;
$$;

revoke all on function public.approve_librarian(bigint) from public;
grant execute on function public.approve_librarian(bigint) to service_role;
