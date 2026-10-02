-- ----------------------------------------------------------------------------
-- El precheckin no encontraba a su titular, y chocaba
-- ----------------------------------------------------------------------------
-- Sintoma: «No pudimos guardar tus datos», y detras un **409** de
-- `guardar_precheckin`. Le paso al cliente delante de su cliente el 02/10/2026.
--
-- Que pasaba, exactamente:
--
--   · `crearVisita` da de alta a los invitados con `orden` 0, 1, 2… y **nunca
--     marca `es_titular`**, asi que se queda en su `default false`.
--   · `guardar_precheckin` busca la fila `where es_titular`, no la encuentra, y
--     entonces inserta una nueva con `orden = 0`.
--   · `invitado_orden_unico_por_visita` es `unique (visita_id, orden)`, y esa
--     posicion ya la ocupa el invitado que puso el anfitrion. Choque.
--
-- O sea que fallaba en **toda reserva creada desde la aplicacion con al menos
-- un invitado**, que son todas. El comentario de la funcion decia «el anfitrion
-- pudo dejar la fila creada con el nombre puesto al reservar», que es
-- exactamente lo que pasa; lo que no se comprobo es que esa fila **no viene
-- marcada**.
--
-- Por que no lo vio nada: los recorridos de la suite abren el precheckin sobre
-- visitas que crean ellos, y las crean marcando el titular. La unica forma de
-- verlo era crear la reserva **desde la pantalla**, que es justo lo que no
-- hice antes de decir que funcionaba.
--
-- ----------------------------------------------------------------------------
-- El arreglo va por los dos lados
-- ----------------------------------------------------------------------------
-- Aqui, la funcion: si no hay titular marcado, **adopta** al primer invitado en
-- vez de crear otro. Esto arregla tambien las reservas que ya existen, que son
-- las que el cliente tiene delante.
--
-- Y en la aplicacion, `crearVisita` marca al primer invitado como titular, para
-- que el dato nazca bien en vez de repararse despues.
--
-- Solo aditiva: no borra ni una fila.

create or replace function public.guardar_precheckin(
  p_token            text,
  p_nombre           text,
  p_apellidos        text default null,
  p_tipo_documento   public.tipo_documento default null,
  p_documento        text default null,
  p_correo           text default null,
  p_telefono         text default null,
  p_direccion        text default null,
  p_motivo           public.motivo_estancia default null,
  p_fecha_nacimiento date default null
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

  -- 1) El titular, si ya esta marcado.
  select id into v_id
  from public.invitado
  where visita_id = v_visita and es_titular;

  /*
    2) Si no lo esta, se **adopta** al primero que puso el anfitrion.

    Esta es la linea que faltaba. Antes se iba derecho a insertar, y como el
    anfitrion ya habia ocupado el `orden = 0`, la insercion chocaba contra
    `invitado_orden_unico_por_visita` y el huesped veia «No pudimos guardar tus
    datos».

    `order by orden` y no «cualquiera»: el primero de la lista es quien
    reservo. En una reserva de cuatro personas, adoptar a otro pondria el
    enlace, la cuenta y el correo a nombre de un acompañante.
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

  /*
    3) Y si no hay ni uno --una reserva sin invitados-- se crea. El `orden` se
    calcula en vez de darlo por hecho: escribir un 0 a fuego es lo que rompio
    esto.
  */
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
    nombre           = btrim(p_nombre),
    apellidos        = nullif(btrim(coalesce(p_apellidos, '')), ''),
    tipo_documento   = p_tipo_documento,
    documento_numero = btrim(p_documento),
    correo           = lower(btrim(p_correo)),
    telefono         = nullif(btrim(coalesce(p_telefono, '')), ''),
    direccion        = nullif(btrim(coalesce(p_direccion, '')), ''),
    motivo           = coalesce(p_motivo, motivo),
    fecha_nacimiento = coalesce(p_fecha_nacimiento, fecha_nacimiento)
  where id = v_id;

  return v_id;
end;
$$;

comment on function public.guardar_precheckin is
  'Escribe la ficha del titular desde el enlace, SIN sesion. Adopta al primer invitado que dejo el anfitrion en vez de crear otro: crear otro chocaba contra el orden unico por visita y devolvia un 409.';
