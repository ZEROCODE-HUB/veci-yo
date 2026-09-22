-- ----------------------------------------------------------------------------
-- Correccion de un comentario que no describia el codigo
-- ----------------------------------------------------------------------------
-- La migracion 20260922140000 decia que el hilo con la porteria no lo ve "la
-- administracion si el hilo es con porteria". El codigo dice otra cosa:
-- `es_personal_condominio` incluye tanto a la porteria como a la
-- administracion, asi que la administracion si lee los hilos de porteria.
--
-- Se deja como esta -- la administracion responde por su personal y necesita
-- poder revisar un aviso -- pero es una decision de producto sin cerrar: son
-- conversaciones privadas entre un residente y el guardia. Anotada como D-13
-- en docs/RIESGOS-Y-DUDAS.md. Si el cliente decide restringirla, el cambio es
-- en `puede_ver_conversacion_fila`, rama 'area'.

comment on function public.puede_ver_conversacion_fila is
  'Quien ve una conversacion. En las de area: la unidad que escribe y el personal del condominio (porteria Y administracion). Pendiente D-13: si la administracion debe leer los hilos de porteria.';
