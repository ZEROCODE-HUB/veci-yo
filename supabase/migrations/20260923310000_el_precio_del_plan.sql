-- ----------------------------------------------------------------------------
-- El precio del plan vive en la base, con su moneda y su pais
-- ----------------------------------------------------------------------------
-- `$15.00` estaba escrito a mano en la pantalla de suscripcion, dos veces
-- --en el importe y en el texto del boton-- y sin decir en que moneda. Subir
-- el precio exigia publicar la aplicacion, y el producto opera en Colombia y
-- en Peru, que no comparten moneda.
--
-- Ademas `periodo_suscripcion` no registraba **cuanto se cobro**: la base
-- guardaba que alguien estuvo suscrito de tal fecha a tal otra y nada mas. Si
-- el precio cambia el anio que viene, no habria forma de saber que se cobro el
-- anterior. `paquete_verificaciones` ya lo hacia bien --`monto` + `moneda`--,
-- asi que la forma correcta ya estaba en el esquema, sin usar.
--
-- Regla 5: dinero es `numeric(12,2)` + moneda ISO 4217. Y el pais en ISO
-- 3166-1 alfa-2, como ya lo guarda `condominio.pais`.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'periodicidad_plan') then
    create type public.periodicidad_plan as enum ('mensual', 'anual');
  end if;
  if not exists (select 1 from pg_type where typname = 'clave_plan') then
    create type public.clave_plan as enum ('renta_corta');
  end if;
end $$;

create table if not exists public.plan_suscripcion (
  id           uuid primary key default gen_random_uuid(),
  clave        public.clave_plan not null unique,
  nombre       text not null,
  descripcion  text,
  periodicidad public.periodicidad_plan not null default 'mensual',
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.plan_suscripcion is
  'Los planes que se pueden contratar. Hoy solo la renta corta; el precio no vive aqui porque cambia por pais.';

-- El precio se separa del plan porque un plan tiene un precio por pais y puede
-- cambiar con el tiempo. `pais is null` es el precio por defecto: el que rige
-- donde no se haya puesto uno propio.
create table if not exists public.precio_plan (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plan_suscripcion(id) on delete cascade,
  pais          char(2),
  monto         numeric(12,2) not null check (monto >= 0),
  moneda        char(3) not null,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint precio_plan_vigencia_coherente
    check (vigente_hasta is null or vigente_hasta > vigente_desde)
);

-- Un solo precio vigente por plan y pais: dos abiertos a la vez harian que
-- `precio_del_plan()` devolviera uno u otro segun el orden de lectura.
create unique index if not exists precio_plan_vigente_unico
  on public.precio_plan (plan_id, coalesce(pais, '--'))
  where vigente_hasta is null;

create index if not exists precio_plan_plan_idx on public.precio_plan (plan_id);

comment on table public.precio_plan is
  'Precio de un plan por pais y periodo de vigencia. `pais` nulo es el precio por defecto. Cerrar un precio es ponerle `vigente_hasta`, no borrarlo: los periodos ya cobrados guardan su propio importe.';


-- ----------------------------------------------------------------------------
-- Lo que se cobro de verdad
-- ----------------------------------------------------------------------------
alter table public.periodo_suscripcion
  add column if not exists monto_cobrado   numeric(12,2),
  add column if not exists moneda          char(3),
  add column if not exists referencia_pago text,
  add column if not exists pagado_en       timestamptz;

-- Un importe sin moneda no se puede ni mostrar ni sumar.
alter table public.periodo_suscripcion
  drop constraint if exists periodo_suscripcion_importe_con_moneda;
alter table public.periodo_suscripcion
  add constraint periodo_suscripcion_importe_con_moneda
  check (
    (monto_cobrado is null and moneda is null)
    or (monto_cobrado is not null and moneda is not null and monto_cobrado >= 0)
  );

comment on column public.periodo_suscripcion.monto_cobrado is
  'Lo que se cobro por este periodo, con su moneda. Se copia del precio vigente al cobrar y no se recalcula: si el precio sube, lo ya cobrado no cambia.';
comment on column public.periodo_suscripcion.referencia_pago is
  'Identificador del pago en la pasarela. Vacio mientras el cobro sea simulado: todavia no hay ninguna pasarela integrada.';


-- ----------------------------------------------------------------------------
-- Que precio le toca a un condominio
-- ----------------------------------------------------------------------------
create or replace function public.precio_del_plan(
  p_clave          public.clave_plan,
  p_condominio_id  uuid default null
)
returns table (monto numeric, moneda char(3), periodicidad public.periodicidad_plan)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pr.monto, pr.moneda, pl.periodicidad
  from public.precio_plan pr
  join public.plan_suscripcion pl on pl.id = pr.plan_id
  where pl.clave = p_clave
    and pl.activo
    and pr.vigente_hasta is null
    and pr.vigente_desde <= current_date
    and (
      pr.pais is null
      or pr.pais = (select c.pais from public.condominio c where c.id = p_condominio_id)
    )
  -- El precio del pais gana al de por defecto.
  order by pr.pais nulls last
  limit 1;
$$;

comment on function public.precio_del_plan(public.clave_plan, uuid) is
  'El precio vigente de un plan para el pais de un condominio, con respaldo al precio por defecto.';

revoke all on function public.precio_del_plan(public.clave_plan, uuid) from public;
grant execute on function public.precio_del_plan(public.clave_plan, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- El precio es publico para quien tiene sesion: es lo que se le va a cobrar.
-- Escribirlo no es de nadie desde la aplicacion --lo fija quien opera el
-- producto--, asi que no hay politica de escritura y solo `service_role` puede.
alter table public.plan_suscripcion enable row level security;
alter table public.precio_plan      enable row level security;

drop policy if exists plan_suscripcion_lectura on public.plan_suscripcion;
create policy plan_suscripcion_lectura on public.plan_suscripcion
  for select to authenticated using (activo);

drop policy if exists precio_plan_lectura on public.precio_plan;
create policy precio_plan_lectura on public.precio_plan
  for select to authenticated using (vigente_hasta is null);

grant select on public.plan_suscripcion to authenticated;
grant select on public.precio_plan      to authenticated;

drop trigger if exists plan_suscripcion_tocar_updated_at on public.plan_suscripcion;
create trigger plan_suscripcion_tocar_updated_at
  before update on public.plan_suscripcion
  for each row execute function public.tocar_updated_at();

drop trigger if exists precio_plan_tocar_updated_at on public.precio_plan;
create trigger precio_plan_tocar_updated_at
  before update on public.precio_plan
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- Semilla
-- ----------------------------------------------------------------------------
-- Se siembra **lo que la aplicacion ya mostraba** y nada mas: 15.00 como
-- precio por defecto. La pantalla decia "$15.00" sin moneda; el simbolo y el
-- orden de magnitud son los del dolar, asi que se registra en USD y se deja
-- dicho. Los precios de Colombia y Peru los pone el cliente, y esta migracion
-- no los inventa: mientras no existan, rige el de por defecto.
insert into public.plan_suscripcion (clave, nombre, descripcion, periodicidad)
values (
  'renta_corta',
  'Huéspedes Temporales',
  'Habilita la renta corta en una vivienda: alta de huéspedes, precheckin y cumplimiento legal.',
  'mensual'
)
on conflict (clave) do nothing;

insert into public.precio_plan (plan_id, pais, monto, moneda)
select pl.id, null, 15.00, 'USD'
from public.plan_suscripcion pl
where pl.clave = 'renta_corta'
  and not exists (
    select 1 from public.precio_plan pr
    where pr.plan_id = pl.id and pr.pais is null and pr.vigente_hasta is null
  );


-- ----------------------------------------------------------------------------
-- El importe lo pone la base, no quien paga
-- ----------------------------------------------------------------------------
-- `periodo_suscripcion_acceso` deja escribir a quien opera la unidad, que es
-- justamente quien paga. Si el importe viniera del cliente, cualquiera podria
-- abrir un periodo diciendo que le cobraron cero: es la misma forma que
-- `perfil.verificado` --una afirmacion **sobre** alguien que esa persona no
-- puede escribir-- y se resuelve igual, con un disparador.
--
-- El cliente pide "abreme un periodo"; el precio lo decide `precio_del_plan()`
-- segun el pais del condominio. Y una vez sellado no se reescribe: si el
-- precio sube, lo ya cobrado no cambia.
create or replace function public.sellar_importe_del_periodo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_monto      numeric(12,2);
  v_moneda     char(3);
begin
  if tg_op = 'UPDATE'
     and old.monto_cobrado is not null
     and new.monto_cobrado is distinct from old.monto_cobrado then
    raise exception 'El importe de un periodo ya cobrado no se cambia'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    select public.condominio_de_unidad(s.unidad_id) into v_condominio
    from public.suscripcion_renta_corta s
    where s.id = new.suscripcion_id;

    select p.monto, p.moneda into v_monto, v_moneda
    from public.precio_del_plan('renta_corta', v_condominio) p;

    new.monto_cobrado := v_monto;
    new.moneda        := v_moneda;
  end if;

  return new;
end;
$$;

comment on function public.sellar_importe_del_periodo() is
  'El importe de un periodo sale de `precio_del_plan()`, no del cliente: quien paga es quien puede escribir la fila.';

drop trigger if exists periodo_suscripcion_sellar_importe on public.periodo_suscripcion;
create trigger periodo_suscripcion_sellar_importe
  before insert or update on public.periodo_suscripcion
  for each row execute function public.sellar_importe_del_periodo();
