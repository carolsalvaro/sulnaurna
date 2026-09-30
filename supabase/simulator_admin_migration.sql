-- Sul na Urna — Urna Simulada / painel administrativo
-- Migração segura e idempotente. Não apaga nem altera candidatos, matérias, banners ou correções.

create table if not exists public.simulator_settings (
  id boolean primary key default true check (id = true),
  choice_tracking_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.simulator_settings(id, choice_tracking_enabled)
values (true, true)
on conflict (id) do nothing;

create table if not exists public.simulator_metrics_daily (
  day date primary key,
  views bigint not null default 0,
  starts bigint not null default 0,
  completions bigint not null default 0,
  restarts bigint not null default 0,
  corrections bigint not null default 0,
  confirmed_votes bigint not null default 0,
  blank_votes bigint not null default 0,
  null_votes bigint not null default 0,
  legend_votes bigint not null default 0,
  federal_confirms bigint not null default 0,
  estadual_confirms bigint not null default 0,
  senador1_confirms bigint not null default 0,
  senador2_confirms bigint not null default 0,
  governador_confirms bigint not null default 0,
  presidente_confirms bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.simulator_candidate_daily (
  day date not null,
  candidate_id text not null,
  office text not null check (office in ('federal','estadual','senador','governador','presidente')),
  candidate_number text not null,
  candidate_name text not null,
  party text not null default '',
  confirmations bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, candidate_id)
);

alter table public.simulator_settings enable row level security;
alter table public.simulator_metrics_daily enable row level security;
alter table public.simulator_candidate_daily enable row level security;

-- Recria apenas as policies deste módulo para que o arquivo possa ser rodado novamente sem erro.
drop policy if exists "admins read simulator settings" on public.simulator_settings;
drop policy if exists "admins update simulator settings" on public.simulator_settings;
drop policy if exists "admins read simulator metrics" on public.simulator_metrics_daily;
drop policy if exists "admins read simulator candidate counts" on public.simulator_candidate_daily;

create policy "admins read simulator settings"
on public.simulator_settings for select to authenticated
using (public.is_sul_na_urna_admin());

create policy "admins update simulator settings"
on public.simulator_settings for update to authenticated
using (public.is_sul_na_urna_admin())
with check (public.is_sul_na_urna_admin());

create policy "admins read simulator metrics"
on public.simulator_metrics_daily for select to authenticated
using (public.is_sul_na_urna_admin());

create policy "admins read simulator candidate counts"
on public.simulator_candidate_daily for select to authenticated
using (public.is_sul_na_urna_admin());

create or replace function public.record_simulator_event(
  p_event text,
  p_step text default null,
  p_kind text default null,
  p_candidate_id text default null,
  p_candidate_number text default null,
  p_candidate_name text default null,
  p_party text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_track_choices boolean := true;
  v_office text;
begin
  if p_event is null or p_event not in ('view','start','complete','restart','correct','confirm') then
    return;
  end if;

  insert into public.simulator_metrics_daily(day)
  values (v_day)
  on conflict (day) do nothing;

  if p_event = 'view' then
    update public.simulator_metrics_daily set views = views + 1, updated_at = now() where day = v_day;
    return;
  elsif p_event = 'start' then
    update public.simulator_metrics_daily set starts = starts + 1, updated_at = now() where day = v_day;
    return;
  elsif p_event = 'complete' then
    update public.simulator_metrics_daily set completions = completions + 1, updated_at = now() where day = v_day;
    return;
  elsif p_event = 'restart' then
    update public.simulator_metrics_daily set restarts = restarts + 1, updated_at = now() where day = v_day;
    return;
  elsif p_event = 'correct' then
    update public.simulator_metrics_daily set corrections = corrections + 1, updated_at = now() where day = v_day;
    return;
  end if;

  -- Confirmação de um cargo.
  update public.simulator_metrics_daily
  set confirmed_votes = confirmed_votes + 1,
      blank_votes = blank_votes + case when p_kind = 'blank' then 1 else 0 end,
      null_votes = null_votes + case when p_kind = 'null' then 1 else 0 end,
      legend_votes = legend_votes + case when p_kind = 'legend' then 1 else 0 end,
      federal_confirms = federal_confirms + case when p_step = 'federal' then 1 else 0 end,
      estadual_confirms = estadual_confirms + case when p_step = 'estadual' then 1 else 0 end,
      senador1_confirms = senador1_confirms + case when p_step = 'senador1' then 1 else 0 end,
      senador2_confirms = senador2_confirms + case when p_step = 'senador2' then 1 else 0 end,
      governador_confirms = governador_confirms + case when p_step = 'governador' then 1 else 0 end,
      presidente_confirms = presidente_confirms + case when p_step = 'presidente' then 1 else 0 end,
      updated_at = now()
  where day = v_day;

  -- O banco guarda somente contagem agregada por candidato/dia.
  -- Não há sessão, IP, e-mail, cookie, sequência de cédula ou qualquer vínculo entre os seis votos.
  if p_kind = 'candidate'
     and nullif(trim(coalesce(p_candidate_id,'')), '') is not null
     and nullif(trim(coalesce(p_candidate_number,'')), '') is not null then

    select choice_tracking_enabled into v_track_choices
    from public.simulator_settings where id = true;

    if coalesce(v_track_choices, true) then
      v_office := case
        when p_step in ('senador1','senador2') then 'senador'
        when p_step in ('federal','estadual','governador','presidente') then p_step
        else null
      end;

      if v_office is not null then
        insert into public.simulator_candidate_daily(
          day, candidate_id, office, candidate_number, candidate_name, party, confirmations, updated_at
        ) values (
          v_day,
          left(trim(p_candidate_id),80),
          v_office,
          left(trim(p_candidate_number),10),
          left(trim(coalesce(p_candidate_name,'')),160),
          left(trim(coalesce(p_party,'')),40),
          1,
          now()
        )
        on conflict (day, candidate_id) do update
        set confirmations = public.simulator_candidate_daily.confirmations + 1,
            office = excluded.office,
            candidate_number = excluded.candidate_number,
            candidate_name = excluded.candidate_name,
            party = excluded.party,
            updated_at = now();
      end if;
    end if;
  end if;
end;
$$;

revoke all on function public.record_simulator_event(text,text,text,text,text,text,text) from public;
grant execute on function public.record_simulator_event(text,text,text,text,text,text,text) to anon, authenticated;
