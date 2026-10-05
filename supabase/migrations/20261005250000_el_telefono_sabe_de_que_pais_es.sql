-- ----------------------------------------------------------------------------
-- El telefono sabe de que pais es
-- ----------------------------------------------------------------------------
-- Lo que quedaba de la tanda 3. `CampoTelefono` se escribio el 03/10/2026 --un
-- campo compuesto con selector de pais, su buscador y los prefijos de
-- veintisiete paises-- y **se enchufo en una sola pantalla**: Configuracion del
-- perfil. Las otras siguieron con un campo de texto pelado.
--
-- Y debajo habia algo mas enumerable: **nueve columnas de pais que existen y
-- nadie escribe**.
--
--     condominio.codigo_pais              porteria.codigo_pais
--     membresia_condominio.codigo_pais    membresia_unidad.codigo_pais
--     reclamo.codigo_pais_contacto        invitado.codigo_pais
--     perfil.codigo_pais_alt              membresia_unidad.codigo_pais_emergencia
--     invitacion.codigo_pais_emergencia
--
-- Solo `perfil.codigo_pais` tenia quien la llenara. Las demas en null, y los
-- telefonos de al lado guardados como texto libre --«+57 601 7561234», con el
-- prefijo dentro del numero-- que es justo lo que no se puede volver a separar.
--
-- Importa porque el cliente quiere mandar avisos por WhatsApp. Un
-- «3001234567» sin pais no se marca desde fuera ni se manda a ninguna parte.
--
-- ----------------------------------------------------------------------------
-- Lo que hace esta migracion, que es poco
-- ----------------------------------------------------------------------------
-- Casi todo el arreglo esta en la aplicacion: las columnas ya estaban. Aqui
-- solo falta un parametro, porque el alta de un menor pasa por una funcion y
-- no por un `insert` directo.
--
-- `registrar_menor` recibe `p_contacto_codigo` --el pais del contacto de
-- emergencia-- y **no recibia el del telefono del propio menor**. O sea que el
-- pais del adulto que responde por el si se guardaba y el del niño no.
--
-- Y la de seis argumentos **se borra**, no se deja de reserva. `create or
-- replace` con otro numero de argumentos no reemplaza: crea una sobrecarga, y
-- entonces una llamada por nombre no sabe a cual ir --«function name is not
-- unique»--. Esta escrito en AGENTS.md desde esta misma manana y aun asi me
-- volvio a morder al aplicar esta migracion.

create or replace function public.registrar_menor(
  p_unidad_id          uuid,
  p_nombre             text,
  p_telefono           text default null,
  p_contacto_nombre    text default null,
  p_contacto_codigo    text default null,
  p_contacto_telefono  text default null,
  -- El pais del telefono del menor, en ISO 3166-1 alfa-2. Va al final para no
  -- cambiar el orden de los que ya se mandan por posicion.
  p_codigo_pais        text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid;
begin
  if not public.puede_invitar_a_unidad(p_unidad_id) then
    raise exception 'No podes registrar personas en esta vivienda';
  end if;

  if nullif(btrim(coalesce(p_nombre, '')), '') is null then
    raise exception 'Falta el nombre';
  end if;

  insert into public.membresia_unidad
    (unidad_id, usuario_id, nombre, rol, es_menor, puede_acceder, es_residente,
     telefono, codigo_pais,
     contacto_emergencia_nombre, contacto_emergencia_codigo, contacto_emergencia_telefono)
  values
    (p_unidad_id, null, btrim(p_nombre), 'residente', true, false, true,
     nullif(btrim(coalesce(p_telefono, '')), ''),
     nullif(btrim(coalesce(p_codigo_pais, '')), ''),
     nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
     nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
     nullif(btrim(coalesce(p_contacto_telefono, '')), ''))
  returning id into v_id;

  return v_id;
end;
$fn$;

drop function if exists public.registrar_menor(uuid, text, text, text, text, text);

comment on function public.registrar_menor(
  uuid, text, text, text, text, text, text) is
  'Da de alta a un menor en la vivienda, sin cuenta. Desde el 05/10/2026 guarda tambien el pais de su telefono: recibia el del contacto de emergencia y no el suyo.';

-- ----------------------------------------------------------------------------
-- Y las dos columnas gemelas, que no se tocan
-- ----------------------------------------------------------------------------
-- `membresia_unidad` e `invitacion` tienen **dos** columnas para el pais del
-- contacto de emergencia: `codigo_pais_emergencia` y
-- `contacto_emergencia_codigo`. La segunda es la que se usa; la primera no la
-- escribe ni la lee nadie y esta vacia en las dos tablas --comprobado
-- contando--.
--
-- No se borran: la instruccion del cliente es que las migraciones sean solo
-- aditivas, y una columna que yo no cree no la quito por mi cuenta aunque este
-- vacia. Queda anotado en REVISAR-A-OJO para que lo decida.

comment on column public.membresia_unidad.codigo_pais_emergencia is
  'SIN USO. Duplicada de `contacto_emergencia_codigo`, que es la que se escribe y se lee. Vacia. Pendiente de decidir si se retira (REVISAR-A-OJO).';

comment on column public.invitacion.codigo_pais_emergencia is
  'SIN USO. Duplicada de `contacto_emergencia_codigo`, que es la que se escribe y se lee. Vacia. Pendiente de decidir si se retira (REVISAR-A-OJO).';

comment on column public.membresia_unidad.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono de esta persona en la vivienda. Existia desde el primer dia y nadie la escribia; desde el 05/10/2026 la llenan `registrar_menor` y el alta de un residente.';

comment on column public.porteria.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono de la garita. Llamar a la porteria es lo mas urgente que hay en esta aplicacion, y hasta el 05/10/2026 el numero se guardaba sin pais.';

comment on column public.condominio.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono de contacto del edificio. Distinto de `pais`, que es donde esta el edificio: la administracion puede atender desde otro sitio.';

comment on column public.membresia_condominio.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono de esta persona en el edificio --la administracion, la porteria--.';

comment on column public.reclamo.codigo_pais_contacto is
  'ISO 3166-1 alfa-2 del telefono que dejo quien abrio la PQRS. Es para que la administracion llame, asi que sin pais es medio dato.';

-- ----------------------------------------------------------------------------
-- Y los numeros que ya estaban, con el prefijo dentro
-- ----------------------------------------------------------------------------
-- Ocho filas tienen el telefono guardado como «+57 310 5551001» y el pais en
-- null. Asi, el campo nuevo abre con el pais por defecto y el numero entero
-- --prefijo incluido-- lo que da «+57 +57 310...» al marcar.
--
-- Se separa, y **solo donde el `+` lo deja sin duda**: un numero que empieza
-- por `+57` es de Colombia porque alguien escribio el `+`. Lo que no lleva `+`
-- no se toca, aunque empiece por digitos que parezcan un prefijo: hay un
-- `591646461949` en un reclamo que podria ser Bolivia o podria ser un numero
-- local que empieza por 591, y adivinar sobre un dato del cliente es peor que
-- dejarlo como esta.
--
-- Los dos paises en los que opera el producto, que son los unicos que hay en
-- los datos. Si manana aparece otro prefijo, se añade aqui.

do $$
declare
  v_pais record;
  v_tabla text;
begin
  for v_pais in
    select * from (values ('+57', 'CO'), ('+51', 'PE')) as p(prefijo, iso)
  loop
    foreach v_tabla in array array['condominio', 'porteria', 'membresia_condominio',
                                   'membresia_unidad', 'perfil', 'invitado']
    loop
      execute format(
        'update public.%I
         set codigo_pais = %L,
             telefono = btrim(regexp_replace(substring(telefono from %s), ''\s+'', '''', ''g''))
         where codigo_pais is null and telefono like %L',
        v_tabla, v_pais.iso, length(v_pais.prefijo) + 1, v_pais.prefijo || '%');
    end loop;

    execute format(
      'update public.reclamo
       set codigo_pais_contacto = %L,
           telefono_contacto = btrim(regexp_replace(substring(telefono_contacto from %s), ''\s+'', '''', ''g''))
       where codigo_pais_contacto is null and telefono_contacto like %L',
      v_pais.iso, length(v_pais.prefijo) + 1, v_pais.prefijo || '%');
  end loop;
end $$;
