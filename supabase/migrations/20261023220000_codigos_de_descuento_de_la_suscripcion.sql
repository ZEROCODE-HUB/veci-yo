-- Códigos de descuento para la suscripción de renta corta.
--
-- QA 23/10/2026 (responsable de producto): «En la suscripción poder poner
-- código de descuento para Renta Corta». Decidido con el cliente ese día: los
-- crea quien opera la plataforma, con un porcentaje, una fecha límite y un
-- tope de usos; el anfitrión lo escribe al suscribirse.
--
-- El importe no lo manda la app: lo sella `sellar_importe_del_periodo` desde
-- el precio vigente, y ahora aplica ahí el descuento. Los usos no llevan un
-- contador aparte: son los periodos que lo usaron, así no se descuadran.

create table if not exists public.codigo_descuento (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique check (codigo = upper(btrim(codigo)) and length(codigo) between 3 and 30),
  porcentaje    int not null check (porcentaje between 1 and 100),
  vence_en      date,
  usos_maximos  int check (usos_maximos is null or usos_maximos > 0),
  activo        boolean not null default true,
  creado_por    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.codigo_descuento is
  'Códigos de descuento de la suscripción de renta corta. Los crea la plataforma.';
comment on column public.codigo_descuento.vence_en is 'Último día en que vale. Nulo: no vence.';
comment on column public.codigo_descuento.usos_maximos is 'Cuántas suscripciones lo pueden usar. Nulo: sin tope.';

drop trigger if exists codigo_descuento_tocar_updated_at on public.codigo_descuento;
create trigger codigo_descuento_tocar_updated_at
  before update on public.codigo_descuento
  for each row execute function public.tocar_updated_at();

alter table public.codigo_descuento enable row level security;

-- Solo el personal de la plataforma los ve y los gestiona. No se borran: se
-- desactivan, porque los periodos que los usaron los referencian.
drop policy if exists codigo_descuento_plataforma_lectura on public.codigo_descuento;
create policy codigo_descuento_plataforma_lectura on public.codigo_descuento
  for select using (public.es_staff_plataforma());
drop policy if exists codigo_descuento_plataforma_alta on public.codigo_descuento;
create policy codigo_descuento_plataforma_alta on public.codigo_descuento
  for insert with check (public.es_staff_plataforma() and creado_por = auth.uid());
drop policy if exists codigo_descuento_plataforma_cambio on public.codigo_descuento;
create policy codigo_descuento_plataforma_cambio on public.codigo_descuento
  for update using (public.es_staff_plataforma()) with check (public.es_staff_plataforma());

alter table public.periodo_suscripcion
  add column if not exists codigo_descuento text,
  add column if not exists codigo_descuento_id uuid references public.codigo_descuento(id),
  add column if not exists descuento_porcentaje int;

comment on column public.periodo_suscripcion.codigo_descuento is
  'El código que escribió el anfitrión al suscribirse; lo resuelve el disparador.';
comment on column public.periodo_suscripcion.descuento_porcentaje is
  'El descuento que se aplicó al importe, sellado con él.';

/*
  Si un código vale ahora mismo, y por qué no si no vale. Interna: la usan la
  validación pública y el disparador.
*/
create or replace function public.estado_del_codigo_descuento(p_codigo text)
returns table (id uuid, porcentaje int, motivo text)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  c     public.codigo_descuento%rowtype;
  usos  int;
begin
  select * into c from public.codigo_descuento where codigo = upper(btrim(coalesce(p_codigo, '')));
  if c.id is null or not c.activo then
    return query select null::uuid, null::int, 'Ese código no existe o ya no está activo.';
    return;
  end if;
  if c.vence_en is not null and c.vence_en < current_date then
    return query select null::uuid, null::int, format('Ese código venció el %s.', to_char(c.vence_en, 'DD/MM/YYYY'));
    return;
  end if;
  select count(*) into usos from public.periodo_suscripcion where codigo_descuento_id = c.id;
  if c.usos_maximos is not null and usos >= c.usos_maximos then
    return query select null::uuid, null::int, 'Ese código ya se usó todas las veces que permitía.';
    return;
  end if;
  return query select c.id, c.porcentaje, null::text;
end;
$$;

revoke all on function public.estado_del_codigo_descuento(text) from public, anon, authenticated;
grant execute on function public.estado_del_codigo_descuento(text) to service_role;

-- Lo que la pantalla pregunta al escribir el código: el porcentaje, o por qué no.
create or replace function public.validar_codigo_descuento(p_codigo text)
returns int
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  e record;
begin
  if auth.uid() is null then
    raise exception 'Hace falta iniciar sesión';
  end if;
  select * into e from public.estado_del_codigo_descuento(p_codigo);
  if e.id is null then
    raise exception '%', e.motivo;
  end if;
  return e.porcentaje;
end;
$$;

comment on function public.validar_codigo_descuento(text) is
  'El porcentaje de un código de descuento vigente; si no vale, dice por qué.';
revoke all on function public.validar_codigo_descuento(text) from public, anon;
grant execute on function public.validar_codigo_descuento(text) to authenticated, service_role;

-- El importe se sella con el descuento, si viene un código que vale.
create or replace function public.sellar_importe_del_periodo()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_monto      numeric(12,2);
  v_moneda     char(3);
  e            record;
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

    -- Lo que viene de la app no cuenta: se resuelve aquí.
    new.codigo_descuento_id := null;
    new.descuento_porcentaje := null;
    if nullif(btrim(coalesce(new.codigo_descuento, '')), '') is not null then
      select * into e from public.estado_del_codigo_descuento(new.codigo_descuento);
      if e.id is null then
        raise exception '%', e.motivo using errcode = 'check_violation';
      end if;
      new.codigo_descuento := upper(btrim(new.codigo_descuento));
      new.codigo_descuento_id := e.id;
      new.descuento_porcentaje := e.porcentaje;
      v_monto := round(v_monto * (100 - e.porcentaje) / 100.0, 2);
    end if;

    new.monto_cobrado := v_monto;
    new.moneda        := v_moneda;
  end if;

  return new;
end;
$$;
