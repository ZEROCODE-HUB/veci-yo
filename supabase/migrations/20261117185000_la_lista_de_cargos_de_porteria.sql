-- La lista de cargos de la portería (17/11/2026).
--
-- En Mensajería, al elegir a quién escribir en la portería, el cliente pidió
-- ver el cargo y el nombre: «Conserje · Federico Valverde», «Seguridad · …».
-- Hasta hoy el personal de portería no tenía cargo: todos eran «guardia».
--
-- Los cargos son una lista de la base, como los del equipo administrativo
-- (`cargos_equipo_admin`), para que se puedan renombrar o agregar desde el
-- panel. Esta migración solo añade el nombre de la lista al tipo: un valor
-- nuevo de un enum no se puede usar en la misma transacción en que se crea,
-- así que la lista y sus opciones van en la siguiente (20261117185010).
--
-- Solo aditiva.

alter type public.nombre_catalogo add value if not exists 'cargos_de_porteria';
