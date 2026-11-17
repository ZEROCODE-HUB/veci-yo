-- La portería vuelve a registrar visitas, pero solo de amigos o familia y de
-- profesionales temporales (16/11/2026, pedido del cliente: «Guardias debe
-- poder registrar visitas — Nombres, Documento, Foto, Hora, Fecha, Comentario
-- opcional, Nro de Dpto y quién lo autoriza. Si es Amigo o Familiar no pide
-- documento, depende de la regla del edificio»; decidido: «solo amigos o
-- familiares y profesional temporal»).
--
-- El 02/11/2026 (`20261102120000_el_guardia_no_registra_visitas.sql`) se le
-- quitó al guardia el alta de visitas, a petición del mismo cliente (Para
-- Claude 200). Aquí se reabre **solo** eso y con límites:
--
--   · solo el guardia **activo** del mismo edificio de la visita;
--   · solo `amigos` y `temporal`: nunca `permanente` ni `huesped_temporal`,
--     que siguen siendo de la vivienda o de la administración;
--   · la vivienda tiene que ser de ese edificio. La tabla no lo garantiza
--     (`unidad_id` y `condominio_id` son dos FK sueltas), así que sin esta
--     comprobación un guardia podía apuntar la visita de su edificio a una
--     vivienda de otro;
--   · sin vivienda, solo un profesional temporal para la administración
--     (Para Claude 150, 29/10/2026);
--   · con quién la registró: `registrada_por` es él (por defecto ya es
--     `auth.uid()`, pero se exige para que nadie la firme en nombre de otro);
--   · nace `ingresada` --la persona está en la puerta-- o `programada` si el
--     edificio exige verificar el documento del profesional y lo trae: la base
--     no deja entrar a nadie sin verificarlo (T-025), así que primero se
--     verifica y después se marca la entrada.
--
-- Invitados, vehículos y la foto de ingreso no necesitan nada nuevo: sus
-- políticas preguntan `puede_ver_visita`, y el guardia ve lo que él mismo
-- anotó hoy (`visita_en_ventana_de_porteria`, 09/10/2026). Por esa misma
-- ventana el `insert ... returning` no se topa con la lectura.

-- 1. La regla del edificio: si la portería pide documento a amigos y familia.
alter table public.condominio
  add column if not exists documento_amigos_obligatorio boolean not null default false;

comment on column public.condominio.documento_amigos_obligatorio is
  'Si la portería pide el documento a amigos y familiares cuando ella misma registra la visita. Viene apagado: el cliente pidió que a un amigo o familiar no se le pida documento salvo que el edificio lo decida (16/11/2026). Al profesional temporal se le pide siempre.';

-- 2. El alta de visitas, con la rama de la portería.
drop policy if exists visita_alta on public.visita;
create policy visita_alta on public.visita
  for insert to authenticated
  with check (
    public.es_admin_condominio(condominio_id)
    or (unidad_id is not null and public.es_miembro_unidad(unidad_id))
    or (
      registrada_por = auth.uid()
      and unidad_id is not null
      and public.es_huesped_con_reserva(unidad_id)
      and public.huesped_puede_registrar_visitas(unidad_id)
    )
    /*
      La portería (16/11/2026). `es_guardia_activo` y no
      `es_personal_condominio`: esa incluye a toda la administración y al
      coadministrador, que ya tienen su propia rama (o no la tienen a
      propósito).
    */
    or (
      public.es_guardia_activo(condominio_id)
      and registrada_por = auth.uid()
      and tipo in ('amigos', 'temporal')
      and estado in ('ingresada', 'programada')
      and deleted_at is null
      and (
        (unidad_id is not null
          and public.condominio_de_unidad(unidad_id) = condominio_id)
        or (unidad_id is null and para_administracion and tipo = 'temporal')
      )
    )
  );

-- 3. El documento que pide la portería, también en la base.
--
-- La pantalla ya lo pide; esto cierra la puerta para quien escriba sin ella.
-- Solo mira lo que **el guardia** registra desde la portería: lo que anuncia
-- un vecino sigue su propia regla (lo decide quien invita, 30/10/2026). Si el
-- guardia además vive en esa vivienda y la anuncia como vecino, tampoco.
--   · profesional temporal: documento siempre;
--   · amigos o familia: solo con `documento_amigos_obligatorio` encendido.
-- Los menores no llevan documento obligatorio en ningún caso.
create or replace function public.porteria_pide_el_documento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_tipo        public.tipo_visita;
  v_condominio  uuid;
  v_unidad      uuid;
  v_registro    uuid;
  v_amigos_doc  boolean;
begin
  if auth.uid() is null or new.es_menor then
    return new;
  end if;
  if nullif(btrim(coalesce(new.documento_numero, '')), '') is not null then
    return new;
  end if;

  select v.tipo, v.condominio_id, v.unidad_id, v.registrada_por, c.documento_amigos_obligatorio
    into v_tipo, v_condominio, v_unidad, v_registro, v_amigos_doc
  from public.visita v
  join public.condominio c on c.id = v.condominio_id
  where v.id = new.visita_id;

  if not found
     or v_registro is distinct from auth.uid()
     or not public.es_guardia_activo(v_condominio)
     or (v_unidad is not null and public.es_miembro_unidad(v_unidad)) then
    return new;
  end if;

  if v_tipo = 'temporal' then
    raise exception 'El documento del profesional es obligatorio.'
      using errcode = 'check_violation',
            constraint = 'invitado_porteria_pide_documento';
  end if;
  if v_tipo = 'amigos' and v_amigos_doc then
    raise exception 'En este edificio la portería pide el documento a amigos y familiares.'
      using errcode = 'check_violation',
            constraint = 'invitado_porteria_pide_documento';
  end if;
  return new;
end;
$function$;

revoke all on function public.porteria_pide_el_documento() from public;

drop trigger if exists invitado_porteria_pide_documento on public.invitado;
create trigger invitado_porteria_pide_documento
  before insert on public.invitado
  for each row execute function public.porteria_pide_el_documento();
