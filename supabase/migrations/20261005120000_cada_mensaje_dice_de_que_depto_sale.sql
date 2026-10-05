-- ----------------------------------------------------------------------------
-- Cada mensaje dice de que depto sale
-- ----------------------------------------------------------------------------
-- El cliente lo pidio el 02/10/2026 como «el TAG del depto junto al rol», y al
-- preguntarle donde lo habia visto respondio lo obvio: «va siempre, casi en
-- todo lado donde salga el nombre o el alias».
--
-- Al contarlo, en casi todos esos sitios ya estaba:
--
--   · el directorio de propiedades es la vivienda;
--   · el cuadro de honor titula la tarjeta con el departamento;
--   · `quien_reservo` --20260923150000-- devuelve solicitante y depto;
--   · `detalle_votacion` devuelve `unidad` junto al votante;
--   · los hilos de porteria ya salen como «Seguridad · Dpto 301».
--
-- Faltaba el **chat**, y era justo donde mas se nota: en un grupo de
-- residentes, un mensaje muestra `autor_nombre` a secas. Cincuenta nombres y
-- ninguna pista de quien es quien. Y con el alias encendido es peor: «Vecino
-- Misterioso» sin nada al lado.
--
-- ----------------------------------------------------------------------------
-- Por que en la fila y no en un join
-- ----------------------------------------------------------------------------
-- Por la misma razon que `autor_nombre`, que ya viaja en la fila con su
-- comentario: el mensaje tiene que seguir diciendo de donde salio aunque esa
-- persona se de de baja del condominio. Un join contra la residencia de hoy
-- dejaria sin depto todo el historial de quien se mudo, y le pondria el depto
-- nuevo a los mensajes viejos de quien cambio de piso.
--
-- ----------------------------------------------------------------------------
-- Por que lo pone un trigger y no el cliente
-- ----------------------------------------------------------------------------
-- `autor_nombre` lo manda la aplicacion, y eso significa que cualquiera puede
-- enviar un mensaje firmado con el nombre que quiera. No se arregla aqui --es
-- otro asunto, R-?-- pero no se repite: el depto lo **deriva la base** y pisa
-- lo que venga en el insert. Si lo pusiera el cliente, un vecino podria
-- escribir en el grupo con el depto de otro.
--
-- Aditiva: columna nueva, nada se borra.

alter table public.mensaje
  add column if not exists autor_unidad text;

comment on column public.mensaje.autor_unidad is
  'El codigo de la vivienda desde la que se escribio, congelado al enviar. Lo pone un trigger, nunca el cliente. Null para quien no vive en el condominio: la administracion y la porteria no tienen depto.';

-- ----------------------------------------------------------------------------
-- De que viviendas es esta persona, en este condominio
-- ----------------------------------------------------------------------------
-- Interna a proposito. Con `security definer` y el `execute` que Postgres
-- regala a PUBLIC, cualquiera podria preguntar donde vive cualquiera, de
-- cualquier edificio. Solo la usa el trigger.

create or replace function public.viviendas_de_en(
  p_usuario_id uuid,
  p_condominio_id uuid
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  -- Agregadas y no «la primera»: alguien puede tener dos deptos en el mismo
  -- edificio, y elegir uno al azar seria mentir la mitad de las veces.
  select string_agg(distinct u.codigo, ', ' order by u.codigo)
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.usuario_id = p_usuario_id
    and m.activo
    and u.condominio_id = p_condominio_id
    and u.deleted_at is null;
$fn$;

comment on function public.viviendas_de_en(uuid, uuid) is
  'Los codigos de las viviendas activas de esta persona en ese condominio, separados por coma. Interna: no comprueba quien pregunta, asi que no se concede a nadie.';

revoke execute on function public.viviendas_de_en(uuid, uuid)
  from anon, authenticated;

create or replace function public.mensaje_con_el_depto_del_autor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
begin
  select c.condominio_id into v_condominio
  from public.conversacion c
  where c.id = new.conversacion_id;

  -- Sin `if new.autor_unidad is null`: se pisa siempre. Lo que manda el
  -- cliente no cuenta.
  new.autor_unidad := public.viviendas_de_en(new.autor_id, v_condominio);

  return new;
end;
$fn$;

comment on function public.mensaje_con_el_depto_del_autor is
  'Congela en el mensaje el depto de quien escribe. Pisa lo que venga en el insert: si lo pusiera el cliente, se podria firmar con el depto de otro.';

drop trigger if exists mensaje_con_su_depto on public.mensaje;

create trigger mensaje_con_su_depto
  before insert on public.mensaje
  for each row
  execute function public.mensaje_con_el_depto_del_autor();

-- ----------------------------------------------------------------------------
-- Lo que ya estaba escrito
-- ----------------------------------------------------------------------------
-- Para los mensajes de antes no hay forma de saber de donde salieron: se
-- rellena con la residencia de hoy, que es lo mas cercano. Solo los que estan
-- en null, para que volver a aplicar la migracion no reescriba historia.

update public.mensaje m
set autor_unidad = public.viviendas_de_en(m.autor_id, c.condominio_id)
from public.conversacion c
where c.id = m.conversacion_id
  and m.autor_unidad is null;
