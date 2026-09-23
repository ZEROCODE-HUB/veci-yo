-- ----------------------------------------------------------------------------
-- `tipo_notificacion` pasa a llamarse `aviso_de_visita`
-- ----------------------------------------------------------------------------
-- En el esquema convivian dos nombres casi identicos para dos ideas
-- distintas, y uno de ellos lo dice el comentario de 20260922090000:
--
--   "`tipo_notificacion` ya esta tomado: es como avisar de una visita"
--
-- Por eso el otro enum tuvo que llamarse `motivo_notificacion`. O sea:
--
--   * `tipo_notificacion`   -> COMO avisar de una visita
--                              (solo notificar / notificar y anunciar)
--   * `motivo_notificacion` -> POR QUE se avisa
--                              (correspondencia_recibida, visita_ingreso...)
--
-- Dos cosas sin relacion, distinguidas por "tipo" y "motivo". Quien lea el
-- esquema de aqui a seis meses va a confundirlas, y quien escriba una consulta
-- va a elegir la equivocada.
--
-- El enum de la visita pasa a decir lo que es: `aviso_de_visita`, y la columna
-- `visita.aviso`.

alter type public.tipo_notificacion rename to aviso_de_visita;

alter table public.visita
  rename column tipo_notificacion to aviso;

comment on column public.visita.aviso is
  'Como avisar a la vivienda de esta visita. Distinto de motivo_notificacion, que es por que se avisa.';

comment on type public.aviso_de_visita is
  'Como se avisa de una visita. Se llamaba tipo_notificacion y se confundia con motivo_notificacion.';
