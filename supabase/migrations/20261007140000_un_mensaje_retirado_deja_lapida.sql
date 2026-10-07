-- Un mensaje retirado deja lápida
--
-- REVISAR-A-OJO 137. Lo decidió el cliente el 07/10/2026: «sí, usemos ese
-- mensaje retirado».
--
-- Hasta hoy un mensaje retirado **desaparecía sin dejar hueco**: la
-- conversación quedaba como si nunca hubiera habido nada. Lo que se discutió
-- al decidirlo es que así una conversación pierde mensajes en silencio y
-- después se discute sobre lo que se dijo.
--
-- ----------------------------------------------------------------------------
-- Por qué esto no se hace relajando la política de lectura
-- ----------------------------------------------------------------------------
-- La salida obvia --quitarle el `deleted_at is null` a `mensaje_lectura`-- es
-- la mala, y conviene que quede escrito por qué:
--
--     RLS decide **qué filas** se ven, no qué columnas. Dejar pasar la fila
--     retirada deja pasar su `texto`.
--
-- Y `mensaje` se lee por PostgREST, así que cualquiera de la conversación
-- podría pedir la tabla directamente y leer exactamente lo que la
-- administración acababa de retirar. O sea que la moderación quedaría en un
-- adorno de la pantalla: el defecto más repetido de este proyecto, «la
-- decisión vivía en la pantalla, no en el dato», esta vez con un agujero de
-- privacidad dentro.
--
-- La otra salida tentadora --sobrescribir el texto al retirarlo-- destruye la
-- prueba. Si alguien reclama por lo que se dijo, ya no hay qué mirar.
--
-- Así que la fila sigue escondida para la lectura directa y el hilo se pide
-- por una función que **devuelve la lápida en vez del texto**. El texto se
-- queda en la base, donde estaba, y no sale por ningún sitio.
--
-- Es el mismo patrón que `retirar_mensaje`: la política es el techo, y lo que
-- necesita decidir por columna lo hace una función que comprueba el permiso
-- ella misma.

create or replace function public.mensajes_de_conversacion(
  p_conversacion_id uuid
)
returns table (
  id uuid,
  texto text,
  enviado_en timestamptz,
  autor_id uuid,
  autor_nombre text,
  autor_unidad text,
  /**
   * `autor`, `administracion` o null si el mensaje sigue publicado. Es lo que
   * decide qué lápida se pinta: «Mensaje retirado» no es lo mismo que
   * «Mensaje retirado por la administración», y la diferencia importa
   * justamente cuando alguien pregunta por qué falta algo.
   */
  retirado_por text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    m.id,
    -- La lápida: el texto no sale. Lo pinta la pantalla a partir de
    -- `retirado_por`, y así no hay un literal que traducir en la base.
    case when m.deleted_at is null then m.texto end,
    m.enviado_en,
    m.autor_id,
    m.autor_nombre,
    m.autor_unidad,
    case
      when m.deleted_at is null then null
      when m.eliminado_por is null then 'autor'
      else 'administracion'
    end
  from public.mensaje m
  where m.conversacion_id = p_conversacion_id
    -- `security definer` apaga las políticas, así que el permiso se comprueba
    -- aquí y es el mismo que decía `mensaje_lectura`. Sin esta línea, la
    -- función entregaría cualquier conversación del sistema a cualquiera.
    and public.puede_ver_conversacion(p_conversacion_id)
  order by m.enviado_en;
$$;

comment on function public.mensajes_de_conversacion(uuid) is
  'Los mensajes de una conversacion, con lapida en los retirados: la fila sale '
  'pero el texto no. Es `security definer` porque RLS decide filas y no '
  'columnas, y dejar pasar la fila retirada por la politica dejaria su texto '
  'legible por PostgREST.';

revoke all on function public.mensajes_de_conversacion(uuid) from public, anon;
grant execute on function public.mensajes_de_conversacion(uuid) to authenticated, service_role;

-- Y el comentario de la política, que vuelve a quedarse corto ---------------
--
-- Decia «un mensaje retirado desaparece del hilo, no deja lapida». Ya no es
-- verdad por donde lo lee la aplicacion. Por la tabla directa sigue siendolo,
-- y eso es lo que hay que decir: las dos cosas, porque las dos son ciertas y
-- el matiz es justo el que sostiene la privacidad.

comment on policy mensaje_lectura on public.mensaje is
  'La fila retirada no sale por la tabla: asi su texto no es legible por '
  'PostgREST despues de moderarlo. El hilo se pide con '
  '`mensajes_de_conversacion`, que si devuelve el hueco --con la lapida-- pero '
  'nunca el texto.';

comment on policy mensaje_baja_propia on public.mensaje is
  'Retirar el mensaje propio. Lo que puede cambiar un UPDATE lo limita el '
  'disparador `mensaje_no_se_reescribe`: solo `deleted_at`. El hilo lo enseña '
  'despues como «Mensaje retirado», sin el texto.';
