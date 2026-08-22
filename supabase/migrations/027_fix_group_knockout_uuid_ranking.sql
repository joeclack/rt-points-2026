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
    (select team_id from ranked where group_code = 'A' and group_rank = 1),
    (select team_id from ranked where group_code = 'A' and group_rank = 2),
    (select team_id from ranked where group_code = 'B' and group_rank = 1),
    (select team_id from ranked where group_code = 'B' and group_rank = 2)
  into v_a_winner, v_a_runner_up, v_b_winner, v_b_runner_up;

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
