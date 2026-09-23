-- ----------------------------------------------------------------------------
-- Registrar el pago de la cuota
-- ----------------------------------------------------------------------------
-- KT flujo 4.6: "Registro manual de quien pago por depto/mes (checkbox), o
-- carga masiva via Excel desde la web" `[DECIDIDO]`, y el actor es
-- "Administrador/Coadministrador (registra pagos)".
--
-- La lectura funciona: el Cuadro de Honor y `resumen_cuotas` leen `pago_cuota`
-- y dicen quien esta al dia. La **escritura no llega a la base**:
--
--   · la casilla por vivienda escribe en un store de Zustand y se pierde al
--     recargar;
--   · la carga masiva llama a `marcarPagosRequest`, que es literalmente
--     `await delay(200); return unidadIds;` y despues anuncia "N
--     departamentos marcados como pagados".
--
-- `grep pago_cuota src/` no devuelve nada: **ninguna pantalla escribe esa
-- tabla**. El Cuadro de Honor muestra un estado que nadie puede cambiar.
--
-- ----------------------------------------------------------------------------
-- Y la politica que lo recibiria tambien estaba mal
-- ----------------------------------------------------------------------------
--   create policy pago_cuota_acceso ... for all using (puede_operar_unidad(unidad_id))
--
-- Octava vez que aparece la forma: un `for all` con un predicado que responde
-- "¿tenes algo que ver con esta fila?". Y `puede_operar_unidad` incluye
-- `es_personal_condominio`. O sea que **un residente podia marcarse a si mismo
-- como pagado**, y un guardia tambien. El KT dice quien registra pagos, y no
-- es ninguno de los dos.

drop policy if exists pago_cuota_acceso on public.pago_cuota;

-- Cada quien ve lo de su vivienda; la administracion, todo el edificio.
drop policy if exists pago_cuota_lectura on public.pago_cuota;
create policy pago_cuota_lectura on public.pago_cuota
  for select to authenticated
  using (
    public.es_miembro_unidad(unidad_id)
    or public.es_admin_condominio(public.condominio_de_unidad(unidad_id))
  );

-- Y solo la administracion registra.
drop policy if exists pago_cuota_escritura on public.pago_cuota;
create policy pago_cuota_escritura on public.pago_cuota
  for all to authenticated
  using (public.es_admin_condominio(public.condominio_de_unidad(unidad_id)))
  with check (public.es_admin_condominio(public.condominio_de_unidad(unidad_id)));


-- ----------------------------------------------------------------------------
-- Quien lo registro, con su nombre
-- ----------------------------------------------------------------------------
-- `registrado_por` apunta a `auth.users`; para poder pedir el nombre en la
-- misma consulta hace falta declarar tambien la relacion con `perfil`. Es lo
-- que le faltaba a la correspondencia y la dejo rota desde el principio.
alter table public.pago_cuota
  drop constraint if exists pago_cuota_registrado_por_perfil_fkey;
alter table public.pago_cuota
  add constraint pago_cuota_registrado_por_perfil_fkey
  foreign key (registrado_por) references public.perfil(id) on delete set null;


-- ----------------------------------------------------------------------------
-- Marcar una vivienda
-- ----------------------------------------------------------------------------
-- La casilla del KT. Una funcion y no un `upsert` desde el cliente porque son
-- cuatro columnas que tienen que ir juntas: `pagado`, la fecha —que la
-- restriccion exige—, quien lo registro y de donde vino.
create or replace function public.marcar_pago_cuota(
  p_cuota_id  uuid,
  p_unidad_id uuid,
  p_pagado    boolean,
  p_origen    text default 'manual'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_monto      numeric(12,2);
begin
  select c.condominio_id, c.monto into v_condominio, v_monto
  from public.cuota_administracion c where c.id = p_cuota_id;

  if v_condominio is null then
    raise exception 'Esa cuota no existe';
  end if;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion registra los pagos';
  end if;

  if public.condominio_de_unidad(p_unidad_id) is distinct from v_condominio then
    raise exception 'Esa vivienda no es de este condominio';
  end if;

  insert into public.pago_cuota
    (cuota_id, unidad_id, pagado, pagado_en, monto, origen, registrado_por)
  values (
    p_cuota_id, p_unidad_id, p_pagado,
    case when p_pagado then current_date end,
    case when p_pagado then v_monto end,
    p_origen::public.origen_pago,
    auth.uid()
  )
  on conflict (cuota_id, unidad_id) do update set
    pagado         = excluded.pagado,
    pagado_en      = excluded.pagado_en,
    monto          = excluded.monto,
    origen         = excluded.origen,
    registrado_por = excluded.registrado_por,
    updated_at     = now();
end;
$$;

comment on function public.marcar_pago_cuota(uuid, uuid, boolean, text) is
  'Registra el pago de una vivienda para un periodo. Solo la administracion. KT flujo 4.6 paso 1.';

revoke all on function public.marcar_pago_cuota(uuid, uuid, boolean, text) from public;
grant execute on function public.marcar_pago_cuota(uuid, uuid, boolean, text) to authenticated;


-- ----------------------------------------------------------------------------
-- Marcar varias: la carga masiva
-- ----------------------------------------------------------------------------
-- La segunda via del KT. Recibe codigos de vivienda —que es lo que trae el
-- Excel— y devuelve cuantas encontro, para que la pantalla no anuncie mas de
-- las que marco: hoy decia "N departamentos marcados" contando los de la lista
-- de entrada, no los que existen.
create or replace function public.marcar_pagos_cuota(
  p_cuota_id uuid,
  p_codigos  text[]
)
returns table (marcadas int, no_encontradas text[])
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_ids        uuid[];
  v_faltan     text[];
begin
  select c.condominio_id into v_condominio
  from public.cuota_administracion c where c.id = p_cuota_id;

  if v_condominio is null then
    raise exception 'Esa cuota no existe';
  end if;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion registra los pagos';
  end if;

  select array_agg(u.id), array_agg(distinct cod)
    filter (where u.id is null)
    into v_ids, v_faltan
  from unnest(p_codigos) cod
  left join public.unidad u
    on upper(btrim(u.codigo)) = upper(btrim(cod))
   and u.condominio_id = v_condominio
   and u.deleted_at is null;

  perform public.marcar_pago_cuota(p_cuota_id, id, true, 'carga_masiva')
  from unnest(coalesce(v_ids, '{}')) id
  where id is not null;

  return query
    select coalesce(array_length(array_remove(v_ids, null), 1), 0),
           coalesce(v_faltan, '{}');
end;
$$;

comment on function public.marcar_pagos_cuota(uuid, text[]) is
  'Carga masiva por codigo de vivienda. Devuelve cuantas marco y cuales no encontro: la pantalla anunciaba las de la lista de entrada, no las que existen.';

revoke all on function public.marcar_pagos_cuota(uuid, text[]) from public;
grant execute on function public.marcar_pagos_cuota(uuid, text[]) to authenticated;
