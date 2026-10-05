-- ----------------------------------------------------------------------------
-- Dos funciones internas mas que no lo eran
-- ----------------------------------------------------------------------------
-- Salieron al escribir las pruebas de las preferencias de aviso: para
-- comprobar que apagar un motivo lo apaga de verdad hace falta provocar una
-- notificacion, y al mirar como se provoca aparecio que `notificar_unidad`
-- **la puede llamar cualquiera**.
--
--   · `notificar_unidad(unidad, tipo, titulo, mensaje, ...)` es `security
--     definer` y tiene `execute` concedido a `anon` y a `authenticated`. O sea
--     que cualquiera --sin cuenta siquiera-- puede meterle a toda una vivienda
--     una notificacion con el texto que quiera: «Tienes un paquete en
--     porteria», «Tu reserva fue rechazada», lo que sea. La llaman los
--     disparadores de correspondencia, reservas y visitas, y ninguno de ellos
--     necesita el permiso: los disparadores corren con el dueño de la funcion.
--   · `enviar_recordatorios_precheckin()` es la tarea del cron que escribe el
--     03/10. Tambien concedida: cualquiera con sesion podia **disparar la
--     pasada completa de recordatorios** --emitiendo un enlace nuevo a cada
--     huesped, que anula el anterior-- tantas veces como quisiera. La llama
--     `cron.schedule`, que corre como `postgres`.
--
-- Es la tercera vez que aparece esta familia: primero `viviendas_de_en`,
-- `consumo_verificaciones_de` y `anotar_verificacion` --`20261005130000`, donde
-- el `revoke` no revocaba porque le faltaba `public`-- y ahora estas dos, donde
-- el `grant` estaba puesto a mano.
--
-- ----------------------------------------------------------------------------
-- Y por que no hay un guarda que las cuente
-- ----------------------------------------------------------------------------
-- A la segunda vez que un defecto se repite, se escribe el guarda. Se intento,
-- y la pregunta no se puede hacer: «funcion `security definer` que escribe y no
-- comprueba quien llama» da **ochenta** candidatas en este esquema, y la
-- mayoria son correctas porque comprueban a traves de un ayudante
-- --`es_admin_condominio`-- o porque se autentican con un token, que es como
-- entra el huesped, que no tiene cuenta.
--
-- Al afinarlo a las nueve que escriben, las nueve «parecian» comprobar algo. Y
-- `notificar_unidad` salia entre las buenas por la columna `m.puede_acceder`:
-- leer una columna llamada `puede_*` es indistinguible, para un `grep`, de
-- llamar a `puede_coadmin`. Un guarda asi da cero con el agujero dentro, que
-- es peor que no tenerlo --ya paso con `buscar-pantallas-sin-camino`, que se
-- borro por lo mismo--.
--
-- Lo que si queda es el caso de prueba: `funciones-internas-no-son-publicas`
-- lleva ahora las cinco, y cada una nueva se añade ahi. Una lista escrita a
-- mano y comprobada de verdad vale mas que un contador que no distingue.
--
-- Aditiva: solo quita permisos que no debieron existir.

revoke execute on function public.notificar_unidad(
  uuid, public.motivo_notificacion, text, text, text, uuid, uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.notificar_unidad(
  uuid, public.motivo_notificacion, text, text, text, uuid, uuid, boolean)
  to service_role;

comment on function public.notificar_unidad(uuid, public.motivo_notificacion, text, text, text, uuid, uuid, boolean) is
  'Avisa a los miembros de la vivienda que quieren saber de ese motivo. Con p_solo_residentes deja fuera al huesped temporal. Interna: la llaman los disparadores, y hasta el 05/10/2026 la podia llamar cualquiera con el texto que quisiera.';

revoke execute on function public.enviar_recordatorios_precheckin()
  from public, anon, authenticated;

grant execute on function public.enviar_recordatorios_precheckin()
  to service_role;

comment on function public.enviar_recordatorios_precheckin is
  'La pasada diaria de recordatorios del precheckin. La llama el cron, que corre como postgres. Interna: emite un enlace nuevo a cada huesped --anulando el anterior-- asi que dispararla a mano le rompe el enlace a quien ya lo tenia.';
