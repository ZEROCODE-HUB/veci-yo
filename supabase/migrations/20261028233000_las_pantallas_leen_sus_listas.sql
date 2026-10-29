-- ============================================================================
-- Las pantallas ya leen sus listas de la base (28/10/2026)
-- ============================================================================
--
-- La app y la web dejaron de llevar escritas estas listas: ahora las leen de
-- `catalogo_opcion` (`useLista` en la app, `useListaDeLaBase` en la web). Con
-- eso pasan a salir en Panel › Más › Listas, donde cambiarlas cambia lo que se
-- ve. Ver `20261028232000` para por qué el panel solo enseña las conectadas.
--
-- Siguen sin conectar, a propósito y con su motivo: `empresas_de_mensajeria`
-- (la pantalla pide el nombre a mano), `oficios_de_profesionales` (se guarda
-- el nombre y la pantalla compara con «Otros»), `turnos_franjas` (el filtro
-- compone otra etiqueta), `rotacion_tipos` y `torre_opciones` (ya no las usa
-- ninguna pantalla), `archivo_formatos` (lo deciden también los buckets),
-- `campos_obligatorios_preregistro` (lo decide la ficha de la web y la base)
-- y `nacionalidades` (la lista generada de países del mundo).
--
-- Aditiva.
-- ============================================================================

update public.catalogo_info set conectada = true
 where catalogo in (
   'tipos_de_vehiculo',        -- vehículos de residentes, visitas, portería y la web
   'categorias_de_anuncio',    -- formulario, filtros y tarjetas de anuncios
   'areas_de_pqrs',            -- formulario y lista de PQRS
   'tipos_de_pqrs',
   'horarios_de_entrada',      -- Permisos › renta corta (por `extra.desde`/`hasta`)
   'equipamiento_obligatorio', -- nombres e iconos en las tres tarjetas
   'responsables_de_menor'     -- preregistro de la web y ficha en portería
 );
