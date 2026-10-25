-- Dos restos de Parametrización (25/10/2026).
--
-- 1. El código de estancia que teclea la portería: la base lo genera siempre
--    de 12 caracteres (`upper(encode(gen_random_bytes(6), 'hex'))`) y
--    `estancia_por_codigo` lo compara entero. El parámetro decía 6, así que el
--    botón se encendía con 6 y la búsqueda nunca encontraba nada.
update public.configuracion_plataforma
   set valor = '12',
       descripcion = 'Caracteres del código de estancia que teclea la portería. La base lo genera de 12 y lo compara entero: con menos no encuentra nada.'
 where clave = 'codigo_estancia_largo_minimo';

-- 2. La llamada que nadie contesta: el comentario decía «más de un minuto» y
--    lo decide `llamada_segundos_sin_contestar`.
comment on function public.llamadas_sin_contestar() is
  'Marca como perdidas las llamadas que siguen sonando pasados '
  '`llamada_segundos_sin_contestar` segundos. La tarea corre cada minuto, así '
  'que en la práctica se cierran entre ese tiempo y un minuto más.';
