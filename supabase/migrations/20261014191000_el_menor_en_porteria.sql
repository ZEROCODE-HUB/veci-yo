/*
  El menor en el registro fisico de la porteria (14/10/2026).

  Lo pidio la responsable de producto. Al llegar un menor de una estancia, el
  guardia mira su documento (lo tiene en la mano: no se le ensena ninguna foto)
  y elige una de tres:

    - «Si se parece» -> entra.
    - «No se parece, pero parece estar seguro» -> entra, y se avisa al
      anfitrion para que lo apruebe a mano y se haga responsable.
    - «No se parece, avisar al anfitrion» -> no entra hasta que el anfitrion
      lo revise y lo apruebe.

  Lo elegido queda anotado con quien y cuando. La decision del anfitrion usa
  la misma revision manual que la verificacion de antecedentes
  (`resolver_revision_manual`), que ahora tambien sirve para un menor.

  Y `notificar_anfitrion`: los avisos de la estancia van a quien responde por
  la vivienda (propietario o inquilino lider), no a todos sus miembros: el
  huesped no tiene por que leer que la porteria dudo de su hijo.

  Solo aditiva.
*/

do $$
begin
  if not exists (select 1 from pg_type where typname = 'revision_menor') then
    create type public.revision_menor as enum (
      'se_parece', 'no_se_parece_seguro', 'no_se_parece_revisar'
    );
  end if;
end $$;

alter table public.invitado
  add column if not exists revision_menor revision_menor,
  add column if not exists revision_menor_comentario text,
  add column if not exists revision_menor_por uuid references auth.users(id),
  add column if not exists revision_menor_en timestamptz;

comment on column public.invitado.revision_menor is
  'Lo que la porteria anoto al recibir a un menor de una estancia. Solo la escribe anotar_revision_menor.';

-- ----------------------------------------------------------------------------

create or replace function public.notificar_anfitrion(
  p_unidad_id    uuid,
  p_tipo         motivo_notificacion,
  p_titulo       text,
  p_mensaje      text,
  p_entidad_tipo text default null,
  p_entidad_id   uuid default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.usuario_id is not null
    and m.rol in ('propietario', 'inquilino_lider')
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$$;

comment on function public.notificar_anfitrion(uuid, motivo_notificacion, text, text, text, uuid) is
  'Avisa a quien responde por la vivienda (propietario o inquilino lider), respetando lo que cada uno apago. Interna.';

revoke all on function public.notificar_anfitrion(uuid, motivo_notificacion, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.notificar_anfitrion(uuid, motivo_notificacion, text, text, text, uuid)
  to service_role;

-- ----------------------------------------------------------------------------

create or replace function public.anotar_revision_menor(
  p_invitado_id uuid,
  p_resultado   revision_menor,
  p_comentario  text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.invitado%rowtype;
  v public.visita%rowtype;
begin
  select * into i from public.invitado where id = p_invitado_id;
  select * into v from public.visita where id = i.visita_id;

  if i.id is null or not i.es_menor then
    raise exception 'Esto es solo para un menor';
  end if;
  if not (public.es_guardia_de_condominio(v.condominio_id) and public.puede_ver_visita(v.id)) then
    raise exception 'Solo la porteria del edificio anota esto';
  end if;
  if i.llego then
    raise exception 'Ya entro: esto se anota antes de dejarlo pasar';
  end if;

  perform set_config('veciyo.revision_menor', 'si', true);

  update public.invitado
     set revision_menor            = p_resultado,
         revision_menor_comentario = nullif(btrim(coalesce(p_comentario, '')), ''),
         revision_menor_por        = auth.uid(),
         revision_menor_en         = now()
   where id = i.id;

  if p_resultado <> 'se_parece' then
    perform public.notificar_anfitrion(
      v.unidad_id,
      'menor_por_revisar',
      case p_resultado
        when 'no_se_parece_seguro' then 'Un menor entró y necesita tu aprobación'
        else 'Un menor espera tu revisión en portería'
      end,
      case p_resultado
        when 'no_se_parece_seguro' then
          'La portería dejó entrar a ' || i.nombre || ': no se parece a su documento, pero parecía estar seguro. Apruébalo para hacerte responsable.'
        else
          'La portería no dejó entrar a ' || i.nombre || ': no se parece a su documento. Revísalo antes de que entre.'
      end,
      'visita',
      v.id
    );
  end if;
end;
$$;

comment on function public.anotar_revision_menor(uuid, revision_menor, text) is
  'La porteria anota como recibio a un menor de una estancia. Si duda, avisa al anfitrion.';

revoke all on function public.anotar_revision_menor(uuid, revision_menor, text) from public, anon;
grant execute on function public.anotar_revision_menor(uuid, revision_menor, text) to authenticated;

-- Nadie la escribe por fuera de su funcion (la clave de servicio si: siembra).
create or replace function public.revision_menor_solo_por_su_funcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (new.revision_menor, new.revision_menor_comentario, new.revision_menor_por, new.revision_menor_en)
     is distinct from
     (old.revision_menor, old.revision_menor_comentario, old.revision_menor_por, old.revision_menor_en)
     and coalesce(current_setting('veciyo.revision_menor', true), '') <> 'si'
     and auth.uid() is not null then
    raise exception 'Lo que anoto la porteria sobre el menor solo se cambia desde su boton';
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_revision_menor_solo_por_su_funcion on public.invitado;
create trigger invitado_revision_menor_solo_por_su_funcion
  before update on public.invitado
  for each row execute function public.revision_menor_solo_por_su_funcion();

-- Un menor de una estancia no entra sin que la porteria lo haya mirado.
create or replace function public.menor_confirmado_para_entrar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.es_menor
     and new.llego and not coalesce(old.llego, false)
     and exists (select 1 from public.visita v
                 where v.id = new.visita_id and v.tipo = 'huesped_temporal') then
    if new.revision_menor is null then
      raise exception 'Primero confirma a % con su documento: ¿se parece?', new.nombre;
    end if;
    if new.revision_menor = 'no_se_parece_revisar'
       and new.revision_anfitrion is distinct from 'aprobada' then
      raise exception 'El anfitrion tiene que revisar a % antes de que entre. Ya se le aviso.', new.nombre;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_menor_confirmado_para_entrar on public.invitado;
create trigger invitado_menor_confirmado_para_entrar
  before update on public.invitado
  for each row execute function public.menor_confirmado_para_entrar();

-- La revision manual del anfitrion tambien vale para un menor.
create or replace function public.requiere_revision_manual(p_invitado_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.invitado i
    where i.id = p_invitado_id
      and (
        (
          not i.es_menor
          and (
            i.incapacidad_declarado_por_invitado_id is not null
            or exists (
              select 1 from public.verificacion_antecedentes va
              where va.invitado_id = i.id
                and va.resultado in ('rechazada', 'error_proveedor')
            )
          )
        )
        or (i.es_menor and i.revision_menor in ('no_se_parece_seguro', 'no_se_parece_revisar'))
      )
  );
$$;
