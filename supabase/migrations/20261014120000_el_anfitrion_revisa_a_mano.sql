/*
  La revision manual del anfitrion (14/10/2026).

  Lo pidio la responsable de producto: cuando el informe de antecedentes trae
  un hallazgo, o cuando el titular declaro que un acompanante no puede hacer su
  registro (incapacidad), la estancia «requiere aprobacion manual» del
  anfitrion. Ahi ve el informe y decide, y su decision queda anotada con quien
  y cuando: es el quien se hace responsable.

  Tambien cuando la consulta no se pudo hacer (fuentes caidas, la persona
  prohibio que la consulten): sin informe, alguien tiene que decidir.

  No bloquea por si sola --el cliente: «no se bloquea solo»--. Lo que si
  bloquea es un **rechazo** explicito: la porteria no puede marcar su entrada.

  Solo aditiva: un enum, columnas, dos funciones y un disparador nuevo.
*/

do $$
begin
  if not exists (select 1 from pg_type where typname = 'decision_revision') then
    create type public.decision_revision as enum ('aprobada', 'rechazada');
  end if;
end $$;

alter table public.invitado
  add column if not exists revision_anfitrion decision_revision,
  add column if not exists revision_anfitrion_nota text,
  add column if not exists revision_anfitrion_por uuid references auth.users(id),
  add column if not exists revision_anfitrion_en timestamptz;

comment on column public.invitado.revision_anfitrion is
  'Lo que decidio el anfitrion cuando la verificacion requeria revision manual (hallazgo, consulta imposible o incapacidad declarada). Solo la escribe resolver_revision_manual.';

alter table public.verificacion_antecedentes
  add column if not exists reporte_path text;

comment on column public.verificacion_antecedentes.reporte_path is
  'El informe en PDF, con marca de agua de confidencial, en el bucket privado. Lo genera la funcion reporte-antecedentes la primera vez que el anfitrion lo pide.';

/* Cuando hace falta que el anfitrion decida. */
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
      and not i.es_menor
      and (
        i.incapacidad_declarado_por_invitado_id is not null
        or exists (
          select 1 from public.verificacion_antecedentes va
          where va.invitado_id = i.id
            and va.resultado in ('rechazada', 'error_proveedor')
        )
      )
  );
$$;

comment on function public.requiere_revision_manual(uuid) is
  'Verdadero si esa persona necesita la decision del anfitrion: hallazgo en el informe, consulta que no se pudo hacer o incapacidad declarada por el titular.';

grant execute on function public.requiere_revision_manual(uuid) to authenticated;

create or replace function public.resolver_revision_manual(
  p_invitado_id uuid,
  p_aprobar     boolean,
  p_nota        text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_anfitrion_del_invitado(p_invitado_id) then
    raise exception 'Solo el anfitrion del alojamiento puede decidir esto';
  end if;

  if not public.requiere_revision_manual(p_invitado_id) then
    raise exception 'Esta persona no necesita revision manual';
  end if;

  if not p_aprobar and coalesce(btrim(p_nota), '') = '' then
    raise exception 'Escribe por que no la autorizas';
  end if;

  perform set_config('veciyo.revision_anfitrion', 'si', true);

  update public.invitado
     set revision_anfitrion      = case when p_aprobar then 'aprobada' else 'rechazada' end::decision_revision,
         revision_anfitrion_nota = nullif(btrim(coalesce(p_nota, '')), ''),
         revision_anfitrion_por  = auth.uid(),
         revision_anfitrion_en   = now()
   where id = p_invitado_id;
end;
$$;

comment on function public.resolver_revision_manual(uuid, boolean, text) is
  'El anfitrion aprueba (bajo su responsabilidad) o rechaza a una persona que requiere revision manual. Queda anotado quien y cuando.';

revoke all on function public.resolver_revision_manual(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_revision_manual(uuid, boolean, text) to authenticated;

/*
  La decision es una afirmacion sobre una persona: nadie la escribe por la
  puerta de atras. La porteria y el anfitrion pueden editar filas de invitado
  por RLS, y RLS no sabe comparar el valor viejo con el nuevo.
*/
create or replace function public.revision_solo_por_su_funcion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (new.revision_anfitrion, new.revision_anfitrion_nota,
      new.revision_anfitrion_por, new.revision_anfitrion_en)
     is distinct from
     (old.revision_anfitrion, old.revision_anfitrion_nota,
      old.revision_anfitrion_por, old.revision_anfitrion_en)
     and coalesce(current_setting('veciyo.revision_anfitrion', true), '') <> 'si'
     and auth.uid() is not null then
    raise exception 'La revision del anfitrion solo se cambia desde su boton';
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_revision_solo_por_su_funcion on public.invitado;
create trigger invitado_revision_solo_por_su_funcion
  before update on public.invitado
  for each row execute function public.revision_solo_por_su_funcion();

/* Un rechazo del anfitrion cierra la puerta. */
create or replace function public.no_entra_si_el_anfitrion_lo_rechazo()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.revision_anfitrion = 'rechazada'
     and (
       (new.llego and not coalesce(old.llego, false))
       or (new.ingreso_en is not null and old.ingreso_en is null)
     ) then
    raise exception 'El anfitrion no autorizo la entrada de %. Llamalo antes de dejarlo pasar.', new.nombre;
  end if;
  return new;
end;
$$;

drop trigger if exists invitado_no_entra_si_el_anfitrion_lo_rechazo on public.invitado;
create trigger invitado_no_entra_si_el_anfitrion_lo_rechazo
  before update on public.invitado
  for each row execute function public.no_entra_si_el_anfitrion_lo_rechazo();
