-- ----------------------------------------------------------------------------
-- Retirar un mensaje se retira, y con el la mirada de la administracion
-- ----------------------------------------------------------------------------
-- El cliente el 05/10/2026: «yo no te pedi que se pueda retirar mensajes,
-- elimina esa funcion».
--
-- Se construyo por un punto --«moderacion del administrador»-- de una lista
-- que arme yo despues de su reunion del 02/10. Al preguntarmelo el cliente
-- --«de donde lo sacaste, estaba en el prototipo o en el alcance?»-- lo busque:
-- «moderacion» **no aparece** en el KT, ni en los hallazgos del prototipo, ni
-- en ningun documento del proyecto. Tampoco «canales» ni «silenciar».
--
-- O sea que no puedo demostrar que lo pidiera, y mientras no aparezca de donde
-- salio hay que tratarlo como mio. Se retira entero.
--
-- ----------------------------------------------------------------------------
-- Y esto arrastra lo otro
-- ----------------------------------------------------------------------------
-- `20261005140000` le dio a la administracion vista sobre **todos** los canales
-- del edificio, con este motivo escrito al lado: «sin esto no hay moderacion
-- posible --no se puede retirar un mensaje que no se ve--». El cliente lo dejo
-- a mi criterio (REVISAR-A-OJO 136).
--
-- Sin moderacion, ese motivo desaparece, asi que la vista se retira tambien: el
-- canal de propietarios vuelve a ser privado frente a la administracion, que es
-- como estaba antes y es el mejor valor por defecto. Quien administra ve los
-- canales en los que **esta**, por su rol, como cualquiera.
--
-- Lo que no cambia: sigue pudiendo **configurarlos** --crear, renombrar,
-- archivar-- porque eso va por `canales_del_condominio`, que es `security
-- definer` y no depende de ver la conversacion. Configurar un canal y leerlo
-- son dos cosas distintas, y conviene que sigan siendolo.
--
-- ----------------------------------------------------------------------------
-- Lo que SI se queda
-- ----------------------------------------------------------------------------
-- `mensaje_no_se_reescribe`. Eso no es la moderacion: es que un mensaje
-- enviado no se pueda cambiar por otro despues de que lo lean, que era un
-- agujero abierto desde el 22/09/2026 con un comentario que afirmaba lo
-- contrario. No se pidio y no se retira, igual que no se retira una cerradura
-- porque nadie pidiera la puerta.
--
-- Y `mensaje_baja_propia`, que es de septiembre y no la escribi yo. No
-- funciona --la politica de lectura esconde lo borrado y el borrado se rechaza
-- a si mismo, esta contado en `20261005160000`-- y se queda como estaba: ni
-- habia boton antes ni lo hay ahora.

drop function if exists public.retirar_mensaje(uuid);

drop policy if exists mensaje_moderacion on public.mensaje;

-- La columna se va porque esta **vacia**: se creo hoy para la moderacion y
-- nadie retiro nada --comprobado contando--. Una columna que existe y nadie
-- escribe es la trampa mas repetida de este proyecto: el siguiente que la lea
-- va a creer que hay una pantalla detras.
alter table public.mensaje drop column if exists eliminado_por;

-- ----------------------------------------------------------------------------
-- La administracion deja de ver los canales que no son suyos
-- ----------------------------------------------------------------------------
-- Se copia de `20261005140000` quitando la rama de la administracion. Las
-- otras dos --el huesped en los hilos de area, y D-13-- se quedan igual.

create or replace function public.puede_ver_conversacion_fila(
  p_tipo           public.tipo_conversacion,
  p_area           public.area_conversacion,
  p_ambito         public.ambito_grupo,
  p_unidad_id      uuid,
  p_condominio_id  uuid,
  p_conversacion_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $fn$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      -- El huesped entra aqui mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      -- D-13: la porteria, no todo el personal. La administracion tiene su
      -- propio hilo y no entra en este.
      or (p_area = 'seguridad'      and public.es_guardia_de_condominio(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      -- Y solo los roles del canal. Quien administra entra si su rol esta en
      -- la lista, como cualquiera.
      public.es_del_canal(p_conversacion_id)
    else false
  end;
$fn$;

comment on function public.puede_ver_conversacion_fila is
  'Quien ve una conversacion. Un hilo de area lo ven la vivienda y el area que atiende --la porteria, no la administracion: D-13--. Un canal, los roles que tenga declarados en `canal_rol`, y nadie mas: configurarlo es otra cosa y va por `canales_del_condominio`.';

-- ----------------------------------------------------------------------------
-- Crear un canal, sin depender de verlo
-- ----------------------------------------------------------------------------
-- `guardar_canal` era `security invoker` y hacia `insert ... returning id`.
-- Con la rama de la administracion fuera, esa lectura del `returning` falla
-- --el canal nuevo todavia no incluye su rol-- y el alta se rechaza con «new
-- row violates row-level security policy», aunque el `with check` del insert
-- se cumpla. Es el mismo accidente que ya tuvo `conversacion` en
-- `20260922143000`: una funcion `stable` no ve la fila que el propio INSERT
-- esta escribiendo.
--
-- Pasa a `security definer` con el permiso comprobado dentro, que es el mismo
-- que exigia la politica. Es la tercera vez esta semana que una funcion
-- publica acaba siendo `definer` por tener que hacer algo que la politica no
-- alcanza a ver; esta escrito en AGENTS.md.

create or replace function public.guardar_canal(
  p_condominio_id   uuid,
  p_nombre          text,
  p_roles_unidad    public.rol_unidad[] default '{}',
  p_roles_condominio public.rol_condominio[] default '{}',
  p_conversacion_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid := p_conversacion_id;
begin
  if not public.puede_coadmin(p_condominio_id, 'contestarChat') then
    raise exception 'Solo la administracion del edificio configura sus canales'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_nombre), '') = '' then
    raise exception 'El canal necesita un nombre';
  end if;

  if array_length(p_roles_unidad, 1) is null
     and array_length(p_roles_condominio, 1) is null then
    -- Un canal sin roles no lo ve nadie. Eso no es un canal.
    raise exception 'El canal necesita al menos un rol';
  end if;

  if v_id is null then
    insert into public.conversacion (condominio_id, tipo, nombre, creada_por)
    values (p_condominio_id, 'grupo', btrim(p_nombre), auth.uid())
    returning id into v_id;
  else
    update public.conversacion
    set nombre = btrim(p_nombre)
    where id = v_id and tipo = 'grupo' and condominio_id = p_condominio_id;

    if not found then
      raise exception 'Ese canal no existe o no es de este edificio'
        using errcode = 'insufficient_privilege';
    end if;

    -- Los roles se reemplazan: la pantalla manda la lista entera.
    delete from public.canal_rol where conversacion_id = v_id;
  end if;

  insert into public.canal_rol (conversacion_id, rol_unidad)
  select v_id, unnest(p_roles_unidad)
  where array_length(p_roles_unidad, 1) is not null
  on conflict do nothing;

  insert into public.canal_rol (conversacion_id, rol_condominio)
  select v_id, unnest(p_roles_condominio)
  where array_length(p_roles_condominio, 1) is not null
  on conflict do nothing;

  return v_id;
end;
$fn$;

comment on function public.guardar_canal is
  'Crea o renombra un canal y deja sus roles en lo que diga la lista. `security definer` por necesidad: el `returning` del alta pasa por la politica de lectura, y un canal recien creado todavia no incluye a quien lo crea. Comprueba `puede_coadmin`, que es lo que exigia la politica.';

-- ----------------------------------------------------------------------------
-- Y archivar, por lo mismo
-- ----------------------------------------------------------------------------
-- No hace `returning`, pero su `update ... where id = ...` necesita leer la
-- fila, y la lectura es la que ya no alcanza.

create or replace function public.archivar_canal(
  p_conversacion_id uuid,
  p_archivar        boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_condominio uuid;
begin
  select c.condominio_id into v_condominio
  from public.conversacion c
  where c.id = p_conversacion_id and c.tipo = 'grupo';

  if v_condominio is null then
    raise exception 'Ese canal no existe'
      using errcode = 'no_data_found';
  end if;

  if not public.puede_coadmin(v_condominio, 'contestarChat') then
    raise exception 'Solo la administracion del edificio archiva sus canales'
      using errcode = 'insufficient_privilege';
  end if;

  update public.conversacion
  set archivado_en = case when p_archivar then now() else null end
  where id = p_conversacion_id;

  return p_archivar;
end;
$fn$;

comment on function public.archivar_canal is
  'Retira un canal de la lista sin borrar lo que se dijo en el. `security definer` por lo mismo que `guardar_canal`: la administracion configura canales que no necesariamente lee.';
