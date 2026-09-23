-- ----------------------------------------------------------------------------
-- La verificación de identidad no es autoservicio
-- ----------------------------------------------------------------------------
-- `perfil.verificado` significa "alguien comprobó el documento de esta
-- persona". Es lo que sostiene que la portería confíe en quién entra al
-- edificio.
--
-- Hoy se lo pone uno mismo. Comprobado con una sesión real: Laura pasó su
-- `verificado` de `false` a `true` con un PATCH. Las tres políticas de `perfil`
-- son `id = auth.uid()`, y `verificado` es una columna más de la fila.
--
-- Es el mismo patrón que ya apareció en `restringida_huesped`, en las casillas
-- de audiencia y en `requiere_aprobacion`: una afirmación sobre alguien que ese
-- alguien puede escribir.
--
-- Aquí se corrige la mitad que es de seguridad. La otra mitad —que el flujo de
-- verificación toma tres fotos, las descarta y anuncia "validación exitosa"—
-- queda anotada como pendiente: construir la verificación de documentos de
-- verdad necesita un proveedor y una decisión del cliente, no una migración.

create or replace function public.proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sin sesión de aplicación son las migraciones o la consola, que ya pasan
  -- por encima de RLS.
  if auth.uid() is null then
    return new;
  end if;

  -- La bandera la enciende `verificar_perfil`, que comprueba quién pregunta.
  if coalesce(current_setting('veciyo.verificando_perfil', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' and coalesce(new.verificado, false) then
    raise exception 'Una cuenta nueva no nace verificada';
  end if;

  if tg_op = 'UPDATE' and new.verificado is distinct from old.verificado then
    raise exception 'La verificacion de identidad no la decide uno mismo';
  end if;

  return new;
end;
$$;

drop trigger if exists perfil_proteger on public.perfil;

create trigger perfil_proteger
  before insert or update on public.perfil
  for each row execute function public.proteger_perfil();


/**
 * El camino legítimo: la administración del condominio donde vive la persona.
 *
 * Sin esto la bandera quedaría muerta —nadie podría encenderla— y una columna
 * que nadie puede escribir es tan inútil como una que puede escribir
 * cualquiera.
 *
 * `perfil` es privado y la administración no lo lee, así que esta función no
 * devuelve nada del perfil: solo confirma que la marca quedó puesta.
 */
create or replace function public.verificar_perfil(
  p_usuario_id uuid,
  p_verificado boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_es_admin boolean;
begin
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad un on un.id = mu.unidad_id
    where mu.usuario_id = p_usuario_id
      and mu.activo
      and public.es_admin_condominio(un.condominio_id)
    union all
    select 1
    from public.membresia_condominio mc
    where mc.usuario_id = p_usuario_id
      and mc.activo
      and public.es_admin_condominio(mc.condominio_id)
  ) into v_es_admin;

  if not v_es_admin then
    raise exception 'Solo la administracion del condominio donde vive esa persona puede verificarla';
  end if;

  perform set_config('veciyo.verificando_perfil', 'on', true);
  update public.perfil set verificado = p_verificado, updated_at = now()
   where id = p_usuario_id;
  perform set_config('veciyo.verificando_perfil', 'off', true);

  return true;
end;
$$;

revoke all on function public.verificar_perfil(uuid, boolean) from public;
grant execute on function public.verificar_perfil(uuid, boolean) to authenticated;

comment on function public.verificar_perfil(uuid, boolean) is
  'Marca o desmarca la verificacion de identidad. Solo la administracion del condominio donde esa persona es miembro.';
