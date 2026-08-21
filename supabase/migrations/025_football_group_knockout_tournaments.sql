do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.football_tournaments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%format%'
  loop
    execute format(
      'alter table public.football_tournaments drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.football_tournaments
add constraint football_tournaments_format_check
check (format in ('league', 'knockout', 'group_knockout'));

alter table public.football_tournaments
add constraint football_tournaments_format_start_stage_check
check (
  (format in ('league', 'group_knockout') and start_stage is null)
  or (format = 'knockout' and start_stage is not null)
);

create or replace function public.create_football_tournament_atomic(
  p_tournament_id uuid,
  p_event_id uuid,
  p_name text,
  p_format text,
  p_start_stage text,
  p_team_ids uuid[],
  p_fixtures jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_expected_teams integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required';
  end if;
  if not public.is_event_admin(p_event_id) then
    raise exception 'You do not have access to manage this tournament';
  end if;
  if not exists (
    select 1 from public.events where id = p_event_id and sport = 'football'
  ) then
    raise exception 'Football tournament not found';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Tournament name is required';
  end if;
  if p_format not in ('league', 'knockout', 'group_knockout') then
    raise exception 'Choose a tournament type';
  end if;
  if cardinality(p_team_ids) < 2
    or cardinality(p_team_ids) <> (
      select count(distinct selected.team_id)
      from unnest(p_team_ids) as selected(team_id)
    ) then
    raise exception 'Choose at least two different teams';
  end if;
  if (
    select count(*)
    from public.teams
    where event_id = p_event_id and id = any(p_team_ids)
  ) <> cardinality(p_team_ids) then
    raise exception 'One or more teams are invalid';
  end if;

  if p_format = 'knockout' then
    v_expected_teams := case p_start_stage
      when 'quarter_final' then 8
      when 'semi_final' then 4
      when 'final' then 2
      else null
    end;
    if v_expected_teams is null or cardinality(p_team_ids) <> v_expected_teams then
      raise exception 'The selected knockout round has the wrong number of teams';
    end if;
  elsif p_format = 'group_knockout' then
    if cardinality(p_team_ids) < 4 then
      raise exception 'Groups + knockout needs at least 4 teams';
    end if;
    if p_start_stage is not null then
      raise exception 'Groups + knockout tournaments cannot have an opening knockout round';
    end if;
  elsif p_start_stage is not null then
    raise exception 'League tournaments cannot have an opening knockout round';
  end if;

  if exists (select 1 from public.football_tournaments where id = p_tournament_id) then
    if exists (
      select 1
      from public.football_tournaments
      where id = p_tournament_id
        and event_id = p_event_id
        and created_by = v_actor_id
    ) then
      return p_tournament_id;
    end if;
    raise exception 'Tournament creation ID has already been used';
  end if;

  insert into public.football_tournaments (
    id, event_id, name, format, start_stage, created_by
  ) values (
    p_tournament_id,
    p_event_id,
    trim(p_name),
    p_format,
    case when p_format = 'knockout' then p_start_stage else null end,
    v_actor_id
  );

  insert into public.football_tournament_teams (tournament_id, team_id, seed)
  select p_tournament_id, team_id, seed::integer
  from unnest(p_team_ids) with ordinality as selected(team_id, seed);

  insert into public.football_matches (
    id,
    tournament_id,
    event_id,
    home_team_id,
    away_team_id,
    stage,
    round_number,
    position,
    next_match_id,
    next_match_slot
  )
  select
    fixture.id,
    p_tournament_id,
    p_event_id,
    fixture.home_team_id,
    fixture.away_team_id,
    fixture.stage,
    fixture.round_number,
    fixture.position,
    fixture.next_match_id,
    fixture.next_match_slot
  from jsonb_to_recordset(p_fixtures) as fixture(
    id uuid,
    home_team_id uuid,
    away_team_id uuid,
    stage text,
    round_number integer,
    position integer,
    next_match_id uuid,
    next_match_slot text
  );

  if not exists (
    select 1 from public.football_matches where tournament_id = p_tournament_id
  ) then
    raise exception 'Tournament fixtures are required';
  end if;

  return p_tournament_id;
end;
$$;

create or replace function public.seed_group_knockout_football_semis(
  p_tournament_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a_winner uuid;
  v_a_runner_up uuid;
  v_b_winner uuid;
  v_b_runner_up uuid;
  v_expected_group_matches integer;
  v_group_a_size integer;
  v_group_b_size integer;
  v_team_count integer;
begin
  if not exists (
    select 1
    from public.football_tournaments
    where id = p_tournament_id and format = 'group_knockout'
  ) then
    return;
  end if;

  select count(*)
  into v_team_count
  from public.football_tournament_teams
  where tournament_id = p_tournament_id;

  if v_team_count < 4 then
    return;
  end if;

  v_group_a_size := ceil(v_team_count::numeric / 2)::integer;
  v_group_b_size := v_team_count - v_group_a_size;
  v_expected_group_matches :=
    (v_group_a_size * (v_group_a_size - 1) / 2)
    + (v_group_b_size * (v_group_b_size - 1) / 2);

  if (
    select count(*)
    from public.football_matches matches
    join public.football_tournament_teams home_seed
      on home_seed.tournament_id = matches.tournament_id
      and home_seed.team_id = matches.home_team_id
    join public.football_tournament_teams away_seed
      on away_seed.tournament_id = matches.tournament_id
      and away_seed.team_id = matches.away_team_id
    where matches.tournament_id = p_tournament_id
      and matches.stage = 'league'
      and matches.status = 'full_time'
      and (
        (
          home_seed.seed <= v_group_a_size
          and away_seed.seed <= v_group_a_size
        )
        or (
          home_seed.seed > v_group_a_size
          and away_seed.seed > v_group_a_size
        )
      )
  ) < v_expected_group_matches then
    return;
  end if;

  with seeded_teams as (
    select
      team_id,
      seed,
      case when seed <= v_group_a_size then 'A' else 'B' end as group_code
    from public.football_tournament_teams
    where tournament_id = p_tournament_id
  ),
  standings as (
    select
      seeded_teams.team_id,
      seeded_teams.seed,
      seeded_teams.group_code,
      coalesce(sum(
        case
          when matches.home_team_id = seeded_teams.team_id
            and matches.home_score > matches.away_score then 3
          when matches.away_team_id = seeded_teams.team_id
            and matches.away_score > matches.home_score then 3
          when matches.home_score = matches.away_score then 1
          else 0
        end
      ), 0) as points,
      coalesce(sum(
        case
          when matches.home_team_id = seeded_teams.team_id
            then matches.home_score - matches.away_score
          when matches.away_team_id = seeded_teams.team_id
            then matches.away_score - matches.home_score
          else 0
        end
      ), 0) as goal_difference,
      coalesce(sum(
        case
          when matches.home_team_id = seeded_teams.team_id then matches.home_score
          when matches.away_team_id = seeded_teams.team_id then matches.away_score
          else 0
        end
      ), 0) as goals_for
    from seeded_teams
    left join public.football_matches matches
      on matches.tournament_id = p_tournament_id
      and matches.stage = 'league'
      and matches.status = 'full_time'
      and (
        matches.home_team_id = seeded_teams.team_id
        or matches.away_team_id = seeded_teams.team_id
      )
    left join seeded_teams opponent
      on opponent.team_id = case
        when matches.home_team_id = seeded_teams.team_id then matches.away_team_id
        else matches.home_team_id
      end
      and opponent.group_code = seeded_teams.group_code
    where matches.id is null or opponent.team_id is not null
    group by seeded_teams.team_id, seeded_teams.seed, seeded_teams.group_code
  ),
  ranked as (
    select
      *,
      row_number() over (
        partition by group_code
        order by points desc, goal_difference desc, goals_for desc, seed asc
      ) as group_rank
    from standings
  )
  select
    max(team_id) filter (where group_code = 'A' and group_rank = 1),
    max(team_id) filter (where group_code = 'A' and group_rank = 2),
    max(team_id) filter (where group_code = 'B' and group_rank = 1),
    max(team_id) filter (where group_code = 'B' and group_rank = 2)
  into v_a_winner, v_a_runner_up, v_b_winner, v_b_runner_up
  from ranked;

  update public.football_matches
  set home_team_id = v_a_winner, away_team_id = v_b_runner_up
  where tournament_id = p_tournament_id
    and stage = 'semi_final'
    and position = 1
    and status = 'scheduled';

  update public.football_matches
  set home_team_id = v_b_winner, away_team_id = v_a_runner_up
  where tournament_id = p_tournament_id
    and stage = 'semi_final'
    and position = 2
    and status = 'scheduled';
end;
$$;

create or replace function public.handle_group_knockout_football_progression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'full_time'
    and old.status is distinct from new.status
    and new.stage in ('semi_final', 'final')
    and new.home_score = new.away_score then
    raise exception 'Knockout matches need a winner before full-time';
  end if;

  if new.status = 'full_time'
    and old.status is distinct from new.status
    and new.stage = 'league' then
    perform public.seed_group_knockout_football_semis(new.tournament_id);
  end if;

  return new;
end;
$$;

drop trigger if exists football_matches_group_knockout_progression
on public.football_matches;

create trigger football_matches_group_knockout_progression
after update of status on public.football_matches
for each row execute function public.handle_group_knockout_football_progression();
