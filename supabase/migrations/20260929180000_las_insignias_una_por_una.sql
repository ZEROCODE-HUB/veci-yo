-- ----------------------------------------------------------------------------
-- El cuadro de honor devuelve las insignias una por una
-- ----------------------------------------------------------------------------
-- La tarjeta de cada vivienda enseñaba «🏅 3»: la suma de todos los
-- reconocimientos, sin decir de cuáles. En el prototipo salían una por una, con
-- su icono y su número --🤝 2, ♻️ 1--, que es lo que distingue a un buen vecino
-- de uno puntual. Al migrar quedó el total.
--
-- El detalle no expone nada nuevo: `reconocimiento_lectura` ya deja leer los
-- reconocimientos de todo el condominio a cualquier miembro, así que quien
-- mirase la API podía contarlos por su cuenta. Lo que se evita devolviéndolo
-- aquí es una consulta por vivienda desde el cliente.
--
-- Hay que borrar la función antes de crearla: Postgres no deja cambiar el tipo
-- de retorno con `create or replace`. Es la misma función, con una columna más;
-- no se toca ninguna tabla ni ningún dato.

drop function if exists public.cuadro_honor(uuid);

create function public.cuadro_honor(p_condominio_id uuid)
returns table (
  unidad_id              uuid,
  codigo                 text,
  torre_numero           int,
  responsable_usuario_id uuid,
  responsable            text,
  periodos_al_dia        int,
  periodos_totales       int,
  insignias              int,
  insignias_detalle      jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
    order by periodo desc
    limit 12
  ),
  responsables as (
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    -- Si esa persona pidió aparecer con alias aquí, el nombre real no sale.
    coalesce(
      case when p.usa_alias_cuadro_honor then nullif(p.alias, '') end,
      r.nombre
    ),
    pagos.al_dia,
    (select count(*) from periodos)::int,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id),
    /*
      Una entrada por insignia recibida, ordenada como el catálogo para que la
      tarjeta no baile de orden entre viviendas. Las que no tiene no salen: en
      el prototipo aparecían las cinco con un cero al lado y eso son cuatro
      chips vacíos por vivienda.

      `[]` y no `null` cuando no hay ninguna, para que el cliente no tenga que
      distinguir dos formas de "nada".
    */
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'clave',    d.clave,
                  'etiqueta', d.etiqueta,
                  'icono',    d.icono,
                  'cantidad', d.cantidad
                )
                order by d.etiqueta
              )
         from (
           select i.clave, i.etiqueta, coalesce(i.icono, '⭐') as icono,
                  count(*)::int as cantidad
             from public.reconocimiento rec
             join public.insignia i on i.id = rec.insignia_id
            where rec.usuario_id = r.usuario_id
              and rec.condominio_id = p_condominio_id
            group by i.clave, i.etiqueta, i.icono
         ) d),
      '[]'::jsonb
    )
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    and pagos.al_dia = (select count(*) from periodos)
  order by t.numero, u.codigo;
$$;

comment on function public.cuadro_honor(uuid) is
  'Cuadro de honor: unidades sin cuotas pendientes en los ultimos 12 periodos. Respeta el alias de quien pidio usarlo aqui. Devuelve las insignias una por una en insignias_detalle. No expone montos ni morosidad.';

revoke all on function public.cuadro_honor(uuid) from public;
grant execute on function public.cuadro_honor(uuid) to authenticated;
