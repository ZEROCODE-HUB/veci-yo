-- El alias, con el número de depto, en el chat y en las reservas de zonas
-- (hueco 21).
--
-- El cliente respondió el 21/10/2026: «En áreas comunes quítalo [la casilla
-- de usar alias en zonas], pero el alias sí debe usarse en otras secciones:
-- el alias se guarda desde Perfil, y ese alias y al lado el N° de depto deben
-- salir en el chat, en la reserva que ve el guardia de áreas comunes, etc.».
--
-- O sea: ya no es una elección por sección. Quien pone un alias aparece con
-- él --y su depto al lado-- en el chat y en las reservas de zonas comunes,
-- para todos, la portería incluida. `perfil.usa_alias_zonas` deja de leerse.
--
-- Solo aditiva: reemplaza cuerpos de funciones y comentarios.

-- 1. Reservas de zonas: el alias si lo tiene; si no, el nombre. El depto ya lo
--    pinta la pantalla al lado.
create or replace function public.solicitantes_de_reservas(p_reservas uuid[])
returns table (reserva_id uuid, solicitante text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    r.id,
    coalesce(
      nullif(btrim(p.alias), ''),
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre
    )
  from public.reserva_zona r
  left join public.perfil p on p.id = r.solicitada_por
  left join public.membresia_unidad m
         on m.unidad_id = r.unidad_id
        and m.usuario_id = r.solicitada_por
        and m.activo
  where r.id = any(p_reservas)
    -- La misma visibilidad que la política de la tabla: quien opera la
    -- vivienda, la administración del condominio, el huésped sobre la suya y
    -- la portería de ese edificio.
    and (
      public.puede_operar_unidad(r.unidad_id)
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
      )
      or (r.solicitada_por = auth.uid())
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_guardia_de_condominio(z.condominio_id)
      )
    );
$$;

-- 2. Chat: el autor que vive en el edificio firma con su alias, si lo tiene.
--    El depto ya lo pone este mismo disparador (`autor_unidad`). El personal
--    --portería, administración-- firma con su nombre: habla por su cargo.
create or replace function public.mensaje_con_el_depto_del_autor()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_alias text;
begin
  select c.condominio_id into v_condominio
  from public.conversacion c
  where c.id = new.conversacion_id;

  -- Sin `if new.autor_unidad is null`: se pisa siempre. Lo que manda el
  -- cliente no cuenta.
  new.autor_unidad := public.viviendas_de_en(new.autor_id, v_condominio);

  if new.autor_unidad is not null then
    select nullif(btrim(p.alias), '') into v_alias from public.perfil p where p.id = new.autor_id;
    if v_alias is not null then
      new.autor_nombre := v_alias;
    end if;
  end if;

  return new;
end;
$$;

comment on column public.perfil.alias is
  'Seudónimo de la persona. Si lo tiene, es como aparece --con su depto al lado-- en el chat y en las reservas de zonas comunes, para todos (hueco 21, 21/10/2026). En el directorio de propiedades la administración y la portería ven el nombre real.';
comment on column public.perfil.usa_alias_zonas is
  'Ya no se lee (hueco 21, 21/10/2026): el alias se usa siempre que exista, sin casilla por sección. Se conserva por los datos ya guardados.';
