-- ----------------------------------------------------------------------------
-- Los permisos del coadministrador sujetan algo
-- ----------------------------------------------------------------------------
-- La pantalla de Coadministradores ofrece ocho interruptores con su
-- descripcion —"Gestionar residentes", "Responder chats", "Gestionar
-- seguridad", "Administrar cuadro de honor", y cuatro de solo lectura— y los
-- guarda en `membresia_condominio.permisos`, un `jsonb`.
--
-- **No los mira nadie.** Ni una politica ni una funcion de la base leen esa
-- columna: se enumeraron las 104 politicas y las 73 funciones y sale cero.
--
-- Y lo que hay detras es peor que un interruptor decorativo, porque
-- `es_admin_condominio` incluye al coadministrador:
--
--   and mc.rol in ('administrador', 'coadministrador')
--
-- Esa funcion sostiene **31 politicas**. O sea que dar de alta a alguien como
-- coadministrador con un solo permiso marcado le concede, de hecho, la
-- administracion completa del edificio: arquitectura, personal de seguridad,
-- permisos de vivienda, reservas, verificacion de identidad y reportes.
--
-- Es la misma forma que ya aparecio seis veces —la decision vive en la
-- pantalla y no en el dato— pero esta vivia en un `jsonb`, asi que la
-- enumeracion de columnas booleanas (R-69) no podia verla.
--
-- ----------------------------------------------------------------------------
-- Que se decide aqui y que no
-- ----------------------------------------------------------------------------
-- D-02 del KT sigue abierto: "que puede hacer exactamente un coadministrador,
-- de condominio y de unidad". Eso **no** se decide aqui, y sigue anotado.
--
-- Lo que se hace es que los ocho permisos que la propia pantalla define
-- —con su nombre y su descripcion, que son la definicion del producto— dejen
-- de ser decorativos. No es inventar una regla: es cumplir la que la pantalla
-- ya enuncia.
--
-- Una clave ausente vale `true`. El formulario crea a todo el mundo con los
-- ocho marcados, y hoy no hay ningun coadministrador en la base, asi que
-- nadie pierde acceso por este cambio.

create or replace function public.puede_coadmin(
  p_condominio_id uuid,
  p_clave         text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.activo
      and (
        mc.rol = 'administrador'
        -- Clave ausente = permitido: el formulario los marca todos al crear y
        -- una migracion no deja a nadie fuera de su propio panel.
        or (mc.rol = 'coadministrador'
            and coalesce((mc.permisos ->> p_clave)::boolean, true))
      )
  );
$$;

comment on function public.puede_coadmin(uuid, text) is
  'Si quien pregunta puede hacer eso en el condominio. El administrador siempre; el coadministrador segun su permiso. Clave ausente = permitido.';

revoke all on function public.puede_coadmin(uuid, text) from public;
grant execute on function public.puede_coadmin(uuid, text) to authenticated;


-- ----------------------------------------------------------------------------
-- "Gestionar seguridad": guardias, porterias y turnos
-- ----------------------------------------------------------------------------
drop policy if exists porteria_escritura on public.porteria;
create policy porteria_escritura on public.porteria
  for all to authenticated
  using (public.puede_coadmin(condominio_id, 'modificarSeguridad'))
  with check (public.puede_coadmin(condominio_id, 'modificarSeguridad'));

drop policy if exists membresia_condominio_escritura on public.membresia_condominio;
create policy membresia_condominio_escritura on public.membresia_condominio
  for all to authenticated
  using (public.puede_coadmin(condominio_id, 'modificarSeguridad'))
  with check (public.puede_coadmin(condominio_id, 'modificarSeguridad'));

drop policy if exists turno_guardia_escritura on public.turno_guardia;
create policy turno_guardia_escritura on public.turno_guardia
  for all to authenticated
  using (exists (
    select 1 from public.membresia_condominio mc
    where mc.id = turno_guardia.membresia_id
      and public.puede_coadmin(mc.condominio_id, 'modificarSeguridad')))
  with check (exists (
    select 1 from public.membresia_condominio mc
    where mc.id = turno_guardia.membresia_id
      and public.puede_coadmin(mc.condominio_id, 'modificarSeguridad')));

drop policy if exists turno_override_escritura on public.turno_override;
create policy turno_override_escritura on public.turno_override
  for all to authenticated
  using (exists (
    select 1 from public.membresia_condominio mc
    where mc.id = turno_override.membresia_id
      and public.puede_coadmin(mc.condominio_id, 'modificarSeguridad')))
  with check (exists (
    select 1 from public.membresia_condominio mc
    where mc.id = turno_override.membresia_id
      and public.puede_coadmin(mc.condominio_id, 'modificarSeguridad')));


-- ----------------------------------------------------------------------------
-- "Administrar cuadro de honor"
-- ----------------------------------------------------------------------------
-- Quien otorgo un reconocimiento siempre puede retirarlo; lo que se sujeta es
-- retirar el de otro, que es la parte administrativa.
drop policy if exists reconocimiento_baja on public.reconocimiento;
create policy reconocimiento_baja on public.reconocimiento
  for delete to authenticated
  using (
    otorgado_por = auth.uid()
    or public.puede_coadmin(condominio_id, 'modificarCuadroHonor')
  );


-- ----------------------------------------------------------------------------
-- "Gestionar residentes": invitar y revocar
-- ----------------------------------------------------------------------------
create or replace function public.puede_invitar_a_unidad(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    -- El propietario o el inquilino lider de la unidad gestionan a su gente.
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  ) or public.puede_coadmin(
        public.condominio_de_unidad(p_unidad_id), 'actualizarResidentes');
$$;

drop policy if exists invitacion_revocacion on public.invitacion;
create policy invitacion_revocacion on public.invitacion
  for update to authenticated
  using (
    invitada_por = auth.uid()
    or public.puede_coadmin(condominio_id, 'actualizarResidentes')
    or (unidad_id is not null and public.puede_invitar_a_unidad(unidad_id))
  );


-- ----------------------------------------------------------------------------
-- "Responder chats"
-- ----------------------------------------------------------------------------
-- Solo el hilo de administracion y los grupos del edificio, que son los que
-- abre la administracion. Los demas no dependen de este permiso.
drop policy if exists conversacion_alta on public.conversacion;
create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and (
        public.es_residente_o_huesped(unidad_id)
        or (area = 'seguridad' and public.es_personal_condominio(condominio_id))
        or (area = 'administracion'
            and public.puede_coadmin(condominio_id, 'contestarChat'))
      ))
      or (tipo = 'directa' and public.es_miembro_condominio(condominio_id))
      or (tipo = 'grupo'
          and public.puede_coadmin(condominio_id, 'contestarChat'))
    )
  );


-- ----------------------------------------------------------------------------
-- Lo que NO se toca, y por que
-- ----------------------------------------------------------------------------
-- Los cuatro permisos de solo lectura —visitas, correspondencia, zonas comunes
-- y encuestas— gatearian **lecturas**, y la administracion ya ve todo el
-- edificio por otras diez politicas. Cerrarlos ahi daria una sensacion de
-- privacidad que el resto del sistema no sostiene, y esconder una lectura sin
-- esconder las demas es peor que no esconderla. Queda anotado.
comment on column public.membresia_condominio.permisos is
  'Permisos granulares del coadministrador. Los cuatro de gestion los imponen las politicas via puede_coadmin(); los cuatro de visualizacion todavia no (R-112).';
