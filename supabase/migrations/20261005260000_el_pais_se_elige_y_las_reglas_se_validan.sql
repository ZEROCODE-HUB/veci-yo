-- ----------------------------------------------------------------------------
-- El pais se elige de una lista, y las reglas a medio poner se validan
-- ----------------------------------------------------------------------------
-- Dos cosas que el cliente pidio el 05/10/2026: «el pais pues debe ser un
-- desplegable» y «las columnas duplicadas hay que borrarlas». Lo primero es de
-- la aplicacion y esta en `CampoPais`; aqui va lo segundo, mas una tercera
-- cosa que aparecio al mirar: doce restricciones creadas **NOT VALID** que
-- nadie valido nunca.
--
-- ----------------------------------------------------------------------------
-- 1. Las dos columnas gemelas, que ahora si se borran
-- ----------------------------------------------------------------------------
-- `membresia_unidad` e `invitacion` tenian **dos** columnas para el pais del
-- contacto de emergencia: `codigo_pais_emergencia` y
-- `contacto_emergencia_codigo`. La segunda es la que se escribe y se lee; la
-- primera no la tocaba nadie.
--
-- Las cree yo el 03/10/2026 en `20261003110000_cada_telefono_con_su_pais.sql`,
-- sin fijarme en que la columna ya existia con otro nombre. O sea que esto no
-- es quitarle una columna al cliente: es recoger lo que sobre de la mia.
--
-- Comprobado antes de borrar, contando: **0 de 11** filas en
-- `membresia_unidad` y **0 de 17** en `invitacion`. Y comprobado que ninguna
-- funcion devuelve esas dos tablas **como tipo**, que es lo que en este
-- proyecto ya rompio `permisos_de_unidad` al añadirle una columna: una funcion
-- asi construye la fila columna a columna y se rompe la siguiente vez que
-- alguien la llama, no al aplicar la migracion.
--
-- La instruccion general sigue siendo que las migraciones son aditivas. Esta
-- es la excepcion, y la autorizo el cliente por escrito.

alter table public.membresia_unidad drop column if exists codigo_pais_emergencia;
alter table public.invitacion       drop column if exists codigo_pais_emergencia;

-- ----------------------------------------------------------------------------
-- 2. Donde esta el edificio, que es un codigo y no un nombre
-- ----------------------------------------------------------------------------
-- `condominio.pais` es `character(2)` y guarda `CO`. El formulario pedia el
-- **nombre** en un campo de texto libre, y al guardar hacia esto:
--
--     PAIS_DESDE_NOMBRE[valores.pais] ?? valores.pais.slice(0, 2).toUpperCase()
--
-- Un mapa con dos entradas --Colombia y Peru-- y, para todo lo demas, **las
-- dos primeras letras de lo que se escribiera**. «Estados Unidos» se guardaba
-- como `ES`, que es España. Y como la columna mide exactamente dos, el recorte
-- entraba sin un solo error.
--
-- No es cosmetico: de esta columna salen el tipo de documento que se pide en
-- la puerta, la etiqueta del identificador fiscal --RUC en Peru, NIT en
-- Colombia-- y el formato de los reportes al ministerio.

comment on column public.condominio.pais is
  'Donde esta el edificio, en ISO 3166-1 alfa-2. Lo elige una lista desde el 05/10/2026: antes era texto libre y se guardaban las dos primeras letras del nombre, asi que «Estados Unidos» quedaba como ES. Distinto de `codigo_pais`, que es el del telefono de contacto.';

-- ----------------------------------------------------------------------------
-- 3. Doce restricciones con el temporizador puesto
-- ----------------------------------------------------------------------------
-- `NOT VALID` significa «no mires las filas que ya estan». Se usa para no
-- bloquear una migracion con datos viejos, y esta bien **mientras alguien la
-- valide despues**. Nadie lo hizo nunca en este proyecto.
--
-- Lo que deja es peor que no tener la regla: `NOT VALID` **si** comprueba
-- cualquier UPDATE posterior sobre una fila, aunque no toque esa columna. El
-- 05/10/2026 eso dejo el perfil de Sofia --la vecina de la 102, la cuenta que
-- mas sale en las pruebas-- **imposible de modificar en absoluto**: tenia
-- `codigo_pais = '+57'`, de cuando el prefijo y el codigo eran lo mismo para
-- la pantalla, y no se le podia cambiar ni el nombre. El error nombraba una
-- columna que nadie habia tocado.
--
-- Al enumerarlas salieron doce. Las doce estan limpias --contado una por una,
-- cero filas que las incumplan-- asi que se validan. Que el `validate` pase es
-- la prueba de que no queda ninguna mala; de ahi en adelante el dato malo se
-- rechaza al escribirlo, que es donde se entiende.
--
-- Las dos de `codigo_pais_emergencia` no estan en la lista: se fueron con sus
-- columnas en el punto 1.
--
-- Quedan fuera las del esquema `realtime`, que no son nuestras.

alter table public.condominio           validate constraint codigo_pais_es_iso2;
alter table public.invitado             validate constraint codigo_pais_es_iso2;
alter table public.membresia_condominio validate constraint codigo_pais_es_iso2;
alter table public.membresia_unidad     validate constraint codigo_pais_es_iso2;
alter table public.porteria             validate constraint codigo_pais_es_iso2;
alter table public.reclamo              validate constraint codigo_pais_contacto_es_iso2;

-- Y las cuatro que no son de paises, que llevaban ahi lo mismo:
--
--   · un invitado menor con responsable tiene que decir el parentesco --y al
--     reves, un parentesco sin responsable no significa nada--;
--   · unos resultados publicados tienen que decir **quien** los publico, que
--     es la regla 2 de AGENTS.md y por eso existe la columna;
--   · los dias de recordatorio del anfitrion tienen que ser sensatos;
--   · unas condiciones de aprobacion en una zona que no requiere aprobacion
--     son un texto que nadie va a leer nunca.

alter table public.invitado                validate constraint invitado_responsable_coherente;
alter table public.publicacion             validate constraint publicacion_resultados_con_firma;
alter table public.suscripcion_renta_corta validate constraint renta_corta_recordatorio_dias_sensatos;
alter table public.zona_comun              validate constraint zona_condiciones_solo_con_aprobacion;
