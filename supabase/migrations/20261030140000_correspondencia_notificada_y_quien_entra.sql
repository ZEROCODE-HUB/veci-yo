-- Correspondencia: «notificado por otro medio» y quién entra a entregar en
-- puerta (30/10/2026).
--
-- Dos pedidos del cliente:
--   · Para Claude 198: la portería puede dejar constancia de que avisó al
--     destinatario por otro medio (una llamada, un mensaje) sin que eso sea
--     entregarlo. Se guarda cuándo y quién, y sale en «Progreso de entrega».
--   · Para Claude 196: en una entrega en puerta entra alguien de fuera al
--     edificio. Se guarda su nombre y la foto de su documento, para saber
--     quién entró.
--
-- Solo aditiva: columnas nuevas, una función nueva y una reemplazada (la de
-- los nombres, que ahora devuelve también quién notificó).

alter table public.correspondencia
  add column if not exists notificada_otro_medio_en timestamptz,
  add column if not exists notificada_otro_medio_por uuid
    references auth.users(id) on delete set null,
  add column if not exists ingreso_nombre text,
  add column if not exists ingreso_documento_foto text;

comment on column public.correspondencia.notificada_otro_medio_en is
  'Cuándo la portería avisó al destinatario por otro medio (llamada, mensaje). No es una entrega: el estado no cambia (30/10/2026).';
comment on column public.correspondencia.notificada_otro_medio_por is
  'Quién dejó constancia del aviso por otro medio.';
comment on column public.correspondencia.ingreso_nombre is
  'En una entrega en puerta, el nombre completo de la persona de fuera que entra al edificio a entregarla (30/10/2026).';
comment on column public.correspondencia.ingreso_documento_foto is
  'En una entrega en puerta, la ruta en el bucket «correspondencia» de la foto del documento de quien entra.';

create or replace function public.notificar_correspondencia_por_otro_medio(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_unidad uuid;
  v_estado public.estado_correspondencia;
begin
  select c.unidad_id, c.estado into v_unidad, v_estado
  from public.correspondencia c
  where c.id = p_id and c.deleted_at is null;

  if v_unidad is null or not public.puede_operar_unidad(v_unidad) then
    raise exception 'No tienes permiso para cambiar esta correspondencia';
  end if;
  if v_estado = 'entregado' then
    raise exception 'Esta correspondencia ya se entregó';
  end if;

  update public.correspondencia
     set notificada_otro_medio_en = now(),
         notificada_otro_medio_por = auth.uid()
   where id = p_id;
end;
$function$;

comment on function public.notificar_correspondencia_por_otro_medio(uuid) is
  'Deja constancia de que se avisó al destinatario por otro medio, con la hora y quién. No cambia el estado del envío (30/10/2026).';

revoke execute on function public.notificar_correspondencia_por_otro_medio(uuid) from public, anon;
grant execute on function public.notificar_correspondencia_por_otro_medio(uuid) to authenticated, service_role;

drop function if exists public.nombres_de_correspondencia(uuid[]);

create function public.nombres_de_correspondencia(p_ids uuid[])
 returns table(correspondencia_id uuid, registrada_por text, recibida_por text, notificada_por text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
    c.id,
    nullif(btrim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), ''),
    nullif(btrim(coalesce(pc.nombre, '') || ' ' || coalesce(pc.apellido, '')), ''),
    nullif(btrim(coalesce(pn.nombre, '') || ' ' || coalesce(pn.apellido, '')), '')
  from public.correspondencia c
  left join public.perfil pr on pr.id = c.registrada_por
  left join public.perfil pc on pc.id = c.recibida_por
  left join public.perfil pn on pn.id = c.notificada_otro_medio_por
  where c.id = any(p_ids)
    and (
      public.es_miembro_unidad(c.unidad_id)
      or public.es_guardia_de_condominio(public.condominio_de_unidad(c.unidad_id))
      or public.puede_coadmin(public.condominio_de_unidad(c.unidad_id), 'visualizarCorrespondencia')
      or (c.huesped_id = auth.uid() and public.es_huesped_alojado(c.unidad_id))
    );
$function$;

revoke execute on function public.nombres_de_correspondencia(uuid[]) from public, anon;
grant execute on function public.nombres_de_correspondencia(uuid[]) to authenticated, service_role;
