-- Los terminos que el huesped acepta son los del edificio.
--
-- En el precheckin, quien se registra despliega cuatro apartados y marca
-- «Acepto los terminos y condiciones». Ese «acepto» se guarda en
-- `invitado.terminos_aceptados` y es lo que el KT llama asumir la
-- responsabilidad legal.
--
-- Lo que despliega son **cuatro parrafos escritos a mano en el codigo de la
-- web**, uno de ellos titulado «Terminos y Condiciones del Condominio». Y en
-- `documento_legal` hay un documento con ese mismo nombre, del condominio,
-- marcado vigente, que no lo lee nadie: `obtenerLegalesDelCondominio` llevaba
-- dias escrita sin que la llamara ninguna pantalla (R-5).
--
-- O sea que alguien acepta unos terminos que no son los del edificio donde va
-- a dormir.
--
-- Esta funcion los entrega a quien tiene el enlace, sin sesion, igual que el
-- resto del precheckin.
--
-- Aditiva: no borra ninguna columna ni ninguna fila.

create or replace function public.legales_de_la_estancia(p_token text)
returns table (id uuid, titulo text, contenido text)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select d.id, d.titulo, d.contenido
  from public.visita v
  join public.documento_legal d
    -- Los del edificio Y los de la plataforma: quien se registra acepta los
    -- dos, y hasta ahora los cuatro venian del mismo sitio inventado.
    on (d.condominio_id = v.condominio_id or d.condominio_id is null)
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now()
    and d.vigente
  order by d.condominio_id nulls first, d.titulo;
$fn$;

comment on function public.legales_de_la_estancia(text) is
  'Los documentos legales vigentes que aplican a quien abre un enlace de precheckin: los de la plataforma y los de su condominio. Sin sesion, como el resto del precheckin.';

grant execute on function public.legales_de_la_estancia(text) to anon, authenticated;
