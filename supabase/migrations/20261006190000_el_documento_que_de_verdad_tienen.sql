-- ----------------------------------------------------------------------------
-- El documento que de verdad tienen: falta el PPT
-- ----------------------------------------------------------------------------
-- Salio leyendo la documentacion de tusdatos.co el 06/10/2026, buscando otra
-- cosa. Lo dicen ellos, y es una nota legal, no una limitacion suya:
--
--   «El tipo de documento PEP (Permiso de Permanencia Especial) utilizado por
--   migrantes venezolanos no es un documento valido para realizar consultas de
--   identidad a traves de nuestro servicio, ya que dejo de tener validez a
--   partir del mes de marzo de 2023, de acuerdo al Articulo 38 de la
--   Resolucion 0971 de 2021.»
--
-- Lo que lo sustituye es el **PPT** --Permiso por Proteccion Temporal-- y
-- `tipo_documento` **no lo tiene**. O sea que una persona venezolana con el
-- documento que lleva hoy en el bolsillo **no se puede registrar**: ni como
-- residente, ni como huesped, ni como visita en la porteria.
--
-- Y al reves: quien se registre con PEP queda con un documento que ya no vale
-- ni en la puerta ni en el reporte al ministerio.
--
-- ----------------------------------------------------------------------------
-- Que se hace y que no
-- ----------------------------------------------------------------------------
-- **Se añade `ppt`.** Aditivo y sin riesgo.
--
-- **El `pep` se queda**, y no por descuido:
--
--   · quitar un valor de un enum en Postgres no se puede sin recrear el tipo
--     entero, con todas las columnas que lo usan;
--   · y aunque se pudiera, retirar un tipo de documento de la lista que ve la
--     gente es una decision de producto. Hoy **ninguna fila lo usa**
--     --comprobado contando en `invitado` y en `perfil`-- asi que no hay dato
--     que arreglar, solo una opcion que sobra en un selector.
--
-- Queda en REVISAR-A-OJO para que lo decidan. Mientras tanto, el comentario de
-- abajo deja dicho lo que pasa con el, que es lo unico que no se puede perder.

alter type public.tipo_documento add value if not exists 'ppt';

comment on type public.tipo_documento is
  'Los documentos con los que alguien se identifica. `ppt` --Permiso por Proteccion Temporal-- se añadio el 06/10/2026: es el documento que llevan hoy los migrantes venezolanos y sin el no se podian registrar. `pep` sigue en la lista por compatibilidad y **ya no es valido para identificar a nadie** desde marzo de 2023 (Art. 38 de la Resolucion 0971 de 2021): no se ofrece a quien se registra y queda pendiente de retirar.';
