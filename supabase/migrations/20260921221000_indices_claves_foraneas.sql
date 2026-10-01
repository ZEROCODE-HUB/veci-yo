-- ============================================================================
-- 0007 · Indices sobre claves foraneas
-- ============================================================================
-- PostgreSQL indexa automaticamente las claves primarias y las UNIQUE, pero NO
-- las foraneas. Sin estos indices, cada JOIN por la FK y cada ON DELETE
-- CASCADE / SET NULL obliga a recorrer la tabla hija completa.
--
-- Generado a partir de una auditoria del schema: son las 46 FK de una sola
-- columna que no quedaban cubiertas por ningun indice existente.
-- ============================================================================

create index if not exists asignacion_estacionamiento_asignado_por_idx on public.asignacion_estacionamiento (asignado_por);
create index if not exists asignacion_estacionamiento_visita_id_idx on public.asignacion_estacionamiento (visita_id);
create index if not exists comite_propietarios_usuario_id_idx on public.comite_propietarios (usuario_id);
create index if not exists correspondencia_condominio_id_idx on public.correspondencia (condominio_id);
create index if not exists correspondencia_recibida_por_idx on public.correspondencia (recibida_por);
create index if not exists correspondencia_registrada_por_idx on public.correspondencia (registrada_por);
create index if not exists deposito_torre_id_idx on public.deposito (torre_id);
create index if not exists deposito_unidad_id_idx on public.deposito (unidad_id);
create index if not exists estacionamiento_torre_id_idx on public.estacionamiento (torre_id);
create index if not exists estacionamiento_unidad_id_idx on public.estacionamiento (unidad_id);
create index if not exists incidencia_correspondencia_correspondencia_id_idx on public.incidencia_correspondencia (correspondencia_id);
create index if not exists incidencia_correspondencia_reportada_por_idx on public.incidencia_correspondencia (reportada_por);
create index if not exists invitado_terminos_aprobado_por_idx on public.invitado (terminos_aprobado_por);
create index if not exists membresia_condominio_porteria_id_idx on public.membresia_condominio (porteria_id);
create index if not exists membresia_condominio_usuario_id_idx on public.membresia_condominio (usuario_id);
create index if not exists pago_cuota_registrado_por_idx on public.pago_cuota (registrado_por);
create index if not exists pago_cuota_unidad_id_idx on public.pago_cuota (unidad_id);
create index if not exists paquete_verificaciones_comprado_por_idx on public.paquete_verificaciones (comprado_por);
create index if not exists paquete_verificaciones_unidad_id_idx on public.paquete_verificaciones (unidad_id);
create index if not exists porteria_condominio_id_idx on public.porteria (condominio_id);
create index if not exists publicacion_creada_por_idx on public.publicacion (creada_por);
create index if not exists reclamo_creado_por_idx on public.reclamo (creado_por);
create index if not exists reclamo_resuelto_por_idx on public.reclamo (resuelto_por);
create index if not exists reclamo_unidad_denunciada_idx on public.reclamo (unidad_denunciada);
create index if not exists reclamo_unidad_id_idx on public.reclamo (unidad_id);
create index if not exists reconocimiento_condominio_id_idx on public.reconocimiento (condominio_id);
create index if not exists reconocimiento_insignia_id_idx on public.reconocimiento (insignia_id);
create index if not exists reconocimiento_otorgado_por_idx on public.reconocimiento (otorgado_por);
create index if not exists registro_turismo_cargado_por_idx on public.registro_turismo (cargado_por);
create index if not exists reporte_legal_enviado_por_idx on public.reporte_legal (enviado_por);
create index if not exists reserva_zona_resuelta_por_idx on public.reserva_zona (resuelta_por);
create index if not exists reserva_zona_solicitada_por_idx on public.reserva_zona (solicitada_por);
create index if not exists staff_alojamiento_unidad_id_idx on public.staff_alojamiento (unidad_id);
create index if not exists staff_alojamiento_usuario_id_idx on public.staff_alojamiento (usuario_id);
create index if not exists tipologia_condominio_id_idx on public.tipologia (condominio_id);
create index if not exists unidad_tipologia_id_idx on public.unidad (tipologia_id);
create index if not exists verificacion_antecedentes_paquete_id_idx on public.verificacion_antecedentes (paquete_id);
create index if not exists verificacion_antecedentes_periodo_id_idx on public.verificacion_antecedentes (periodo_id);
create index if not exists verificacion_antecedentes_unidad_id_idx on public.verificacion_antecedentes (unidad_id);
create index if not exists verificacion_documento_verificado_por_idx on public.verificacion_documento (verificado_por);
create index if not exists visita_autorizada_por_idx on public.visita (autorizada_por);
create index if not exists visita_registrada_por_idx on public.visita (registrada_por);
create index if not exists visita_evento_actor_id_idx on public.visita_evento (actor_id);
create index if not exists voto_opcion_id_idx on public.voto (opcion_id);
create index if not exists voto_unidad_id_idx on public.voto (unidad_id);
create index if not exists voto_usuario_id_idx on public.voto (usuario_id);
