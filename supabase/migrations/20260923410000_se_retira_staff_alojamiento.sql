-- ----------------------------------------------------------------------------
-- Se retira `staff_alojamiento`
-- ----------------------------------------------------------------------------
-- La tabla existe desde el primer dia --coanfitriones, limpieza,
-- mantenimiento-- y **nadie la usa**: cero filas, ninguna pantalla que la
-- escriba o la lea, ninguna funcion que la mencione y ninguna clave foranea
-- que apunte a ella.
--
-- Tampoco hay decision de producto detras. El KT no describe el flujo, y la
-- tabla obliga a decidir algo que nadie ha decidido: `usuario_id` significa
-- que el personal **tendria cuenta en la aplicacion**, y entonces hay que
-- responder que ve la persona que limpia cuando entra --¿el codigo de la
-- puerta?, ¿el wifi?, ¿quien se aloja esta semana?--. Eso es una decision de
-- privacidad, no un detalle de implementacion.
--
-- Una tabla sin uso no es gratis: es una puerta que nadie vigila y una duda
-- para quien llegue despues. Se retira, y si el cliente la pide, recuperarla
-- es copiar quince lineas de `20260921214000_renta_corta.sql`, que se quedan
-- en el historial para siempre.
--
-- Lo que el caso util pedia --que el huesped sepa a quien llamar para
-- limpieza-- se resolveria sin cuentas, con la misma forma que un menor:
-- nombre, rol y telefono, sin acceso. Cuando se decida.

drop table if exists public.staff_alojamiento;
drop type if exists public.rol_staff_alojamiento;
