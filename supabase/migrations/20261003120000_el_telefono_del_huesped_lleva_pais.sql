-- ----------------------------------------------------------------------------
-- El telefono del huesped lleva su pais
-- ----------------------------------------------------------------------------
-- `invitado.codigo_pais` se creo en la migracion anterior y hasta ahora nadie
-- la escribia: el preregistro guardaba el numero suelto.
--
-- Es justo donde mas falta hace. El huesped de un alojamiento turistico casi
-- nunca tiene numero del pais donde se aloja --es la definicion del caso-- y
-- sin el prefijo la porteria no puede llamarle ni se le puede mandar nada por
-- WhatsApp.
--
-- Se reemplaza la funcion en vez de añadir un parametro opcional: dos versiones
-- con la misma firma corta y PostgREST no sabria cual llamar.
--
-- Y se devuelve tambien en `mi_ficha_precheckin`, que si no el huesped que
-- vuelve a su enlace veria el numero y el pais en blanco.

drop function if exists public.guardar_precheckin(
  text, text, text, tipo_documento, text, text, text, text, motivo_estancia,
  date, text, text, text, numeric, text
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
  p_moneda             text default null,
  p_codigo_pais        text default null
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

  select id into v_id
  from public.invitado
  where visita_id = v_visita and es_titular;

  /*
    Si no hay titular marcado se adopta al primero que puso el anfitrion. Sin
    esta linea, el 02/10/2026 el preregistro fallaba con un 409 en toda reserva:
    se insertaba otro invitado con `orden = 0` contra un indice unico.
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
    /*
      El pais solo tiene sentido con un numero al lado: guardarlo suelto deja
      una fila que dice «este telefono es de Colombia» sin telefono.
    */
    codigo_pais        = case
                           when coalesce(btrim(p_telefono), '') = '' then null
                           else upper(nullif(btrim(coalesce(p_codigo_pais, '')), ''))
                         end,
    direccion          = nullif(btrim(coalesce(p_direccion, '')), ''),
    motivo             = coalesce(p_motivo, motivo),
    fecha_nacimiento   = coalesce(p_fecha_nacimiento, fecha_nacimiento),
    ciudad_residencia  = nullif(btrim(coalesce(p_ciudad_residencia, '')), ''),
    ciudad_procedencia = nullif(btrim(coalesce(p_ciudad_procedencia, '')), ''),
    nacionalidad       = upper(nullif(btrim(coalesce(p_nacionalidad, '')), ''))
  where id = v_id;

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
  date, text, text, text, numeric, text, text
) to anon, authenticated;


-- Y que vuelva al formulario cuando el huesped reabre su enlace.
--
-- Se borra antes de crearla: añadir una columna al resultado cambia el tipo de
-- retorno, y `create or replace` no puede --«cannot change return type of
-- existing function»--. Ojo con lo que viene despues: PostgREST mantiene una
-- cache del esquema y durante unos minutos responde raro a lo que se acaba de
-- recrear. Esta documentado en AGENTS.md y ya costo media tarde una vez.
drop function if exists public.mi_ficha_precheckin(text);

create function public.mi_ficha_precheckin(p_token text)
returns table (
  invitado_id        uuid,
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento          text,
  correo             text,
  telefono           text,
  codigo_pais        text,
  direccion          text,
  motivo             text,
  fecha_nacimiento   date,
  ciudad_residencia  text,
  ciudad_procedencia text,
  nacionalidad       text,
  terminos_aceptados boolean,
  costo              numeric,
  moneda             text,
  tiene_documento    boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    i.id, i.nombre, i.apellidos, i.tipo_documento::text, i.documento_numero,
    i.correo, i.telefono, i.codigo_pais, i.direccion, i.motivo::text,
    i.fecha_nacimiento, i.ciudad_residencia, i.ciudad_procedencia,
    i.nacionalidad::text, i.terminos_aceptados,
    v.costo_estancia, v.moneda_costo::text,
    -- La ruta de la foto no viaja, solo si existe: con ella, quien tuviera el
    -- enlace podria pedirle el archivo al Storage.
    (vd.documento_original_path is not null)
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  left join public.verificacion_documento vd on vd.invitado_id = i.id
  where i.visita_id = v_visita
    and i.es_titular;
end;
$$;

grant execute on function public.mi_ficha_precheckin(text) to anon, authenticated;
