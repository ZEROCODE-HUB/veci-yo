-- ----------------------------------------------------------------------------
-- Un canal se puede silenciar
-- ----------------------------------------------------------------------------
-- Lo pidio el cliente el 02/10/2026. Hoy no hay nada: el canal de residentes
-- de un edificio de cien viviendas suena igual que el hilo con la porteria, y
-- la unica salida era no mirar.
--
-- Va en `participante_conversacion` y no en `perfil` porque es por
-- conversacion y por persona: silenciar el canal de residentes no es silenciar
-- el chat.
--
-- ----------------------------------------------------------------------------
-- Que apaga exactamente, hoy
-- ----------------------------------------------------------------------------
-- Conviene decirlo sin adornos, porque una casilla que no apaga nada es el
-- defecto mas repetido de este proyecto --ocho casillas decorativas van
-- contadas--.
--
-- Un mensaje de chat **no genera notificacion** en VeciYo: `motivo_notificacion`
-- no tiene ningun valor para eso y nadie inserta en `notificacion` al enviar un
-- mensaje. Asi que lo que hay que apagar, hoy, es lo unico que hay: el
-- **contador de no leidos** de la lista de chats, que es la bolita que hace
-- que uno entre.
--
-- Ese contador lo cuenta el cliente --`obtenerConversaciones` en
-- `chat.repo.ts`-- con los mensajes que ya se trae para enseñar el ultimo. Asi
-- que lo que hace esta migracion es **dar el dato**: la columna viaja en la
-- fila de participante, que la consulta ya pide. El contador se apaga en el
-- repositorio, donde se cuenta.
--
-- El dia que el chat avise de verdad, esta misma columna es la que hay que
-- mirar **antes** de insertar en `notificacion`, y esta puesto en el comentario
-- de la columna para que no se olvide.
--
-- Aditiva: una columna y una funcion nueva.

alter table public.participante_conversacion
  add column if not exists silenciado boolean not null default false;

comment on column public.participante_conversacion.silenciado is
  'Si esta persona silencio esta conversacion. Hoy apaga el contador de no leidos, que es el unico aviso que existe: un mensaje de chat todavia no genera notificacion. Cuando lo genere, hay que mirar esta columna ANTES de insertar en `notificacion`.';

-- ----------------------------------------------------------------------------
-- Silenciar y volver a oir
-- ----------------------------------------------------------------------------
-- Una funcion y no un `upsert` desde la aplicacion, por dos razones:
--
--   · la fila de participante nace al entrar a leer, asi que silenciar sin
--     haber entrado tiene que poder crearla, y eso es un `insert ... on
--     conflict` que la aplicacion tendria que armar bien cada vez;
--   · y el `usuario_id` lo pone la base con `auth.uid()`, no el cliente. Es la
--     regla 3: quien hace algo lo decide la base.

create or replace function public.silenciar_conversacion(
  p_conversacion_id uuid,
  p_silenciar       boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  -- `security invoker` a proposito: asi la politica `participante_propio`
  -- sigue decidiendo --exige `usuario_id = auth.uid()` **y** ver la
  -- conversacion--. Con `definer` se podria silenciar el hilo de cualquiera
  -- pasando su id, que es justo lo que no se quiere.
  insert into public.participante_conversacion (conversacion_id, usuario_id, silenciado)
  values (p_conversacion_id, auth.uid(), p_silenciar)
  on conflict (conversacion_id, usuario_id)
    do update set silenciado = excluded.silenciado;

  return p_silenciar;
end;
$fn$;

comment on function public.silenciar_conversacion is
  'Silencia o vuelve a oir una conversacion para quien llama. `security invoker` a proposito: la politica sigue decidiendo y nadie silencia el hilo de otro.';

revoke all on function public.silenciar_conversacion(uuid, boolean) from public;
grant execute on function public.silenciar_conversacion(uuid, boolean) to authenticated;
