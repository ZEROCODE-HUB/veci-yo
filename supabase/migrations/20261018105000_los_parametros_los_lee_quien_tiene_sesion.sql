-- Los parámetros los lee quien tiene sesión (18/10/2026).
--
-- Aditiva: solo permisos.
--
-- parametro() nació cerrado a las sesiones. Pero los valores por defecto de las
-- columnas pasan a leer parámetros (una zona nueva nace con la franja del
-- parámetro, no con un 30 escrito en la tabla), y un valor por defecto se
-- calcula con el rol de quien inserta: una administradora que crea una zona
-- desde la app necesita poder leerlo.
--
-- No hay riesgo en leerlos: por diseño ningún parámetro es secreto (las claves
-- de Tus Datos, de la TRA o del correo siguen siendo secretos del servidor, y
-- así lo dice el comentario de la tabla). Lo que sigue cerrado es **escribir**:
-- ninguna sesión tiene política de escritura. Y quien no tiene sesión (el
-- huésped en la web) sigue viendo solo los públicos, por parametros_publicos.

grant execute on function public.parametro(text, uuid) to authenticated;
grant execute on function public.parametro_entero(text, uuid) to authenticated;
grant execute on function public.parametro_decimal(text, uuid) to authenticated;
grant execute on function public.parametro_booleano(text, uuid) to authenticated;
grant execute on function public.parametro_lista(text, uuid) to authenticated;

comment on function public.parametro(text, uuid) is
  'El valor efectivo de un parámetro (el del edificio, o el general, o el de fábrica). Revienta si la '
  'clave no existe. La pueden llamar las funciones y quien tiene sesión; los parámetros no guardan secretos.';

comment on table public.configuracion_plataforma is
  'Los parámetros de Veciyo: todo valor de negocio que antes estaba escrito en el código '
  '(días, topes, horas, interruptores). Una fila por parámetro. Se cambia desde el panel de '
  'Supabase editando "valor"; cada cambio queda en configuracion_historial. Si un edificio '
  'necesita otro valor y el ámbito es "edificio", va en parametro_condominio. '
  'NUNCA guardar aquí claves ni contraseñas: cualquiera con sesión puede leer estos valores.';
