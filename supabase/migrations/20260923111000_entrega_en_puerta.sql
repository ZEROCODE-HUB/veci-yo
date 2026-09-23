-- ----------------------------------------------------------------------------
-- La entrega en puerta la autoriza la administración, no la portería
-- ----------------------------------------------------------------------------
-- Del documento de traspaso, flujo 4.5 de correspondencia:
--
--   "Seguridad registra la llegada de un paquete: torre, piso, si se puede
--    entregar directo en puerta (`entregaEnPuerta`, **condicionado por
--    `PermisoVivienda.entregaDirecta` configurado por el Administrador**)."
--
--   "Reglas raras: el permiso de entrega directa vive a nivel unidad
--    (`PermisoVivienda`), configurado por el Administrador, **no por el propio
--    Residente**." [DECIDIDO]
--
-- `permiso_vivienda.entrega_directa` es una de las columnas que nadie miraba:
-- la portería podía marcar cualquier paquete como "entregar en puerta" aunque
-- el edificio no lo permitiera para esa vivienda.
--
-- A diferencia del aforo y el mínimo de noches —que el KT dice advertir— este
-- no es un límite que el propietario module: es un permiso que concede la
-- administración y que el residente no puede darse. Por eso aquí sí se
-- impone.

create or replace function public.respetar_entrega_directa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_permitida boolean;
begin
  if not coalesce(new.entrega_en_puerta, false) then
    return new;
  end if;

  select p.entrega_directa into v_permitida
  from public.permisos_de_unidad(new.unidad_id) p;

  -- Sin permisos configurados no hay regla que imponer: un condominio que no
  -- ha dicho nada no esta prohibiendo nada.
  if v_permitida is null then
    return new;
  end if;

  if not v_permitida then
    raise exception 'Esta vivienda no tiene autorizada la entrega en puerta';
  end if;

  return new;
end;
$$;

drop trigger if exists correspondencia_entrega_directa on public.correspondencia;

create trigger correspondencia_entrega_directa
  before insert or update on public.correspondencia
  for each row execute function public.respetar_entrega_directa();

comment on function public.respetar_entrega_directa() is
  'La entrega en puerta la autoriza la administracion por vivienda (permiso_vivienda.entrega_directa). La porteria la aplica, no la decide. KT flujo 4.5.';
