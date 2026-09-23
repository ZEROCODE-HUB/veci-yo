-- ----------------------------------------------------------------------------
-- Un residente menor de edad
-- ----------------------------------------------------------------------------
-- Del documento de traspaso, flujo 4.3 paso 3:
--
--   "Al crear un Residente, puede marcar si es menor de edad (checkbox) ->
--    **sin acceso a la plataforma**." [DECIDIDO]
--
-- Las tres columnas que hacen falta estan desde el primer dia —`es_menor`,
-- `puede_acceder` y un `usuario_id` que admite NULL— y no habia forma de
-- llegar a ellas: el unico camino para dar de alta a alguien en una vivienda
-- es la invitacion, que siempre exige un correo y emite un enlace para crear
-- una cuenta. Justo lo que un menor no debe tener.
--
-- Una familia que quiere registrar a sus hijos —para que la porteria sepa
-- quien vive ahi, que es el motivo por el que existe el campo— no podia.
--
-- Aqui va la regla y el camino. Y la regla es una afirmacion **sobre** una
-- persona, asi que no basta una politica: va en una restriccion, que si sabe
-- mirar la fila entera.

-- Nadie tiene `es_menor` puesto todavia, asi que la restriccion no rompe nada.
alter table public.membresia_unidad
  drop constraint if exists membresia_unidad_menor_sin_acceso;

alter table public.membresia_unidad
  add constraint membresia_unidad_menor_sin_acceso
  check (not es_menor or (usuario_id is null and not puede_acceder));

comment on constraint membresia_unidad_menor_sin_acceso on public.membresia_unidad is
  'Un menor figura en la vivienda pero no tiene cuenta ni acceso. KT flujo 4.3 paso 3.';


-- ----------------------------------------------------------------------------
-- Darlo de alta
-- ----------------------------------------------------------------------------
-- Podria hacerse con un insert directo —la politica de alta ya lo permite— y
-- por eso mismo existe esta funcion: para que las cuatro cosas que definen a
-- un menor no dependan de que quien llame se acuerde de ponerlas.
create or replace function public.registrar_menor(
  p_unidad_id uuid,
  p_nombre    text,
  p_telefono  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.puede_invitar_a_unidad(p_unidad_id) then
    raise exception 'No podes registrar personas en esta vivienda';
  end if;

  if nullif(btrim(coalesce(p_nombre, '')), '') is null then
    raise exception 'Falta el nombre';
  end if;

  insert into public.membresia_unidad
    (unidad_id, usuario_id, nombre, rol, es_menor, puede_acceder, es_residente, telefono)
  values
    (p_unidad_id, null, btrim(p_nombre), 'residente', true, false, true,
     nullif(btrim(coalesce(p_telefono, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.registrar_menor(uuid, text, text) is
  'Da de alta a un residente menor de edad: figura en la vivienda, sin cuenta y sin acceso. KT flujo 4.3.';

revoke all on function public.registrar_menor(uuid, text, text) from public;
grant execute on function public.registrar_menor(uuid, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- Y que no se le pueda dar acceso despues
-- ----------------------------------------------------------------------------
-- La restriccion impide que una fila de menor tenga cuenta. Falta lo otro:
-- que nadie convierta la membresia de un adulto con cuenta en "menor" para
-- quitarle el acceso de tapadillo, ni al reves. Un menor que cumple anos se
-- da de baja y se invita como cualquier otra persona, que es lo que el KT
-- describe: la cuenta nace de una invitacion, no de un cambio de casilla.
create or replace function public.proteger_menor_de_edad()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.es_menor is distinct from old.es_menor then
    raise exception 'La condicion de menor no se cambia: se da de baja y se vuelve a registrar';
  end if;

  return new;
end;
$$;

drop trigger if exists membresia_unidad_menor on public.membresia_unidad;

-- Los disparadores `before` de una tabla corren en orden alfabetico. Aqui da
-- igual: este y `proteger_membresia_unidad` son comprobaciones independientes
-- y ninguna depende de lo que haga la otra.
create trigger membresia_unidad_menor
  before update on public.membresia_unidad
  for each row execute function public.proteger_menor_de_edad();

comment on function public.proteger_menor_de_edad() is
  'La casilla de menor no se enciende ni se apaga sobre una membresia existente: se da de baja y se registra de nuevo.';
