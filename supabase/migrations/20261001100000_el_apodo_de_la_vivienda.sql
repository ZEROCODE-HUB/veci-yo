-- ----------------------------------------------------------------------------
-- El apodo de la vivienda
-- ----------------------------------------------------------------------------
-- La tarjeta de «Mis viviendas» decia «Alias: Torre 1 · 102» y no habia ningun
-- alias: ese texto lo compone la aplicacion con la torre y el codigo. La
-- etiqueta venia del prototipo, donde esto era una libreta de direcciones
-- personales --los datos de ejemplo eran «Casa Amorcito» y «Casa Mama»-- y uno
-- les ponia el mote que queria. Al conectar la sesion el campo paso a guardar
-- la vivienda y la promesa se quedo sin nada detras.
--
-- Esto la cumple. Pedido por el cliente el 01/10/2026 (REVISAR-A-OJO 82).
--
-- **No confundirlo con `perfil.alias`**, que existe y es otra cosa: el
-- seudonimo de una persona, para no figurar con su nombre real en el cuadro de
-- honor y en las reservas. Aquel es sobre quien eres; este, sobre como llamas a
-- tu casa.
--
-- Va en `membresia_unidad` y no en `unidad` porque **el apodo es de cada
-- persona, no de la vivienda**: dos que comparten casa pueden llamarla distinto,
-- y el anfitrion que lleva tres apartamentos los distingue por como los llama
-- el, no por «Torre 2 · 301».

alter table public.membresia_unidad
  add column if not exists apodo text;

comment on column public.membresia_unidad.apodo is
  'Como llama esta persona a esta vivienda, p. ej. «La playa». Es suyo: dos que comparten casa pueden ponerle motes distintos. No es perfil.alias, que es el seudonimo de la persona.';

-- Un apodo en blanco se pintaria como un hueco donde antes decia algo, asi que
-- o hay texto o la columna es nula. El tope son 40 caracteres: el sitio donde
-- se lee es una linea que no se parte.
alter table public.membresia_unidad
  drop constraint if exists membresia_unidad_apodo_con_texto;

alter table public.membresia_unidad
  add constraint membresia_unidad_apodo_con_texto
  check (apodo is null or char_length(btrim(apodo)) between 1 and 40);

-- ----------------------------------------------------------------------------
-- El apodo lo pone quien vive alli, y nadie mas
-- ----------------------------------------------------------------------------
-- `membresia_unidad_cambio` deja escribir la fila propia **y tambien** la de
-- cualquiera a quien uno pueda invitar a esa vivienda --`puede_invitar_a_unidad`,
-- que es el anfitrion o quien gestiona la vivienda--. Eso esta bien para lo que
-- esa politica cubre, pero el apodo no: es como *yo* llamo a mi casa, y que me
-- lo cambie otro no tiene sentido.
--
-- Va en un disparador propio y no dentro de `proteger_membresia_unidad` para no
-- tocar lo que ya funciona, y porque aquel deja salir pronto al administrador
-- del condominio --correcto para el rol y la vigencia, que son hechos que el
-- registra; no para esto, que no es un hecho del edificio--.
create or replace function public.proteger_apodo_de_vivienda()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sin sesion de aplicacion son las migraciones, la clave de servicio o la
  -- consola, que ya pasan por encima de RLS de todos modos.
  if auth.uid() is null then
    return new;
  end if;

  if new.apodo is distinct from old.apodo
     and new.usuario_id is distinct from auth.uid() then
    raise exception 'El apodo de una vivienda lo pone quien vive en ella';
  end if;

  return new;
end;
$$;

comment on function public.proteger_apodo_de_vivienda() is
  'El apodo de una vivienda solo lo escribe la persona de esa membresia, ni el anfitrion ni la administracion.';

drop trigger if exists membresia_unidad_apodo on public.membresia_unidad;

create trigger membresia_unidad_apodo
  before update on public.membresia_unidad
  for each row execute function public.proteger_apodo_de_vivienda();
