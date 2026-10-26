-- Los comentarios de las columnas que cambiaron con los huecos 18 y 27.
--
-- Hueco 27 (21/10/2026): el cliente corrigió que la marca y el color del
-- vehículo sí se guardan, desde la reserva y el preregistro. Era cierto para
-- los vehículos de una visita (`vehiculo_visita`, que el preregistro web ya
-- pedía y desde hoy también la reserva de la app); la pregunta hablaba de los
-- del residente (`vehiculo_residente`), cuya pantalla solo pide placa y tipo.
-- Los comentarios lo dicen ahora sin ambigüedad. Y el modo oscuro «por ahora
-- no va»: la app ya no lo lee ni lo escribe.
--
-- Hueco 18 (21/10/2026): «Publicado en Airbnb/Booking», otras plataformas y
-- PMS se quitaron de la pantalla. Las columnas se conservan con lo guardado.
--
-- Solo comentarios.

comment on column public.vehiculo_visita.marca is
  'Marca del vehículo de una visita o estancia. La piden la reserva de la app y el preregistro del huésped (opcional); la ve la portería junto a la placa (hueco 27).';
comment on column public.vehiculo_visita.color is
  'Color del vehículo de una visita o estancia: la portería reconoce un coche por el color antes que por la placa. Lo piden la reserva de la app y el preregistro (opcional, hueco 27).';
comment on column public.vehiculo_residente.marca is
  'Marca del vehículo de un residente. La pantalla de vehículos del residente pide solo placa y tipo, así que hoy queda vacía. (La marca de los vehículos de una visita va en vehiculo_visita.)';
comment on column public.vehiculo_residente.color is
  'Color del vehículo de un residente. La pantalla de vehículos del residente pide solo placa y tipo, así que hoy queda vacío. (El color de los vehículos de una visita va en vehiculo_visita.)';
comment on column public.perfil.modo_oscuro is
  'Preferencia de modo oscuro. Sin uso: «por ahora no va» (hueco 27, 21/10/2026); la app ya no la lee ni la escribe. Se conserva por los datos guardados.';
comment on column public.suscripcion_renta_corta.publicado_airbnb is
  'Ya no se usa (hueco 18, 21/10/2026): la opción «Publicado en Airbnb» se quitó porque no hay integración posible (la API no es pública). Se conserva con lo guardado.';
comment on column public.suscripcion_renta_corta.publicado_booking is
  'Ya no se usa (hueco 18, 21/10/2026): la opción «Publicado en Booking» se quitó porque no hay integración posible. Se conserva con lo guardado.';
comment on column public.suscripcion_renta_corta.otras_plataformas is
  'Ya no se usa (hueco 18, 21/10/2026): la opción «Otras plataformas» se quitó de la pantalla. Se conserva con lo guardado.';
comment on column public.suscripcion_renta_corta.pms is
  'Ya no se usa (hueco 18, 21/10/2026): la pregunta del PMS se quitó de la pantalla; no hay integración. Se conserva con lo guardado.';
