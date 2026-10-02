-- ----------------------------------------------------------------------------
-- Si el documento no coincide, no entra
-- ----------------------------------------------------------------------------
-- `estado_verificacion` tiene tres valores --`pendiente`, `verificado` y
-- `no_coincide`-- y `verificarDocumentoInvitado` escribia **«verificado» a
-- fuego**, siempre. Un solo boton y un solo desenlace.
--
-- Lo curioso es que la pantalla **si** detectaba el desajuste: el guardia
-- teclea el numero del documento y, si no cuadra con el del preregistro, sale
-- «El numero de identificacion no coincide con el registrado»... y ahi muere.
-- No quedaba constancia y la persona entraba igual.
--
-- O sea que el modulo existe para cazar a un impostor, lo cazaba, y no hacia
-- nada con ello.
--
-- Encontrado el 01/10/2026 barriendo valores que la base admite y la
-- aplicacion nunca escribe (REVISAR-A-OJO 99).
--
-- Decidido con el cliente el 02/10/2026, con estas palabras: «si no coincide no
-- lo deja entrar y ya pues».
--
-- ----------------------------------------------------------------------------
-- Por que en la base y no solo en la pantalla
-- ----------------------------------------------------------------------------
-- Porque es justo el defecto que se esta corrigiendo: una decision que vivia en
-- la pantalla. Marcar la llegada se puede pedir por la API sin pasar por
-- ninguna pantalla, y este es un limite de seguridad fisica --quien cruza la
-- puerta-- no una comodidad de la interfaz.

create or replace function public.no_entra_si_el_documento_no_coincide()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_estado estado_verificacion;
begin
  -- Solo se mira al **marcar la llegada**. Quitarla, o cualquier otro cambio
  -- sobre el invitado, no tiene nada que ver con esto.
  if coalesce(new.llego, false) = false and new.ingreso_en is null then
    return new;
  end if;

  -- Y solo cuando la llegada es nueva: una fila que ya estaba dentro no se
  -- vuelve a juzgar cada vez que se le toca otra cosa.
  if tg_op = 'UPDATE'
     and coalesce(old.llego, false) = coalesce(new.llego, false)
     and old.ingreso_en is not distinct from new.ingreso_en then
    return new;
  end if;

  select v.estado into v_estado
  from public.verificacion_documento v
  where v.invitado_id = new.id;

  /*
    `pendiente` y «sin verificar» no bloquean: hay visitas que no piden
    documento --el edificio lo decide con `verificar_documento_visitas`-- y la
    porteria registra a gente que llega sin preregistro. Lo unico que cierra la
    puerta es un **no coincide** explicito.
  */
  if v_estado = 'no_coincide' then
    raise exception
      'El documento de esta persona no coincide con el del preregistro: no puede registrarse su ingreso.'
      using errcode = 'check_violation',
            constraint = 'invitado_documento_no_coincide';
  end if;

  return new;
end;
$fn$;

comment on function public.no_entra_si_el_documento_no_coincide() is
  'Impide marcar la llegada de un invitado cuya verificacion de documento quedo en no_coincide. Pendiente o sin verificar no bloquean: solo un no coincide explicito.';

drop trigger if exists invitado_documento_no_coincide on public.invitado;

create trigger invitado_documento_no_coincide
  before insert or update on public.invitado
  for each row execute function public.no_entra_si_el_documento_no_coincide();

-- ----------------------------------------------------------------------------
-- Y al reves: si ya entro, no se le puede marcar «no coincide» por detras
-- ----------------------------------------------------------------------------
-- No por capricho: sin esto, el orden de las dos escrituras decide el
-- resultado, y una persona podria quedar dentro con el documento marcado como
-- falso sin que nada lo impidiera ni nadie se enterase. Si el guardia descubre
-- el desajuste **despues** de dejarle pasar, eso es una incidencia que hay que
-- tratar en persona, no un cambio de casilla.
create or replace function public.no_se_marca_no_coincide_tras_entrar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_llego boolean;
begin
  if new.estado <> 'no_coincide' then
    return new;
  end if;

  select coalesce(i.llego, false) into v_llego
  from public.invitado i where i.id = new.invitado_id;

  if v_llego then
    raise exception
      'Esta persona ya tiene el ingreso registrado: un desajuste posterior se trata como incidencia, no cambiando la verificacion.'
      using errcode = 'check_violation',
            constraint = 'verificacion_documento_ya_entro';
  end if;

  return new;
end;
$fn$;

comment on function public.no_se_marca_no_coincide_tras_entrar() is
  'Impide marcar no_coincide sobre alguien que ya entro. Sin esto el orden de las dos escrituras decidiria el resultado.';

drop trigger if exists verificacion_documento_ya_entro on public.verificacion_documento;

create trigger verificacion_documento_ya_entro
  before insert or update on public.verificacion_documento
  for each row execute function public.no_se_marca_no_coincide_tras_entrar();
