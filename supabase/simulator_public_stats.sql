-- Sul na Urna — contador público agregado de simulações concluídas
-- Não expõe candidatos, percentuais, ranking, IP, sessão ou escolhas individuais.

create or replace function public.get_simulator_public_stats()
returns table(completions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(m.completions), 0)::bigint as completions
  from public.simulator_metrics_daily m;
$$;

revoke all on function public.get_simulator_public_stats() from public;
grant execute on function public.get_simulator_public_stats() to anon, authenticated;
