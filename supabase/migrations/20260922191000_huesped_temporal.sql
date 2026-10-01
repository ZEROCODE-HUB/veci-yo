-- ----------------------------------------------------------------------------
-- Huésped temporal: vigencia y permisos
-- ----------------------------------------------------------------------------
-- Un huésped se aloja unos días. Eso trae dos exigencias que ningún otro rol
-- tiene:
--
-- 1. **Su acceso caduca.** Una membresía de propietario no tiene fecha de fin;
--    la de un huésped sí, y cuando pasa, deja de ver la vivienda.
-- 2. **No hereda lo de un residente.** Un huésped no vota, no entra al cuadro
--    de honor, no lee las PQRS del propietario ni su correspondencia. Por eso
--    `es_miembro_unidad` se deja como está —sin él— y lo que sí puede hacer se
--    concede una por una. Seguro por omisión: mientras no se le dé algo
--    explícitamente, no lo tiene.

alter table public.membresia_unidad
  add column vigente_desde date,
  add column vigente_hasta date;

alter table public.membresia_unidad
  add constraint membresia_unidad_vigencia_coherente
    check (vigente_hasta is null or vigente_desde is null
           or vigente_hasta >= vigente_desde),
  -- Un huésped sin fecha de salida es una estancia indefinida, que es
  -- justamente lo que este rol no es.
  add constraint membresia_unidad_huesped_con_vigencia
    check (rol <> 'huesped_temporal' or vigente_hasta is not null);

comment on column public.membresia_unidad.vigente_hasta is
  'Último día de la estancia. Obligatorio para un huésped temporal: pasado ese día deja de ver la vivienda.';


-- ----------------------------------------------------------------------------
-- Quién es huésped de qué
-- ----------------------------------------------------------------------------

create or replace function public.es_huesped_de_unidad(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      and (m.vigente_desde is null or m.vigente_desde <= current_date)
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
  );
$$;

comment on function public.es_huesped_de_unidad(uuid) is
  'Huésped con estancia vigente hoy. Fuera de esas fechas devuelve falso aunque la membresía siga activa.';

/**
 * `es_miembro_unidad` no cambia: sigue sin incluir al huésped, para que ninguna
 * política existente le conceda acceso sin que alguien lo haya decidido. Esta
 * función es para lo que sí comparten.
 */
create or replace function public.es_residente_o_huesped(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.es_miembro_unidad(p_unidad_id)
      or public.es_huesped_de_unidad(p_unidad_id);
$$;


-- ----------------------------------------------------------------------------
-- Lo que el huésped sí puede
-- ----------------------------------------------------------------------------

-- Hablar con la portería y con la administración desde la vivienda donde se
-- aloja. Es lo primero que necesita: avisar de que llega tarde, preguntar por
-- el acceso.
create or replace function public.puede_ver_conversacion_fila(
  p_tipo           public.tipo_conversacion,
  p_area           public.area_conversacion,
  p_ambito         public.ambito_grupo,
  p_unidad_id      uuid,
  p_condominio_id  uuid,
  p_conversacion_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      -- El huésped entra aquí mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      or (p_area = 'seguridad'      and public.es_personal_condominio(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      -- Los grupos del edificio no: el huésped está de paso.
      case p_ambito
        when 'residentes' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.es_residente
            and m.rol <> 'huesped_temporal'
            and u.condominio_id = p_condominio_id
        )
        when 'propietarios' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.rol = 'propietario'
            and u.condominio_id = p_condominio_id
        )
        else false
      end
    else false
  end;
$$;

-- Abrir ese hilo, no solo leerlo.
drop policy if exists conversacion_alta on public.conversacion;

create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and (
        public.es_residente_o_huesped(unidad_id)
        or (area = 'seguridad'      and public.es_personal_condominio(condominio_id))
        or (area = 'administracion' and public.es_admin_condominio(condominio_id))
      ))
      or (tipo = 'directa' and public.es_miembro_condominio(condominio_id))
      or (tipo = 'grupo' and public.es_admin_condominio(condominio_id))
    )
  );

-- El libro del alojamiento: wifi, instrucciones, cómo se abre la puerta. Es
-- literalmente lo que viene a buscar.
drop policy if exists libro_huesped_lectura on public.libro_huesped;

create policy libro_huesped_lectura on public.libro_huesped
  for select to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or public.es_huesped_de_unidad(unidad_id)
  );

-- El reglamento del condominio, que es el que debe cumplir.
drop policy if exists reglamento_lectura on public.reglamento;

create policy reglamento_lectura on public.reglamento
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or exists (
      select 1 from public.membresia_unidad m
      join public.unidad u on u.id = m.unidad_id
      where m.usuario_id = auth.uid()
        and m.rol = 'huesped_temporal'
        and m.activo
        and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
        and u.condominio_id = reglamento.condominio_id
    )
  );

comment on policy reglamento_lectura on public.reglamento is
  'Lo lee quien vive en el condominio y tambien el huesped con estancia vigente: es el reglamento que debe cumplir.';
