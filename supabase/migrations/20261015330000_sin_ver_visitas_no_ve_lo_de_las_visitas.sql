-- Sin «ver visitas», tampoco lo que cuelga de ellas (15/10/2026, hueco 34).
--
-- La tabla `visita` ya pedía `puede_coadmin(..., 'visualizarVisitas')`. Pero
-- las tablas hijas --invitados, vehículos, verificación de documentos,
-- autorizaciones de menores-- deciden con `puede_ver_visita`, y esa dejaba
-- pasar a todo el personal que no fuera solo guardia. O sea que un
-- coadministrador sin el permiso no veía la visita pero sí a sus invitados,
-- sus placas y la foto de sus documentos.
--
-- Ahora la rama del personal dice lo mismo que la política de `visita`: la
-- portería dentro de su ventana, y la administración con el permiso (el
-- administrador lo tiene siempre; al coadministrador, sin la clave anotada,
-- se le cuenta como permitido, igual que en `puede_coadmin`).

create or replace function public.puede_ver_visita(p_visita_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        (
          public.es_guardia_de_condominio(v.condominio_id)
          and public.visita_en_ventana_de_porteria(
                v.condominio_id, v.fecha_desde, v.fecha_hasta,
                v.estado, v.tipo, v.created_at, v.registrada_por)
        )
        or public.puede_coadmin(v.condominio_id, 'visualizarVisitas')
        /*
          `es_miembro_unidad` y no `puede_operar_unidad`, que era lo que habia:
          esa incluye a todo el personal del edificio, guardia incluido, asi
          que por aqui volvia a entrar sin fecha lo que la rama de arriba
          acaba de cerrar. Lo delato la prueba, no la lectura. El personal ya
          esta arriba; aqui quedan los de la vivienda.
        */
        or (v.unidad_id is not null and public.es_miembro_unidad(v.unidad_id))
        -- Lo suyo, y solo lo suyo: la visita que él registró.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.es_huesped_con_reserva(v.unidad_id)
        )
      )
  );
$$;
