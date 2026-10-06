-- ----------------------------------------------------------------------------
-- Los servicios que paga la vivienda
-- ----------------------------------------------------------------------------
-- La luz, el agua, el internet. El KT lista «agregar servicio» entre lo que
-- hace el propietario, la pantalla **existe y esta terminada** --formulario,
-- validacion con zod y su hook-- y lo que faltaba era donde guardarlo: ni
-- tabla, ni politica, ni nadie que lo consultara.
--
-- Mientras tanto el alta llamaba a `simularAgregarServicio`, que espera 180 ms
-- y devuelve lo que le diste. Es el **ultimo** servicio que finge en todo el
-- proyecto: `npm run fingen` baja de 1 a 0 con esto, y su archivo de marcas se
-- queda vacio.
--
-- Y la pantalla estaba ademas **inalcanzable** desde el 01/10/2026: la unica
-- ruta que la registraba vivia en un stack que no montaba nadie. Se registra
-- en `sharedScreens` con el resto.
--
-- ----------------------------------------------------------------------------
-- Las dos decisiones que no eran mias
-- ----------------------------------------------------------------------------
-- **«Primer aviso» y «Segundo aviso»** eran dos cajas de texto sin explicacion
-- en ningun documento del proyecto. Preguntado el 06/10/2026: son **el dia del
-- mes en que vence**, no una fecha. La luz vence siempre el 10 y el segundo
-- aviso el 25, y asi el dato sirve mes tras mes sin que nadie vuelva a
-- tocarlo; una fecha concreta caduca en cuanto pasa el mes y entonces miente.
--
-- **Quien lo ve.** Solo la vivienda, y no la administracion. El cliente lo
-- dudo --«¿la administracion no carga esos datos?»-- y la respuesta es que no:
-- los mete el propietario desde su pantalla, y el numero de cliente de la luz
-- y el del medidor son datos del hogar. El limite de este producto es que un
-- edificio no entra en una casa.
--
-- El **huesped temporal tampoco**, y eso sale gratis: `es_miembro_unidad` ya
-- lo excluye a proposito.

-- ----------------------------------------------------------------------------
-- Quien gestiona la vivienda
-- ----------------------------------------------------------------------------
-- Hacia falta uno nuevo. `puede_invitar_a_unidad` parece el mismo y no lo es:
-- incluye al coadministrador con permiso de residentes, o sea a la
-- administracion, que es justo quien no debe tocar esto.

create or replace function public.gestiona_la_vivienda(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  );
$fn$;

comment on function public.gestiona_la_vivienda is
  'Quien decide sobre la vivienda por dentro: su propietario o su inquilino lider. **Sin la administracion**, al reves que `puede_invitar_a_unidad`, que si la incluye. Para lo que es del hogar y no del edificio.';

-- ----------------------------------------------------------------------------
-- La tabla
-- ----------------------------------------------------------------------------

create table if not exists public.servicio_de_vivienda (
  id              uuid primary key default gen_random_uuid(),
  unidad_id       uuid not null references public.unidad(id) on delete cascade,
  -- Que servicio es: «Luz», «Agua», «Internet». Texto y no un enum porque la
  -- lista no esta cerrada --gas, television, vigilancia privada-- y la regla 4
  -- pide enum para lo que **el producto** decide, no para lo que escribe quien
  -- lo usa.
  nombre          text not null,
  empresa         text,
  numero_cliente  text,
  numero_medidor  text,
  -- El dia del mes, no una fecha: un servicio se repite todos los meses y una
  -- fecha concreta caduca. Decision del cliente del 06/10/2026.
  dia_primer_aviso   smallint,
  dia_segundo_aviso  smallint,
  correo_factura  text,
  -- El telefono de atencion de la empresa, con su pais. Separados desde el
  -- primer dia: guardar «+57 601 756...» con el prefijo dentro es lo que no se
  -- puede volver a separar, y costo diez filas en octubre.
  telefono        text,
  codigo_pais     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint servicio_vivienda_nombre_no_vacio
    check (btrim(nombre) <> ''),
  -- 1 a 31 y no «un dia del mes de verdad»: febrero no tiene 31, pero quien
  -- pone 31 quiere decir «el ultimo», y rechazarselo seria peor que guardarlo.
  constraint servicio_vivienda_primer_aviso_es_dia
    check (dia_primer_aviso is null or dia_primer_aviso between 1 and 31),
  constraint servicio_vivienda_segundo_aviso_es_dia
    check (dia_segundo_aviso is null or dia_segundo_aviso between 1 and 31),
  constraint servicio_vivienda_codigo_pais_es_iso2
    check (codigo_pais is null or codigo_pais ~ '^[A-Z]{2}$')
);

comment on table public.servicio_de_vivienda is
  'Los servicios que paga una vivienda --luz, agua, internet-- con su numero de cliente, su medidor y a quien llamar. Los ve y los edita la vivienda; la administracion no, porque son datos del hogar.';

comment on column public.servicio_de_vivienda.dia_primer_aviso is
  'El dia del mes en que vence el primer aviso, de 1 a 31. No una fecha: el servicio se repite todos los meses y una fecha caduca.';

comment on column public.servicio_de_vivienda.dia_segundo_aviso is
  'El dia del mes del segundo aviso, el de corte. Mismo motivo que el primero.';

create index if not exists servicio_de_vivienda_por_unidad_idx
  on public.servicio_de_vivienda (unidad_id);

create trigger servicio_de_vivienda_tocar_updated_at
  before update on public.servicio_de_vivienda
  for each row execute function public.tocar_updated_at();

-- ----------------------------------------------------------------------------
-- Quien ve y quien escribe
-- ----------------------------------------------------------------------------

alter table public.servicio_de_vivienda enable row level security;

create policy servicio_de_vivienda_lectura on public.servicio_de_vivienda
  for select to authenticated
  using (public.es_miembro_unidad(unidad_id));

comment on policy servicio_de_vivienda_lectura on public.servicio_de_vivienda is
  'Lo ve quien vive ahi. **No la administracion**: el numero de cliente de la luz es del hogar, no del edificio. Y no el huesped temporal, que `es_miembro_unidad` ya excluye.';

create policy servicio_de_vivienda_escritura on public.servicio_de_vivienda
  for all to authenticated
  using (public.gestiona_la_vivienda(unidad_id))
  with check (public.gestiona_la_vivienda(unidad_id));

comment on policy servicio_de_vivienda_escritura on public.servicio_de_vivienda is
  'Lo da de alta y lo cambia quien decide sobre la vivienda: su propietario o su inquilino lider. Un residente lo ve y no lo toca.';
