-- ----------------------------------------------------------------------------
-- Un reconocimiento al mes, y entre vecinos
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: «reconocimientos uno al mes y solo para
-- residentes».
--
-- Lo que habia, y por que no bastaba:
--
--   · `reconocimiento_unico_por_mes` es unico por
--     `(otorgado_por, usuario_id, insignia_id, mes)`. O sea **una de cada tipo**
--     al mes, a cada persona. Con ocho insignias en el catalogo, una sola
--     persona podia repartir ocho a su vecino el mismo mes y ochenta en el
--     edificio. Un reconocimiento que se puede dar sin limite no reconoce nada.
--   · `es_miembro_condominio` ya excluye al huesped temporal, asi que **quien
--     da** ya tenia que ser residente. Pero **a quien se le da** no se
--     comprobaba en ninguna parte: se podia reconocer a un huesped de cinco
--     noches, o a alguien de otro edificio pasando su uuid.
--
-- ----------------------------------------------------------------------------
-- Por que un disparador y no un indice unico
-- ----------------------------------------------------------------------------
-- Porque en la base ya hay dos casos que no cumplirian la regla nueva, y un
-- indice unico no se puede crear sin borrarlos. Son datos de prueba, pero la
-- regla de este proyecto es que no se borra nada: el disparador deja lo que hay
-- donde esta y aplica de aqui en adelante, que es lo mismo que hace un `check`
-- marcado `not valid`.
--
-- Y de paso puede explicarse, que un indice no sabe hacer.
--
-- Aditiva. El indice viejo se queda: sigue siendo cierto que no se repite la
-- misma insignia a la misma persona en el mes, y es una red mas.

-- 1. Quien puede recibir uno -------------------------------------------------

/*
  Hermana de `es_miembro_condominio`, pero **sobre otra persona**: aquella mira
  `auth.uid()` y aqui hace falta preguntar por el receptor, que es otro.

  No se cambia la que hay para que acepte un parametro: la usan 40 politicas y
  tocarle la firma seria mover el suelo de medio proyecto para un caso.
*/
create or replace function public.es_vecino_del_condominio(
  p_usuario_id uuid,
  p_condominio_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = p_usuario_id
      and mc.activo
  ) or exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = p_usuario_id
      and mu.activo
      -- El huesped temporal no: esta de paso unos dias. El mismo criterio que
      -- `es_miembro_condominio`, y por el mismo motivo.
      and mu.rol <> 'huesped_temporal'
  );
$$;

comment on function public.es_vecino_del_condominio is
  'Si ESA persona pertenece a la comunidad. Es `es_miembro_condominio` preguntando por otro: aquella solo sabe mirar a quien llama.';

revoke all on function public.es_vecino_del_condominio(uuid, uuid) from public;
grant execute on function public.es_vecino_del_condominio(uuid, uuid) to authenticated;

-- 2. Uno al mes, y a alguien de la comunidad ---------------------------------

create or replace function public.reconocimiento_con_medida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_cuantos int;
begin
  if not public.es_vecino_del_condominio(new.usuario_id, new.condominio_id) then
    raise exception
      'Solo se reconoce a quien vive en el edificio. Un huesped temporal esta de paso.';
  end if;

  /*
    Uno al mes. Se cuenta por quien lo da y por edificio: alguien que vive en
    dos condominios participa en los dos, y hacerle elegir uno no tiene sentido.

    `at time zone 'UTC'` igual que el indice que ya existia, y por el mismo
    motivo: `date_trunc` sobre `timestamptz` depende de la zona horaria de la
    sesion, asi que sin anclarlo dos personas en husos distintos contarian
    meses distintos.
  */
  select count(*) into v_cuantos
  from public.reconocimiento r
  where r.otorgado_por = new.otorgado_por
    and r.condominio_id = new.condominio_id
    and date_trunc('month', r.otorgado_en at time zone 'UTC')
        = date_trunc('month', coalesce(new.otorgado_en, now()) at time zone 'UTC')
    and r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_cuantos > 0 then
    raise exception
      'Ya diste tu reconocimiento de este mes. Vuelve el mes que viene: es uno por persona, y por eso vale.';
  end if;

  return new;
end;
$fn$;

comment on function public.reconocimiento_con_medida is
  'Uno al mes y solo a vecinos. Va en disparador y no en un indice unico porque en la base ya hay dos casos que no cumplirian, y aqui no se borra nada.';

drop trigger if exists reconocimiento_con_medida on public.reconocimiento;

create trigger reconocimiento_con_medida
  before insert on public.reconocimiento
  for each row execute function public.reconocimiento_con_medida();
