-- ----------------------------------------------------------------------------
-- Revocar a `authenticated` no revoca nada
-- ----------------------------------------------------------------------------
-- Postgres concede `EXECUTE` de toda funcion nueva a **PUBLIC**, y `anon`,
-- `authenticated` y `service_role` son miembros de PUBLIC. Asi que esto, que
-- es lo que hay escrito en dos migraciones de septiembre:
--
--     revoke execute on function public.lo_que_sea(...) from anon, authenticated;
--
-- **no quita el permiso**: retira una concesion directa que nunca existio y
-- deja intacta la de PUBLIC. El catalogo lo dice sin rodeos --`proacl` sigue
-- teniendo `=X/postgres`, que es PUBLIC-- y la funcion se sigue pudiendo
-- llamar por PostgREST con la sesion de cualquiera.
--
-- Salio el 05/10/2026 al escribir el caso «nadie puede preguntar donde vive
-- nadie» para `viviendas_de_en`: la llamada con sesion de vecina **funciono**.
-- Al mirar las otras dos funciones internas del proyecto, las dos igual.
--
-- ----------------------------------------------------------------------------
-- Lo que estaba abierto
-- ----------------------------------------------------------------------------
--   · `anotar_verificacion` --la peor-- descuenta una verificacion de
--     antecedentes **de pago** y anota la constancia «SIN mirar quien la pide»,
--     dice su propio comentario. La que comprueba el permiso es
--     `verificar_antecedentes`, y era evitable: cualquiera con sesion podia
--     gastarle el saldo a otra vivienda y dejar una verificacion firmada
--     contra el invitado que quisiera.
--   · `consumo_verificaciones_de` enseña el saldo de una vivienda ajena.
--   · `viviendas_de_en` dice donde vive cualquiera, de cualquier edificio.
--
-- Las tres estan escritas a proposito sin comprobar quien pregunta, porque
-- cada una tiene delante su hermana publica que si lo hace. El unico limite
-- entre las dos era el `revoke`, y el `revoke` no revocaba.
--
-- ----------------------------------------------------------------------------
-- Lo que no hay que confundir
-- ----------------------------------------------------------------------------
-- `security definer` no es el problema: el proyecto tiene decenas, y la mayoria
-- son publicas a proposito --`es_admin_condominio`, `puede_ver_zona`-- porque
-- comprueban `auth.uid()` por dentro. Lo que hay que revocar es la que **no
-- pregunta quien llama**, y esas son estas tres.
--
-- Aditiva: solo quita permisos que nunca debieron estar.

revoke execute on function public.viviendas_de_en(uuid, uuid)
  from public, anon, authenticated;

revoke execute on function public.consumo_verificaciones_de(uuid)
  from public, anon, authenticated;

revoke execute on function public.anotar_verificacion(
  uuid, text, text, resultado_verificacion, jsonb)
  from public, anon, authenticated;

-- `service_role` perdia el permiso con el `from public` de arriba --es miembro
-- de PUBLIC-- y lo necesita: la clave de servicio es la que siembra y la que
-- usan las herramientas. Se le concede directo, que es lo que hay que hacer
-- cuando se cierra PUBLIC.

grant execute on function public.viviendas_de_en(uuid, uuid) to service_role;
grant execute on function public.consumo_verificaciones_de(uuid) to service_role;
grant execute on function public.anotar_verificacion(
  uuid, text, text, resultado_verificacion, jsonb) to service_role;
