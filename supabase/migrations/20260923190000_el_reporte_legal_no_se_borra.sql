-- ----------------------------------------------------------------------------
-- El reporte legal no lo emite cualquiera, y no lo borra nadie
-- ----------------------------------------------------------------------------
-- `reporte_legal` guarda los envios a TRA y SIRE: la Tarjeta de Registro de
-- Alojamiento y el reporte de extranjeros a migraciones. Su politica era esta:
--
--   create policy reporte_legal_acceso on public.reporte_legal
--     for all using (exists (... puede_ver_visita(i.visita_id)));
--
-- Otra vez la forma que ya produjo R-64 y R-65: un `for all` con un predicado
-- que responde "¿tenes algo que ver con esta fila?" en vez de "¿podes hacer
-- **esto** con esta fila?". Y `puede_ver_visita` incluye a **todo el personal
-- del condominio**, guardias incluidos.
--
-- O sea que, con una sola llamada a la API:
--
--   * un guardia emitia un reporte a migraciones a nombre de quien quisiera;
--   * cualquiera que viera la visita lo marcaba como `enviado` poniendo a otra
--     persona en `enviado_por`;
--   * y cualquiera de los dos lo **borraba**, que es lo grave: el reporte es
--     la constancia de haber cumplido con la autoridad, y quien tendria motivo
--     para hacerlo desaparecer es justamente quien no lo presento.
--
-- La decision de producto del 17/07/2026, que el propio archivo cita:
--
--   "el reporte NO es automatico. Se emite huesped por huesped, **por decision
--    del anfitrion**, y solo una vez confirmado el ingreso fisico."
--
-- Asi que: lo emite quien opera la vivienda (el anfitrion) o la
-- administracion; la porteria lo ve porque registra el ingreso, y nada mas.

drop policy if exists reporte_legal_acceso on public.reporte_legal;

-- Lo ve quien tiene algo que ver con la visita, incluida la porteria: es quien
-- confirma el ingreso del que depende el reporte.
drop policy if exists reporte_legal_lectura on public.reporte_legal;
create policy reporte_legal_lectura on public.reporte_legal
  for select to authenticated
  using (
    exists (
      select 1 from public.invitado i
      where i.id = reporte_legal.invitado_id
        and public.puede_ver_visita(i.visita_id)
    )
  );

-- Lo emite el anfitrion o la administracion. No la porteria.
drop policy if exists reporte_legal_alta on public.reporte_legal;
create policy reporte_legal_alta on public.reporte_legal
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.invitado i
      join public.visita v on v.id = i.visita_id
      where i.id = reporte_legal.invitado_id
        and v.unidad_id is not null
        and (
          -- `es_miembro_unidad`, no `puede_operar_unidad`: la segunda incluye
          -- a `es_personal_condominio`, o sea a la porteria, que es justo lo
          -- que hay que dejar fuera. Tampoco entra el huesped temporal, que
          -- desde R-41 no es miembro de la unidad: nadie se reporta a si mismo
          -- ante migraciones.
          public.es_miembro_unidad(v.unidad_id)
          or public.es_admin_condominio(v.condominio_id)
        )
    )
  );

drop policy if exists reporte_legal_cambio on public.reporte_legal;
create policy reporte_legal_cambio on public.reporte_legal
  for update to authenticated
  using (
    exists (
      select 1
      from public.invitado i
      join public.visita v on v.id = i.visita_id
      where i.id = reporte_legal.invitado_id
        and v.unidad_id is not null
        and (
          -- `es_miembro_unidad`, no `puede_operar_unidad`: la segunda incluye
          -- a `es_personal_condominio`, o sea a la porteria, que es justo lo
          -- que hay que dejar fuera. Tampoco entra el huesped temporal, que
          -- desde R-41 no es miembro de la unidad: nadie se reporta a si mismo
          -- ante migraciones.
          public.es_miembro_unidad(v.unidad_id)
          or public.es_admin_condominio(v.condominio_id)
        )
    )
  );

-- No hay politica de DELETE, y es a proposito: igual que una PQRS o una alarma
-- de S.O.S., el reporte a la autoridad es un hecho. Si se emitio por error se
-- marca `fallido` con su detalle, que deja rastro; borrarlo no.
comment on table public.reporte_legal is
  'Un registro por huesped, tipo y momento. No se borra: es la constancia de haber reportado a la autoridad. Se emite por decision del anfitrion (KT 17/07/2026).';


-- ----------------------------------------------------------------------------
-- Quien dice haberlo enviado, lo envio
-- ----------------------------------------------------------------------------
-- `reporte_enviado_con_actor` ya exigia que un reporte `enviado` tenga
-- `enviado_por` y `enviado_en`. Faltaba lo otro: que ese actor sea quien esta
-- haciendo la operacion. RLS no sabe comparar el valor viejo con el nuevo, asi
-- que va en un disparador —la misma forma que `perfil.verificado` (R-67)—.
--
-- Y la regla que el comentario del esquema enuncia y nadie imponia: **solo una
-- vez confirmado el ingreso fisico**. Un reporte de entrada de alguien que no
-- ha llegado es un dato falso enviado a migraciones.
create or replace function public.proteger_reporte_legal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_llego boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.estado = 'enviado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'enviado') then

    if new.enviado_por is distinct from auth.uid() then
      raise exception 'El reporte lo firma quien lo envia';
    end if;

    if new.momento = 'entrada' then
      select i.llego into v_llego
      from public.invitado i where i.id = new.invitado_id;

      if not coalesce(v_llego, false) then
        raise exception 'El reporte de entrada se emite cuando se confirma el ingreso';
      end if;
    end if;
  end if;

  -- Un reporte enviado no vuelve a pendiente: se corrige marcandolo fallido
  -- con su detalle, que es lo que deja rastro.
  if tg_op = 'UPDATE' and old.estado = 'enviado' and new.estado = 'pendiente' then
    raise exception 'Un reporte ya enviado no vuelve a pendiente';
  end if;

  return new;
end;
$$;

drop trigger if exists reporte_legal_proteger on public.reporte_legal;
create trigger reporte_legal_proteger
  before insert or update on public.reporte_legal
  for each row execute function public.proteger_reporte_legal();

comment on function public.proteger_reporte_legal() is
  'Quien dice haber enviado el reporte lo envio, y el de entrada exige que el huesped haya llegado. KT 17/07/2026.';
