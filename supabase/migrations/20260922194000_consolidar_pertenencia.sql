-- ----------------------------------------------------------------------------
-- Una sola definicion de "pertenece a esta vivienda"
-- ----------------------------------------------------------------------------
-- `puede_operar_unidad` no llamaba a `es_miembro_unidad`: repetia su consulta
-- a `membresia_unidad`. Al excluir al huesped temporal de `es_miembro_unidad`,
-- la copia siguio incluyendolo, y con ella todas las politicas que la usan.
--
-- Comprobado con una sesion real: un huesped con la estancia ya terminada
-- seguia viendo el libro del alojamiento -- con el wifi y las instrucciones de
-- acceso a la vivienda -- y las visitas registradas en ella.
--
-- La regla vive ahora en un solo sitio. Si manana hay que excluir otro rol,
-- basta cambiar `es_miembro_unidad`.

create or replace function public.puede_operar_unidad(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.es_miembro_unidad(p_unidad_id)
      or public.es_personal_condominio(public.condominio_de_unidad(p_unidad_id));
$$;

comment on function public.puede_operar_unidad(uuid) is
  'Quien vive en la unidad o es personal del condominio. Se apoya en es_miembro_unidad para que la definicion de pertenencia no este duplicada.';

-- La politica original del libro sobrevivia junto a la nueva, y como las
-- politicas permisivas se suman con OR, bastaba una para conceder el acceso.
drop policy if exists libro_huesped_acceso on public.libro_huesped;

comment on table public.libro_huesped is
  'Wifi, instrucciones y codigos de la vivienda. Lo ve quien la opera y el huesped mientras su estancia este vigente.';
