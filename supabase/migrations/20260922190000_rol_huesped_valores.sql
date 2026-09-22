-- ----------------------------------------------------------------------------
-- `huesped_temporal` como rol de una vivienda
-- ----------------------------------------------------------------------------
-- La app tiene `huesped-temporal` entre sus roles activos y una navegacion
-- entera para el -- Mi alojamiento, reglas de huesped, zonas restringidas --,
-- pero NINGUNA membresia de la base lo produce: `rol_unidad` no lo contemplaba.
-- El rol solo existia en el modo demo, asi que una persona real que se aloja
-- unos dias no podia entrar.
--
-- Va en su propia migracion porque un valor de enum recien agregado no se
-- puede usar en la misma transaccion que lo agrega.

alter type public.rol_unidad add value if not exists 'huesped_temporal';
