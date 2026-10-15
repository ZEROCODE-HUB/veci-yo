-- El numero de la policia lo pone el edificio (15/10/2026).
--
-- La pantalla de la porteria para recibir a un menor tenia un boton «Llamar a
-- la policia (123)» con el 123 escrito a fuego: es el de Colombia, y en Peru
-- es el 105. El cliente decidio que sea un dato del edificio que la
-- administracion puede cambiar, y que al configurarlo se sugiera el del pais.
--
-- Vacio significa «el del pais»: la app lo deduce de `condominio.pais`.

alter table public.condominio
  add column if not exists telefono_policia text;

comment on column public.condominio.telefono_policia is
  'Numero de la policia que marca la porteria. Vacio = el del pais del edificio (lo deduce la app).';
