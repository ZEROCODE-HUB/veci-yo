-- La verificacion de antecedentes se resuelve despues de anotarse
-- ============================================================================
-- `anotar_verificacion` solo sabe INSERTAR, y la tabla admite una fila por
-- huesped (`verificacion_antecedentes_unica`). Con un proveedor de verdad eso
-- no alcanza: la consulta se lanza, tarda alrededor de un minuto, y el
-- resultado llega despues. La funcion `verificar-antecedentes` anotaba
-- `pendiente` y luego intentaba anotar el resultado con la misma funcion, que
-- respondia «Ese huesped ya tiene una verificacion». O sea que **el resultado
-- no se habria escrito nunca**: toda consulta se habria quedado en pendiente.
--
-- No se vio porque la integracion nacio apagada y no llego a correr ni una vez
-- contra el proveedor. Salio el 13/10/2026 al probarla contra su ambiente de
-- pruebas.
--
-- Lo que hace falta es poder cambiar la fila que ya existe, y eso es esto.
--
-- Que filas se dejan cambiar, y es el limite que importa:
--
--   · una `pendiente` o una `error_proveedor`: todavia no dicen nada de nadie;
--   · una que no sea del proveedor real --`simulado`, que es lo que deja el
--     cierre del preregistro, o `tusdatos-pruebas`--: no es una verificacion,
--     es un marcador, y la de verdad tiene que poder ocupar su sitio sin
--     gastar otro cupo de la vivienda.
--
-- Una `aprobada` o `rechazada` del proveedor real **no se reescribe**: es
-- constancia de un hecho y de un cobro.
--
-- Interna, como `anotar_verificacion`: no pregunta quien llama, asi que no se
-- concede a nadie salvo a la clave de servicio. El permiso lo comprueba la
-- funcion de servidor con la sesion de quien la llama.

create or replace function public.resolver_verificacion(
  p_invitado_id uuid,
  p_proveedor   text,
  p_referencia  text,
  p_resultado   public.resultado_verificacion,
  p_respuesta   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid;
begin
  update public.verificacion_antecedentes
     set proveedor          = p_proveedor,
         referencia_externa = coalesce(p_referencia, referencia_externa),
         resultado          = p_resultado,
         respuesta          = p_respuesta,
         ejecutada_en       = now()
   where invitado_id = p_invitado_id
     and (
       proveedor is distinct from 'tusdatos'
       or resultado in ('pendiente', 'error_proveedor')
     )
  returning id into v_id;

  if v_id is null then
    raise exception 'Ese huesped no tiene una verificacion que se pueda resolver'
      using errcode = 'no_data_found';
  end if;

  return v_id;
end;
$fn$;

comment on function public.resolver_verificacion(
  uuid, text, text, public.resultado_verificacion, jsonb) is
  'Escribe el resultado sobre la verificacion que ya existe, SIN mirar quien la pide y sin gastar otro cupo. No reescribe una aprobada o rechazada del proveedor real. La llama la funcion de servidor `verificar-antecedentes`.';

revoke execute on function public.resolver_verificacion(
  uuid, text, text, public.resultado_verificacion, jsonb)
  from public, anon, authenticated;

grant execute on function public.resolver_verificacion(
  uuid, text, text, public.resultado_verificacion, jsonb)
  to service_role;
