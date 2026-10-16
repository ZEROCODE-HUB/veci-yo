-- ----------------------------------------------------------------------------
-- La portería se entera de lo que decide el anfitrión sobre un menor
-- (15/10/2026, hueco 18)
-- ----------------------------------------------------------------------------
-- Cuando la portería no ve parecido entre un menor y su documento, lo deja en
-- espera --o lo deja pasar «porque parece estar seguro»-- y al anfitrión le
-- llega el aviso. El anfitrión aprobaba o rechazaba, y ahí se acababa: la
-- portería, que tiene al menor delante, no se enteraba hasta volver a mirar.
--
-- Ahora, al decidir sobre un menor que la portería marcó, les llega el aviso a
-- los guardias activos del edificio. No solo a quien lo marcó: puede haber
-- cambiado el turno.

create or replace function public.resolver_revision_manual(
  p_invitado_id uuid,
  p_aprobar boolean,
  p_nota text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  i public.invitado%rowtype;
  v public.visita%rowtype;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  if not public.es_anfitrion_del_invitado(p_invitado_id) then
    raise exception 'Solo el anfitrion del alojamiento puede decidir esto';
  end if;

  if not public.requiere_revision_manual(p_invitado_id) then
    raise exception 'Esta persona no necesita revision manual';
  end if;

  if not p_aprobar and v_nota is null then
    raise exception 'Escribe por que no la autorizas';
  end if;

  perform set_config('veciyo.revision_anfitrion', 'si', true);

  update public.invitado
     set revision_anfitrion      = case when p_aprobar then 'aprobada' else 'rechazada' end::decision_revision,
         revision_anfitrion_nota = v_nota,
         revision_anfitrion_por  = auth.uid(),
         revision_anfitrion_en   = now()
   where id = p_invitado_id
  returning * into i;

  -- Un menor que la portería marcó: que lo sepa la portería (hueco 18).
  if i.es_menor and i.revision_menor in ('no_se_parece_revisar', 'no_se_parece_seguro') then
    select * into v from public.visita where id = i.visita_id;

    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select distinct mc.usuario_id, v.condominio_id, 'menor_revisado'::public.motivo_notificacion,
      case when p_aprobar then 'El anfitrión aprobó a un menor'
           else 'El anfitrión no autorizó a un menor' end,
      case
        when p_aprobar and i.revision_menor = 'no_se_parece_revisar' then
          i.nombre || ' ya puede entrar: el anfitrión lo aprobó y se hace responsable.'
        when p_aprobar then
          'El anfitrión aprobó a ' || i.nombre || ' y se hace responsable.'
        when i.revision_menor = 'no_se_parece_revisar' then
          i.nombre || ' no puede entrar. Motivo del anfitrión: ' || v_nota
        else
          'El anfitrión no autorizó a ' || i.nombre || ', que ya entró. Motivo: ' || v_nota
      end,
      'visita', v.id
    from public.membresia_condominio mc
    where mc.condominio_id = v.condominio_id
      and mc.rol = 'guardia'
      and mc.activo
      and mc.usuario_id is not null
      and public.quiere_aviso(mc.usuario_id, 'menor_revisado', 'app');
  end if;
end;
$function$;
