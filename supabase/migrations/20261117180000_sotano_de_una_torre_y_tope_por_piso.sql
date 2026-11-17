-- ============================================================================
-- El sótano es de una torre, y tope de departamentos por piso (17/11/2026)
-- ============================================================================
--
-- El cliente, el 17/11/2026:
--   · «Sótano quitarlo de Nueva Torre. En Estacionamiento que diga en qué
--     torre está: primero se crea la torre, luego recién el sótano.»
--   · «Cuántos máximo por piso al crear torre.»
--
-- Todo aditivo. `torre_id` es opcional en la base porque los niveles de antes
-- no tienen torre; el formulario la pide al crear uno nuevo.

alter table public.nivel_estacionamiento
  add column if not exists torre_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'nivel_estacionamiento_torre_del_mismo_edificio'
  ) then
    -- Con el condominio en la clave: una torre de otro edificio no se puede
    -- poner aunque se conozca su id. `set null` solo sobre la torre: el nivel
    -- (y sus estacionamientos) sobrevive a una torre borrada y queda sin torre,
    -- que se ve y se corrige.
    alter table public.nivel_estacionamiento
      add constraint nivel_estacionamiento_torre_del_mismo_edificio
      foreign key (torre_id, condominio_id)
      references public.torre (id, condominio_id)
      on delete set null (torre_id);
  end if;
end $$;

create index if not exists nivel_estacionamiento_torre_idx
  on public.nivel_estacionamiento (torre_id);

comment on column public.nivel_estacionamiento.torre_id is
  'La torre a la que pertenece el sótano o nivel (17/11/2026). Vacío en los '
  'de antes; el formulario la pide al crear uno nuevo.';

-- El tope por piso, cambiable desde el panel.
insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, tipo, unidad, minimo, maximo, ambito, categoria, riesgo, es_publico, valores_permitidos, descripcion)
values
  ('torre_viviendas_por_piso_maximo', '20', '20', 'entero', 'viviendas', 1, 99, 'plataforma', 'edificio', 'bajo', true, null,
   'Cuántos departamentos por piso se pueden pedir como mucho al crear una torre.')
on conflict (clave) do nothing;
