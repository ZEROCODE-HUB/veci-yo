-- ----------------------------------------------------------------------------
-- Lo que pide el ministerio: los datos que faltaban para la TRA
-- ----------------------------------------------------------------------------
-- La Tarjeta de Registro de Alojamiento (Resolucion 409 de 2022) se manda a
-- `pms.mincit.gov.co` con quince datos por huesped. **Ya teniamos once.**
-- Faltan estos, y sin ellos el ministerio rechaza el reporte:
--
--   · la ciudad donde vive el huesped;
--   · la ciudad de donde viene;
--   · y lo que costo la estancia.
--
-- El costo lo escribe **el huesped**, decidido el 02/10/2026. Es lo razonable:
-- el anfitrion que recibe por Airbnb no siempre sabe lo que pago, y el huesped
-- siempre lo sabe.
--
-- Va en `visita` y no en `invitado` porque es de la reserva entera, no de cada
-- persona: el ministerio lo pide una vez, en el huesped principal.
--
-- La nacionalidad entra ahora aunque la TRA no la pida: la pide el **SIRE**, que
-- es el otro reporte --el de extranjeros a Migracion Colombia-- y preguntarla
-- dos veces al huesped seria absurdo. SIRE no tiene API: se reporta subiendo un
-- archivo al portal, asi que esa parte espera a tener el formato oficial.
--
-- Solo aditiva.

alter table public.invitado
  add column if not exists ciudad_residencia  text,
  add column if not exists ciudad_procedencia text,
  add column if not exists nacionalidad       char(2);

comment on column public.invitado.ciudad_residencia is
  'Donde vive. Lo pide la TRA como `cuidad_residencia` (asi, con la errata del ministerio).';
comment on column public.invitado.ciudad_procedencia is
  'De donde viene a esta estancia. Lo pide la TRA.';
comment on column public.invitado.nacionalidad is
  'ISO 3166-1 alfa-2. No la pide la TRA; la pide el SIRE, y se pregunta una sola vez.';

alter table public.visita
  add column if not exists costo_estancia numeric(12,2),
  add column if not exists moneda_costo   char(3);

comment on column public.visita.costo_estancia is
  'Lo que costo la estancia, para la TRA. Lo escribe el huesped en su preregistro: quien reserva por un portal sabe lo que pago, y el anfitrion no siempre.';
comment on column public.visita.moneda_costo is
  'ISO 4217. Regla 5: el dinero no viaja sin su moneda.';


-- ----------------------------------------------------------------------------
-- El token de la TRA
-- ----------------------------------------------------------------------------
-- **Es de cada anfitrion, no de VeciYo.** Cada prestador lo saca con su numero
-- de RNT en `pms.mincit.gov.co/token/` y se lo mandan a su correo del RNT. O sea
-- que hay uno por alojamiento y hay que guardarlo.
--
-- Es una credencial, asi que se cifra, igual que la clave del wifi y la de la
-- puerta: en la tabla solo queda el identificador del secreto. La regla 9 lo
-- dice y aqui pesa mas que en el wifi, porque con este token se reporta al
-- Estado en nombre de otro.

alter table public.suscripcion_renta_corta
  add column if not exists tra_token_secret uuid,
  add column if not exists tra_reportado_en timestamptz,
  add column if not exists tra_error        text;

comment on column public.suscripcion_renta_corta.tra_token_secret is
  'Identificador del token de la TRA en el Vault. El token en claro nunca vive en esta tabla.';

/**
 * Guarda el token del ministerio, cifrado.
 *
 * El secreto se nombra de forma determinista --`tra_<unidad>`-- y se busca
 * **por su nombre** antes de decidir si crear o actualizar. Es la leccion de
 * `guardar_alojamiento`: mirar solo la referencia de la fila hacia crear uno
 * nuevo cuando la fila la habia perdido, chocaba contra el indice unico del
 * Vault y abortaba la funcion entera.
 */
create or replace function public.guardar_token_tra(
  p_unidad_id uuid,
  p_token     text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, extensions
as $$
declare
  v_nombre text := 'tra_' || p_unidad_id::text;
  v_id     uuid;
  v_token  text := nullif(btrim(coalesce(p_token, '')), '');
begin
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  -- Vaciarlo es desconectar la TRA, y es una cosa sola: se suelta la referencia.
  if v_token is null then
    update public.suscripcion_renta_corta
       set tra_token_secret = null, tra_error = null, updated_at = now()
     where unidad_id = p_unidad_id;
    return;
  end if;

  select id into v_id from vault.secrets where name = v_nombre;

  if v_id is null then
    v_id := vault.create_secret(v_token, v_nombre, 'Token TRA del alojamiento');
  else
    perform vault.update_secret(v_id, v_token, v_nombre, 'Token TRA del alojamiento');
  end if;

  update public.suscripcion_renta_corta
     set tra_token_secret = v_id, tra_error = null, updated_at = now()
   where unidad_id = p_unidad_id;
end;
$$;

grant execute on function public.guardar_token_tra(uuid, text) to authenticated;

/** Si hay token puesto, sin decir cual. Es lo unico que la pantalla necesita. */
create or replace function public.tiene_token_tra(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.suscripcion_renta_corta s
    where s.unidad_id = p_unidad_id
      and s.tra_token_secret is not null
      and public.puede_operar_unidad(p_unidad_id)
  );
$$;

grant execute on function public.tiene_token_tra(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- Lo que se mando, guardado
-- ----------------------------------------------------------------------------
-- `reporte_legal` ya existia desde el primer dia --con su tipo `tra`/`sire`, su
-- momento, su estado y la respuesta de la entidad-- y **nunca envio nada**.
--
-- Le falta una cosa para que sirva de constancia: **que guarde lo que se mando**.
-- Un reporte al Estado del que solo se sabe que «fue bien» no es constancia de
-- nada el dia que alguien pregunte que se declaro.

alter table public.reporte_legal
  add column if not exists enviado jsonb;

comment on column public.reporte_legal.enviado is
  'El cuerpo exacto que se le mando a la entidad. Sin esto no se puede responder que se declaro.';

-- Y un estado mas: lo que se armo para probar, sin token y sin salir a internet.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'estado_reporte_legal' and e.enumlabel = 'simulado'
  ) then
    alter type public.estado_reporte_legal add value 'simulado';
  end if;
end $$;
