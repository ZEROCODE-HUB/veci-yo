-- ----------------------------------------------------------------------------
-- El huesped llena lo que la TRA pide de el
-- ----------------------------------------------------------------------------
-- Tres datos nuevos en la ficha del preregistro --ciudad donde vive, ciudad de
-- donde viene, y nacionalidad-- mas el costo de la estancia, que es de la
-- reserva entera y lo escribe el tambien.
--
-- Se **reemplaza** la funcion en vez de añadir parametros opcionales: unos
-- parametros de mas crearian una segunda version con la misma firma corta, y
-- PostgREST no sabria cual llamar.
--
-- Ninguno es obligatorio. El preregistro se puede terminar sin ellos --un
-- huesped a medias es peor que un dato en blanco-- y lo que falte lo dice el
-- reporte cuando se vaya a mandar. La decision del 02/10/2026 fue que sean
-- opcionales para el anfitrion; aqui lo son tambien para el huesped, pero la
-- pantalla se los pide.

drop function if exists public.guardar_precheckin(
  text, text, text, tipo_documento, text, text, text, text, motivo_estancia, date
);

create or replace function public.guardar_precheckin(
  p_token              text,
  p_nombre             text,
  p_apellidos          text default null,
  p_tipo_documento     public.tipo_documento default null,
  p_documento          text default null,
  p_correo             text default null,
  p_telefono           text default null,
  p_direccion          text default null,
  p_motivo             public.motivo_estancia default null,
  p_fecha_nacimiento   date default null,
  p_ciudad_residencia  text default null,
  p_ciudad_procedencia text default null,
  p_nacionalidad       text default null,
  p_costo              numeric default null,
  p_moneda             text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
  v_id     uuid;
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if coalesce(btrim(p_nombre), '') = '' or coalesce(btrim(p_documento), '') = '' then
    raise exception 'Hace falta el nombre y el numero de documento';
  end if;

  if position('@' in coalesce(p_correo, '')) = 0 then
    raise exception 'El correo no parece valido';
  end if;

  if p_costo is not null and p_costo < 0 then
    raise exception 'El costo no puede ser negativo';
  end if;

  -- 1) El titular, si ya esta marcado.
  select id into v_id
  from public.invitado
  where visita_id = v_visita and es_titular;

  /*
    2) Si no lo esta, se adopta al primero que puso el anfitrion.

    Esta es la linea que faltaba el 02/10/2026: sin ella se iba derecho a
    insertar, el anfitrion ya habia ocupado el `orden = 0`, y chocaba contra
    `invitado_orden_unico_por_visita`. El huesped veia «No pudimos guardar tus
    datos» y detras habia un 409.
  */
  if v_id is null then
    select id into v_id
    from public.invitado
    where visita_id = v_visita
    order by orden
    limit 1;

    if v_id is not null then
      update public.invitado set es_titular = true where id = v_id;
    end if;
  end if;

  -- 3) Y si no hay ni uno, se crea. El `orden` se calcula, no se da por hecho.
  if v_id is null then
    insert into public.invitado (visita_id, orden, nombre, es_titular)
    values (
      v_visita,
      coalesce(
        (select max(orden) + 1 from public.invitado where visita_id = v_visita),
        0
      ),
      btrim(p_nombre),
      true
    )
    returning id into v_id;
  end if;

  update public.invitado set
    nombre             = btrim(p_nombre),
    apellidos          = nullif(btrim(coalesce(p_apellidos, '')), ''),
    tipo_documento     = p_tipo_documento,
    documento_numero   = btrim(p_documento),
    correo             = lower(btrim(p_correo)),
    telefono           = nullif(btrim(coalesce(p_telefono, '')), ''),
    direccion          = nullif(btrim(coalesce(p_direccion, '')), ''),
    motivo             = coalesce(p_motivo, motivo),
    fecha_nacimiento   = coalesce(p_fecha_nacimiento, fecha_nacimiento),
    ciudad_residencia  = nullif(btrim(coalesce(p_ciudad_residencia, '')), ''),
    ciudad_procedencia = nullif(btrim(coalesce(p_ciudad_procedencia, '')), ''),
    nacionalidad       = upper(nullif(btrim(coalesce(p_nacionalidad, '')), ''))
  where id = v_id;

  /*
    El costo es de la reserva, no de la persona, asi que va en la visita. Solo lo
    escribe el titular: un acompañante no sabe lo que se pago, y si lo
    sobrescribiera cada uno con lo suyo el ministerio recibiria el ultimo que
    toco la pantalla.
  */
  if p_costo is not null then
    update public.visita
       set costo_estancia = p_costo,
           moneda_costo   = upper(coalesce(nullif(btrim(coalesce(p_moneda, '')), ''), 'COP'))
     where id = v_visita;
  end if;

  return v_id;
end;
$$;

comment on function public.guardar_precheckin is
  'Escribe la ficha del titular desde el enlace, SIN sesion. Adopta al primer invitado que dejo el anfitrion en vez de crear otro, y recoge lo que la TRA pide de el.';

grant execute on function public.guardar_precheckin(
  text, text, text, tipo_documento, text, text, text, text, motivo_estancia,
  date, text, text, text, numeric, text
) to anon, authenticated;
