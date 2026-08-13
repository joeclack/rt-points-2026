do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_join_requests'
  ) then
    alter publication supabase_realtime
    add table public.team_join_requests;
  end if;
end
$$;
