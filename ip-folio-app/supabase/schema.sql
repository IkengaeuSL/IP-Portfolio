-- ============================================================
-- IP Folio — esquema Supabase (Fase F2)
-- App INTERNA, una sola organización (no multi-tenant).
-- Acceso restringido a usuarios autenticados (el equipo).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table if not exists public.assets (
  id                 text primary key,                       -- formato YYYY-NNN (p. ej. 2026-001)
  title              text not null,
  type               text not null
                       check (type in ('patent','copyright','trade-secret','trademark','mixed')),
  creator            text,
  owner              text,
  disclosure_date    date,
  disclosed_publicly text check (disclosed_publicly in ('yes','no')),
  stage              text not null default '01_disclosure'
                       check (stage in ('01_disclosure','02_classification','03_universe',
                                        '04_benchmark','05_enhancement','06_scoring',
                                        '07_filing','closed')),
  benchmark_verdict  text check (benchmark_verdict in ('clears','enhance','blocked','n/a')),
  score_protect      smallint check (score_protect between 1 and 5),
  score_value        smallint check (score_value between 1 and 5),
  decision           text check (decision in ('file','enhance','trade-secret',
                                              'defensive-publish','drop','pending')),
  key_deadline       date,
  deadline_type      text check (deadline_type in ('us-grace-bar','priority-12mo',
                                  'foreign-filing-30mo','office-action-response',
                                  'copyright-timely-reg','maintenance','renewal','other')),
  registration_no    text,
  jurisdiction       text,
  notes              text,        -- IMPORTANTE: NO almacenar el contenido de secretos comerciales,
                                  -- solo su existencia y las medidas de protección.
  created_at         timestamptz not null default now(),
  last_updated       timestamptz not null default now()
);

create index if not exists assets_stage_idx    on public.assets (stage);
create index if not exists assets_deadline_idx  on public.assets (key_deadline);
create index if not exists assets_type_idx      on public.assets (type);

-- Mantener last_updated automáticamente en cada UPDATE
create or replace function public.touch_last_updated()
returns trigger language plpgsql as $$
begin
  new.last_updated = now();
  return new;
end; $$;

drop trigger if exists assets_touch on public.assets;
create trigger assets_touch
  before update on public.assets
  for each row execute function public.touch_last_updated();

-- ------------------------------------------------------------
-- Seguridad a nivel de fila (RLS): solo el equipo autenticado
-- ------------------------------------------------------------
alter table public.assets enable row level security;

create policy "equipo lee"     on public.assets for select to authenticated using (true);
create policy "equipo inserta" on public.assets for insert to authenticated with check (true);
create policy "equipo edita"   on public.assets for update to authenticated using (true);

-- Borrado: por defecto NO permitido (más seguro para una cartera de PI).
-- Para permitirlo a todo el equipo, descomenta:
-- create policy "equipo borra" on public.assets for delete to authenticated using (true);

-- ------------------------------------------------------------
-- (Opcional, para cuando quieras roles lector/editor)
-- Crea una tabla de perfiles con rol y cambia las políticas de
-- INSERT/UPDATE para exigir rol 'editor'. Esqueleto:
-- ------------------------------------------------------------
-- create table public.profiles (
--   user_id uuid primary key references auth.users(id),
--   role text not null default 'editor' check (role in ('editor','lector'))
-- );
-- -- y en las políticas de insert/update:
-- --   using ( exists (select 1 from public.profiles p
-- --                    where p.user_id = auth.uid() and p.role = 'editor') )

-- ------------------------------------------------------------
-- Vista de vencimientos próximos (para el panel y los avisos)
-- ------------------------------------------------------------
create or replace view public.upcoming_deadlines as
  select id, title, owner, type, key_deadline, deadline_type,
         (key_deadline - current_date) as days_left
  from public.assets
  where key_deadline is not null
  order by key_deadline asc;
