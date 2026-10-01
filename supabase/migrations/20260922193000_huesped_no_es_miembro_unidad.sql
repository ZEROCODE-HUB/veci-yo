-- ----------------------------------------------------------------------------
-- El huésped tampoco es miembro de la unidad
-- ----------------------------------------------------------------------------
-- La migración 20260922191000 decía que `es_miembro_unidad` "se deja como
-- está —sin él—". Era falso: esa función mira `membresia_unidad` filtrando
-- por usuario y por `activo`, sin mirar el rol. En cuanto el huésped tuvo una
-- fila ahí, pasó a ser miembro de la unidad a todos los efectos.
--
-- Con una sesión real se comprobó el alcance: un huésped **cuya estancia ya
-- había terminado** seguía viendo el libro del alojamiento —el nombre de la
-- red wifi y las instrucciones de acceso a la vivienda— y su conversación con
-- la portería. La vigencia no servía de nada, porque el acceso no pasaba por
-- `es_huesped_de_unidad` sino por `puede_operar_unidad`.
--
-- Y mientras la estancia durase, heredaba además todo lo que una unidad
-- concede: la correspondencia del propietario, sus visitas, sus PQRS, sus
-- vehículos.
--
-- Se corrige en la raíz. `es_miembro_unidad` pasa a significar lo que su
-- nombre dice: quien vive en esa vivienda, no quien está de paso.

create or replace function public.es_miembro_unidad(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      -- El huésped temporal no. Lo suyo pasa por `es_huesped_de_unidad`, que
      -- además comprueba que la estancia siga vigente.
      and mu.rol <> 'huesped_temporal'
  );
$$;

comment on function public.es_miembro_unidad(uuid) is
  'Quien vive en esa vivienda. NO incluye al huesped temporal: para eso esta es_huesped_de_unidad, que ademas comprueba la vigencia de la estancia.';


-- El libro del alojamiento: quien opera la vivienda (propietario, anfitrion,
-- administracion) y el huesped MIENTRAS dure su estancia. Se reescribe para
-- que quede explicito que son dos caminos distintos y que el del huesped
-- caduca.
drop policy if exists libro_huesped_lectura on public.libro_huesped;

create policy libro_huesped_lectura on public.libro_huesped
  for select to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or public.es_huesped_de_unidad(unidad_id)
  );

comment on policy libro_huesped_lectura on public.libro_huesped is
  'El anfitrion y la administracion siempre; el huesped solo mientras su estancia este vigente.';
