-- ----------------------------------------------------------------------------
-- La administracion modera, y un mensaje enviado no se reescribe
-- ----------------------------------------------------------------------------
-- El cliente pidio el 02/10/2026 «moderacion del administrador». Hoy la unica
-- politica de UPDATE sobre `mensaje` es esta:
--
--     create policy mensaje_baja_propia on public.mensaje
--       for update to authenticated
--       using (autor_id = auth.uid())
--       with check (autor_id = auth.uid());
--
-- Asi que la administracion **no puede retirar** nada de un canal: un vecino
-- insulta a otro en el canal de residentes y el mensaje se queda ahi para
-- siempre. Es la mitad que falta de que el canal lo vea la administracion.
--
-- ----------------------------------------------------------------------------
-- Y el agujero que apareció al leerla
-- ----------------------------------------------------------------------------
-- Esa politica lleva este comentario, escrito el 22/09:
--
--     'Solo para fijar `deleted_at`. El texto de un mensaje ya enviado no se
--      reescribe.'
--
-- **No lo sujeta nada.** Es un `for update` sobre toda la fila: el autor de un
-- mensaje puede cambiarle el `texto`, y de paso el `autor_nombre`, cuando
-- quiera. O sea que se puede escribir algo en el canal, dejar que lo lean, y
-- reescribirlo despues por otra cosa --y la pantalla no distingue un mensaje
-- editado de uno que siempre dijo eso--.
--
-- Es la forma exacta que ya esta documentada en AGENTS.md: «un arreglo a
-- medias es peor si lleva comentario», porque el siguiente que lea el archivo
-- da el asunto por cerrado. Aqui no habia ni medio arreglo: habia solo el
-- comentario.
--
-- No lo ve ninguna prueba. Las de RLS comprueban **quien** puede escribir, y
-- el autor puede; lo que nadie comprobaba es **que** puede cambiar.
--
-- Va en un disparador y no en la politica porque RLS no sabe comparar el valor
-- viejo con el nuevo. Es la misma razon por la que `verificado` y los roles se
-- sujetan con disparadores, y esta escrito como regla en AGENTS.md.
--
-- Aditiva: dos columnas, un disparador y una politica mas.

alter table public.mensaje
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null;

comment on column public.mensaje.eliminado_por is
  'Quien lo retiro. Null cuando lo retiro su propio autor; con valor cuando lo modero la administracion. Hace falta para que «lo quito la administracion» no se confunda con «me arrepenti».';

create index if not exists mensaje_moderado_idx
  on public.mensaje (eliminado_por)
  where eliminado_por is not null;

-- ----------------------------------------------------------------------------
-- Lo unico que se puede cambiar de un mensaje enviado
-- ----------------------------------------------------------------------------

create or replace function public.mensaje_enviado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  -- Lo que puede cambiar: retirarlo. Nada mas. `updated_at` lo pone su propio
  -- disparador y no se comprueba aqui.
  if new.texto           is distinct from old.texto
     or new.autor_id     is distinct from old.autor_id
     or new.autor_nombre is distinct from old.autor_nombre
     or new.autor_unidad is distinct from old.autor_unidad
     or new.conversacion_id is distinct from old.conversacion_id
     or new.enviado_en   is distinct from old.enviado_en then
    raise exception 'Un mensaje enviado no se reescribe: solo se puede retirar'
      using errcode = 'check_violation';
  end if;

  -- Y retirar es de ida: volver a publicar lo que alguien retiro --o lo que
  -- modero la administracion-- seria otra cosa, y no se ha pedido.
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Un mensaje retirado no se vuelve a publicar'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

comment on function public.mensaje_enviado_no_se_reescribe is
  'Un UPDATE sobre `mensaje` solo puede retirarlo. La politica decia esto en un comentario desde el 22/09/2026 y no lo sujetaba nada: el autor podia cambiarle el texto a un mensaje ya leido.';

drop trigger if exists mensaje_no_se_reescribe on public.mensaje;
create trigger mensaje_no_se_reescribe
  before update on public.mensaje
  for each row execute function public.mensaje_enviado_no_se_reescribe();

-- ----------------------------------------------------------------------------
-- La administracion retira un mensaje de un canal
-- ----------------------------------------------------------------------------
-- Solo de un **canal**, no de un hilo de area ni de una conversacion directa.
-- El hilo de un vecino con la porteria no lo lee la administracion --D-13-- y
-- lo que no se lee tampoco se modera; una conversacion directa entre dos
-- vecinos es asunto suyo.
--
-- La puerta para una queja sobre lo que se dijo en un sitio que la
-- administracion no ve sigue siendo la PQRS, que a proposito no se puede
-- borrar.

drop policy if exists mensaje_moderacion on public.mensaje;
create policy mensaje_moderacion on public.mensaje
  for update to authenticated
  using (
    exists (
      select 1 from public.conversacion c
      where c.id = conversacion_id
        and c.tipo = 'grupo'
        and public.puede_coadmin(c.condominio_id, 'contestarChat')
    )
  )
  with check (
    exists (
      select 1 from public.conversacion c
      where c.id = conversacion_id
        and c.tipo = 'grupo'
        and public.puede_coadmin(c.condominio_id, 'contestarChat')
    )
  );

comment on policy mensaje_moderacion on public.mensaje is
  'La administracion retira un mensaje de un canal del edificio. Solo de un canal: un hilo con la porteria no lo lee --D-13-- y una conversacion directa es de quienes hablan. Lo que puede cambiar lo limita `mensaje_no_se_reescribe`.';

-- ----------------------------------------------------------------------------
-- Retirar, con constancia de quien
-- ----------------------------------------------------------------------------
-- Y aqui aparecio el defecto de verdad, que no era la moderacion: **nadie
-- podia retirar un mensaje, ni el suyo propio**.
--
-- La politica estaba bien --`autor_id = auth.uid()` en el `using` y en el
-- `with check`-- y aun asi el `update` respondia «new row violates row-level
-- security policy for table "mensaje"». Con la politica sustituida por
-- `with check (true)` fallaba igual, lo cual descarta la politica de UPDATE.
--
-- La culpable era la de **lectura**:
--
--     create policy mensaje_lectura on public.mensaje for select
--       using (deleted_at is null and public.puede_ver_conversacion(...));
--
-- Postgres aplica las politicas de SELECT como *with check option* sobre la
-- fila **nueva** de un UPDATE. Poner `deleted_at` hace que la fila nueva deje
-- de pasar esa politica, asi que el propio borrado logico se rechaza a si
-- mismo. El error no menciona la lectura en ninguna parte --`ExecWithCheckOptions`,
-- y se queda ahi-- asi que se busca en el sitio equivocado.
--
-- Es una trampa general de este patron: **una politica de SELECT que esconde
-- lo borrado hace imposible borrarlo desde una sesion de persona.** No es de
-- este proyecto: le pasa a cualquier tabla con borrado logico y RLS.
--
-- Dos salidas. Relajar la lectura --y entonces un mensaje retirado se sigue
-- leyendo, que es justo lo contrario de retirarlo-- o que el borrado pase por
-- una funcion `security definer` que compruebe el permiso ella misma. Se hace
-- lo segundo, que es el patron que el proyecto ya usa en
-- `verificar_antecedentes` -> `anotar_verificacion`: la publica comprueba
-- quien pide, la interna hace.
--
-- Las dos politicas de UPDATE se quedan. No sirven para esto --ninguna puede--
-- pero siguen siendo el techo para cualquier otro cambio sobre un mensaje, y
-- quitarlas dejaria la tabla sin limite por ese lado.

create or replace function public.retirar_mensaje(p_mensaje_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_autor       uuid;
  v_tipo        public.tipo_conversacion;
  v_condominio  uuid;
begin
  select m.autor_id, c.tipo, c.condominio_id
    into v_autor, v_tipo, v_condominio
  from public.mensaje m
  join public.conversacion c on c.id = m.conversacion_id
  where m.id = p_mensaje_id and m.deleted_at is null;

  if v_autor is null then
    raise exception 'Ese mensaje no existe o ya se retiro'
      using errcode = 'no_data_found';
  end if;

  /*
    `security definer` significa que las politicas ya no deciden: el permiso se
    comprueba aqui, entero, y es el mismo que decian las dos politicas.

      · su autor, siempre, en cualquier conversacion;
      · la administracion, solo en un **canal**. Un hilo con la porteria no lo
        lee --D-13-- y lo que no se lee tampoco se modera; una conversacion
        directa entre dos vecinos es asunto suyo.

    La puerta para una queja sobre lo dicho en un sitio que la administracion
    no ve sigue siendo la PQRS, que a proposito no se puede borrar.
  */
  if v_autor <> auth.uid()
     and not (v_tipo = 'grupo'
              and public.puede_coadmin(v_condominio, 'contestarChat')) then
    raise exception 'No puedes retirar ese mensaje'
      using errcode = 'insufficient_privilege';
  end if;

  update public.mensaje m
  set deleted_at = now(),
      -- Null cuando se retira a si mismo. Con valor es «lo quito la
      -- administracion», que es lo que la pantalla tiene que poder distinguir.
      eliminado_por = case when v_autor = auth.uid() then null else auth.uid() end
  where m.id = p_mensaje_id;

  return true;
end;
$fn$;

comment on function public.retirar_mensaje is
  'Retira un mensaje y deja constancia de si lo quito su autor o la administracion. `security definer` por necesidad: las politicas de SELECT se aplican a la fila nueva de un UPDATE, y `mensaje_lectura` exige `deleted_at is null`, asi que el borrado logico se rechazaba a si mismo. El permiso se comprueba dentro.';

revoke all on function public.retirar_mensaje(uuid) from public;
grant execute on function public.retirar_mensaje(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Y el comentario, que decia dos cosas y las dos eran falsas
-- ----------------------------------------------------------------------------
-- Decia: «Solo para fijar `deleted_at`. El texto de un mensaje ya enviado no se
-- reescribe.» La primera mitad ya la sujeta el disparador de arriba. La segunda
-- --«se ve que se borro», en el comentario de la migracion original-- tampoco
-- es verdad: `mensaje_lectura` exige `deleted_at is null`, asi que un mensaje
-- retirado **desaparece** del hilo sin dejar hueco ni lapida.
--
-- Que deberia quedar a la vista cuando la administracion retira algo no lo
-- decido yo: esta en REVISAR-A-OJO. Lo que no se queda es un comentario que
-- afirma lo contrario de lo que pasa.

comment on policy mensaje_baja_propia on public.mensaje is
  'Retirar el mensaje propio. Lo que puede cambiar un UPDATE lo limita el disparador `mensaje_no_se_reescribe`: solo `deleted_at`. Y ojo: un mensaje retirado desaparece del hilo --`mensaje_lectura` exige `deleted_at is null`-- no deja lapida.';
