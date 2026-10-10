-- El anfitrión arma su propia TRA
--
-- Desde el 02/10/2026 existe todo el lado de la base --`guardar_token_tra`,
-- `tiene_token_tra`, la columna `tra_armado` del 06/10-- y **nadie lo llama**:
-- no hay una sola pantalla donde un anfitrión pueda poner su token. Es la
-- familia de «una columna que existe y nadie escribe es una función a medio
-- construir», con el agravante de que lo que falta es el único camino para
-- cumplir con el ministerio.
--
-- Lo preguntó el cliente el 09/10/2026: «¿en dónde es que se pone el token o
-- eso para el TRA? tengo entendido que cada anfitrión configura eso no?».
-- Tenía razón en las dos mitades: es por vivienda, y lo pone su anfitrión.
--
-- Esta migración cierra lo que falta **en la base** para que la pantalla no
-- pueda mentir. Aditiva: una función, un disparador y un reemplazo de función
-- con la misma firma. No borra nada.

-- ============================================================================
-- 1. Armar sin token no se puede, y no basta con no ofrecerlo
-- ============================================================================
-- La política de `suscripcion_renta_corta` es `for all` con
-- `puede_configurar_alojamiento`, así que el anfitrión **puede escribir
-- `tra_armado` directamente por PostgREST**. Dejar la regla en la pantalla
-- sería el defecto más repetido de este proyecto: la decisión viviendo en la
-- interfaz y no en el dato.
--
-- Y aquí importa más de lo normal. `datos_para_la_tra` entrega
-- `tiene_token = token is not null and tra_armado`, y es lo único que separa
-- «preparado» de «presentando declaraciones ante el MinCIT». Una fila armada
-- sin token es un estado que la aplicación no sabe leer: dice que va a
-- reportar y no puede.

create or replace function public.tra_no_se_arma_sin_token()
returns trigger
language plpgsql
as $$
begin
  if new.tra_armado and new.tra_token_secret is null then
    raise exception
      'No se puede activar el reporte a la TRA sin haber guardado el token';
  end if;
  return new;
end;
$$;

comment on function public.tra_no_se_arma_sin_token() is
  'Impide armar la TRA de una vivienda que no tiene token. Va en un '
  'disparador y no en la pantalla porque el anfitrion puede escribir esa '
  'columna por PostgREST: la politica de la tabla es `for all`.';

drop trigger if exists tra_armado_necesita_token on public.suscripcion_renta_corta;

create trigger tra_armado_necesita_token
  before insert or update on public.suscripcion_renta_corta
  for each row
  execute function public.tra_no_se_arma_sin_token();

comment on trigger tra_armado_necesita_token on public.suscripcion_renta_corta is
  'Desde el 09/10/2026, cuando la pantalla del anfitrion empezo a poder '
  'escribir las dos columnas.';

-- ============================================================================
-- 2. Quitar el token desarma
-- ============================================================================
-- `guardar_token_tra(unidad, null)` es «desconectar la TRA», y hasta hoy
-- soltaba la referencia al secreto **dejando `tra_armado` encendido**. Con el
-- disparador de arriba eso ya ni siquiera es escribible: la propia función
-- habría empezado a fallar al desconectar una vivienda armada.
--
-- Desarmar al desconectar es además lo que la persona quiere decir: nadie
-- borra su token para seguir reportando. Mismo cuerpo que la del 02/10 salvo
-- esa línea, y se reemplaza con la misma firma.

create or replace function public.guardar_token_tra(
  p_unidad_id uuid,
  p_token     text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, extensions
as $$
declare
  v_nombre text := 'tra_' || p_unidad_id::text;
  v_id     uuid;
  v_token  text := nullif(btrim(coalesce(p_token, '')), '');
begin
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  -- Vaciarlo es desconectar la TRA: se suelta la referencia **y se desarma**.
  if v_token is null then
    update public.suscripcion_renta_corta
       set tra_token_secret = null,
           tra_armado       = false,
           tra_error        = null,
           updated_at       = now()
     where unidad_id = p_unidad_id;
    return;
  end if;

  select id into v_id from vault.secrets where name = v_nombre;

  if v_id is null then
    v_id := vault.create_secret(v_token, v_nombre, 'Token TRA del alojamiento');
  else
    perform vault.update_secret(v_id, v_token, v_nombre, 'Token TRA del alojamiento');
  end if;

  /*
    Guardar un token **no arma nada**: `tra_armado` no se toca aqui a
    proposito. Tener la credencial no es querer usarla --lo mismo que
    `ENVIO_CORREO_ACTIVO` y `TUSDATOS_ACTIVO`-- y un reporte a la TRA es una
    declaracion legal que no se deshace por API.
  */
  update public.suscripcion_renta_corta
     set tra_token_secret = v_id, tra_error = null, updated_at = now()
   where unidad_id = p_unidad_id;
end;
$$;

comment on function public.guardar_token_tra(uuid, text) is
  'Guarda el token de la TRA de una vivienda, cifrado en el Vault. Vaciarlo '
  'desconecta la TRA y desarma el reporte. **No arma**: eso es una decision '
  'aparte y explicita del anfitrion.';
