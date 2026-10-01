-- ============================================================================
-- 0008 · Correcciones de RLS y autoría, detectadas al probar con sesiones reales
-- ============================================================================
-- Dos fallos que solo aparecen ejercitando las políticas con usuarios de verdad:
--
-- 1. El guardia no veía ninguna membresía de unidad, de modo que no podía saber
--    quién vive en un departamento — dato que necesita para registrar visitas y
--    entregar correspondencia. `es_admin_condominio()` excluye a `guardia`.
--
-- 2. `voto.usuario_id` no tenía valor por defecto, y la política exige
--    `usuario_id = auth.uid()`. Resultado: todo intento de votar era rechazado
--    salvo que el cliente enviara su propio id, lo que además invita a que el
--    cliente sea la fuente de verdad de quién actúa.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Autoría por defecto = usuario autenticado
-- ----------------------------------------------------------------------------
-- La base decide quién actúa, no el cliente. Combinado con las políticas
-- `with check`, hace imposible registrar una acción a nombre de otro.

alter table public.voto                       alter column usuario_id     set default auth.uid();
alter table public.visita                     alter column registrada_por set default auth.uid();
alter table public.reclamo                    alter column creado_por     set default auth.uid();
alter table public.publicacion                alter column creada_por     set default auth.uid();
alter table public.incidencia_correspondencia alter column reportada_por  set default auth.uid();
alter table public.correspondencia            alter column registrada_por set default auth.uid();
alter table public.reserva_zona               alter column solicitada_por set default auth.uid();
alter table public.paquete_verificaciones     alter column comprado_por   set default auth.uid();
alter table public.registro_turismo           alter column cargado_por    set default auth.uid();
alter table public.asignacion_estacionamiento alter column asignado_por   set default auth.uid();
alter table public.pago_cuota                 alter column registrado_por set default auth.uid();
alter table public.reconocimiento             alter column otorgado_por   set default auth.uid();


-- ----------------------------------------------------------------------------
-- 2. El guardia necesita leer las membresías de su condominio
-- ----------------------------------------------------------------------------
-- Solo lectura, y solo de su condominio. Los datos sensibles de identidad
-- (documento, identificación) viven en `perfil`, que sigue siendo privado:
-- cada quien ve únicamente el suyo.

drop policy if exists membresia_unidad_lectura on public.membresia_unidad;

create policy membresia_unidad_lectura on public.membresia_unidad
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_miembro_unidad(unidad_id)
    or public.es_personal_condominio(public.condominio_de_unidad(unidad_id))
  );

comment on policy membresia_unidad_lectura on public.membresia_unidad is
  'Lectura para: la propia persona, los miembros de la unidad, y el personal del condominio (administración y guardia). La escritura sigue restringida.';


-- ----------------------------------------------------------------------------
-- 3. El guardia necesita operar correspondencia y visitas de cualquier unidad
-- ----------------------------------------------------------------------------
-- Ya lo permite `puede_operar_unidad()`, que delega en `es_personal_condominio`.
-- Se deja constancia de la verificación: probado con sesión real de guardia,
-- puede crear una visita en una unidad de la que no es miembro, y un vecino no.
