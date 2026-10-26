-- El chat admite adjuntos: una foto o un PDF (hueco 8).
--
-- El cliente respondió el 21/10/2026, sobre el comprobante de pago de una zona
-- común: «Dejar ambos funcionales». El adjunto dentro de la reserva ya
-- funcionaba; el otro camino que dice el KT (flujo 4.4) --mandarlo por el chat
-- a la administración-- no existía: el chat solo llevaba texto, y aun así la
-- reserva le decía al vecino que lo mandara por ahí.
--
-- Un adjunto vive en el bucket privado `chat`, en una carpeta por
-- conversación. Lo lee y lo sube quien puede ver esa conversación, que es la
-- misma regla que los mensajes.
--
-- Solo aditiva: un bucket, tres políticas, tres columnas, una restricción y la
-- función que lee los mensajes (cambia lo que devuelve, así que se recrea).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy chat_lectura_adjuntos on storage.objects for select to authenticated
  using (bucket_id = 'chat' and public.puede_ver_conversacion(((storage.foldername(name))[1])::uuid));
create policy chat_alta_adjuntos on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and public.puede_ver_conversacion(((storage.foldername(name))[1])::uuid));

alter table public.mensaje
  add column if not exists adjunto_path text,
  add column if not exists adjunto_nombre text,
  add column if not exists adjunto_tipo text;

-- El adjunto vive en la carpeta de su conversación: nadie cuelga en un hilo
-- un archivo de otro.
alter table public.mensaje
  add constraint mensaje_adjunto_de_su_conversacion
  check (adjunto_path is null or split_part(adjunto_path, '/', 1) = conversacion_id::text);

comment on column public.mensaje.adjunto_path is
  'Ruta del archivo adjunto en el bucket `chat` (carpeta = la conversación). Nulo = mensaje solo de texto. Hueco 8 (21/10/2026): para mandar, por ejemplo, el comprobante de pago de una zona.';
comment on column public.mensaje.adjunto_nombre is
  'Nombre del archivo adjunto como lo eligió quien lo mandó; es lo que se enseña en el chat.';
comment on column public.mensaje.adjunto_tipo is
  'Tipo del archivo adjunto (image/jpeg, application/pdf...).';

drop function if exists public.mensajes_de_conversacion(uuid);
create function public.mensajes_de_conversacion(p_conversacion_id uuid)
returns table (
  id uuid,
  texto text,
  enviado_en timestamptz,
  autor_id uuid,
  autor_nombre text,
  autor_unidad text,
  retirado_por text,
  adjunto_path text,
  adjunto_nombre text,
  adjunto_tipo text
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
    end,
    -- Un mensaje retirado tampoco enseña su adjunto.
    case when m.deleted_at is null then m.adjunto_path end,
    case when m.deleted_at is null then m.adjunto_nombre end,
    case when m.deleted_at is null then m.adjunto_tipo end
  from public.mensaje m
  where m.conversacion_id = p_conversacion_id
    -- `security definer` apaga las políticas, así que el permiso se comprueba
    -- aquí y es el mismo que decía `mensaje_lectura`.
    and public.puede_ver_conversacion(p_conversacion_id)
  order by m.enviado_en;
$$;

comment on function public.mensajes_de_conversacion(uuid) is
  'Los mensajes de una conversación, con lápida en los retirados: la fila sale pero ni el texto ni el adjunto. Es `security definer` porque RLS decide filas y no columnas, y dejar pasar la fila retirada por la política dejaría su texto legible por PostgREST.';

revoke execute on function public.mensajes_de_conversacion(uuid) from public, anon;
grant execute on function public.mensajes_de_conversacion(uuid) to authenticated, service_role;
