-- Saldos de verificación y constancias, solo por su función (15/10/2026,
-- huecos 23 y 24).
--
-- Varias tablas tenían una política «for all» pensada para leer, y con ella
-- quien leía también podía escribir llamando a la API:
--
--   · el anfitrión borraba sus verificaciones de antecedentes (y el consumo
--     del mes bajaba), se creaba paquetes de verificaciones sin comprarlos o
--     se ponía la cuota de la suscripción que quisiera, también al abrir un
--     período pagado;
--   · cualquiera que viera una visita marcaba un documento como verificado,
--     o los términos y el reglamento de un huésped como aceptados.
--
-- Todo eso ya tiene su función --`anotar_verificacion`,
-- `comprar_paquete_verificaciones`, `activar_suscripcion_renta_corta`,
-- `anotar_verificacion_en_porteria`, `aceptar_terminos_*`,
-- `aceptar_reglamento_precheckin`--, todas `security definer` y con su propio
-- control. La app no escribe esas tablas de otra forma (comprobado), así que
-- desde la API queda leer.
--
-- Para distinguir la API de esas funciones se mira `current_user`: dentro de
-- una función `definer` es su dueño; desde PostgREST, `authenticated`.

-- 1. Verificaciones de antecedentes y paquetes: solo lectura desde la API.
drop policy if exists verificacion_antecedentes_acceso on public.verificacion_antecedentes;
create policy verificacion_antecedentes_lectura on public.verificacion_antecedentes
  for select to authenticated
  using (public.puede_configurar_alojamiento(unidad_id));

drop policy if exists paquete_verificaciones_acceso on public.paquete_verificaciones;
create policy paquete_verificaciones_lectura on public.paquete_verificaciones
  for select to authenticated
  using (public.puede_configurar_alojamiento(unidad_id));

-- 2. Verificación del documento en portería: solo lectura desde la API.
drop policy if exists verificacion_documento_acceso on public.verificacion_documento;
create policy verificacion_documento_lectura on public.verificacion_documento
  for select to authenticated
  using (exists (
    select 1 from public.invitado i
    where i.id = verificacion_documento.invitado_id
      and public.puede_ver_visita(i.visita_id)));

-- 3. La cuota de la suscripción no la escribe el anfitrión.
create or replace function public.cuota_de_suscripcion_solo_por_su_funcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'La suscripción se activa desde su botón'
      using errcode = 'insufficient_privilege';
  end if;
  if (new.verificaciones_base, new.verificada_en, new.verificada_por)
     is distinct from (old.verificaciones_base, old.verificada_en, old.verificada_por) then
    raise exception 'La cuota de verificaciones no se cambia a mano'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists suscripcion_cuota_solo_por_su_funcion on public.suscripcion_renta_corta;
create trigger suscripcion_cuota_solo_por_su_funcion
  before insert or update on public.suscripcion_renta_corta
  for each row execute function public.cuota_de_suscripcion_solo_por_su_funcion();

-- 4. El período pagado lleva la cuota de su suscripción, no la que se mande.
--    (Lo abre la app mientras no haya pasarela de pago.)
create or replace function public.periodo_con_la_cuota_de_su_suscripcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_base integer;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  select s.verificaciones_base into v_base
  from public.suscripcion_renta_corta s where s.id = new.suscripcion_id;
  if tg_op = 'INSERT' then
    new.verificaciones_base := v_base;
    return new;
  end if;
  if (new.verificaciones_base, new.desde, new.hasta, new.suscripcion_id)
     is distinct from (old.verificaciones_base, old.desde, old.hasta, old.suscripcion_id) then
    raise exception 'Un período pagado no se cambia a mano'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists periodo_cuota_de_su_suscripcion on public.periodo_suscripcion;
create trigger periodo_cuota_de_su_suscripcion
  before insert or update on public.periodo_suscripcion
  for each row execute function public.periodo_con_la_cuota_de_su_suscripcion();

-- 5. Términos y reglamento del huésped: solo por sus funciones.
create or replace function public.terminos_solo_por_su_funcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.terminos_aceptados or new.terminos_excepcion
       or new.terminos_aprobado_por is not null or new.terminos_aceptados_en is not null
       or new.reglamento_aceptado_en is not null then
      raise exception 'Los términos se aceptan desde su botón'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;
  if (new.terminos_aceptados, new.terminos_excepcion, new.terminos_aprobado_por,
      new.terminos_aceptados_en, new.terminos_documento_id, new.reglamento_aceptado_en)
     is distinct from
     (old.terminos_aceptados, old.terminos_excepcion, old.terminos_aprobado_por,
      old.terminos_aceptados_en, old.terminos_documento_id, old.reglamento_aceptado_en) then
    raise exception 'Los términos se aceptan desde su botón'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_terminos_solo_por_su_funcion on public.invitado;
create trigger invitado_terminos_solo_por_su_funcion
  before insert or update on public.invitado
  for each row execute function public.terminos_solo_por_su_funcion();
