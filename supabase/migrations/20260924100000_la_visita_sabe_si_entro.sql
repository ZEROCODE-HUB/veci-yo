-- ----------------------------------------------------------------------------
-- La visita sabe si el invitado entro
-- ----------------------------------------------------------------------------
-- `visita.estado` es el ciclo de presencia --`programada`, `ingresada`,
-- `finalizada`, `cancelada`-- y **nadie lo movia**. La porteria marca la
-- llegada sobre `invitado`, y la visita se quedaba en `programada` para
-- siempre: el guardia registraba la entrada, registraba la salida, y la
-- etiqueta seguia diciendo lo mismo.
--
-- `visita.ingreso_en` y `visita.salida_en` existian desde el primer dia y
-- tampoco los escribia nadie, asi que la hora real de la visita solo vivia
-- repartida entre sus invitados.
--
-- Es el defecto de siempre: la decision --¿esta dentro?-- vivia en la pantalla
-- y no en el dato. Se resuelve donde corresponde, en un disparador, porque si
-- se resolviera en el cliente cada pantalla tendria que acordarse de hacerlo y
-- una acabaria olvidandose.

create or replace function public.sincronizar_estado_visita()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita     uuid;
  v_total      int;
  v_dentro     int;
  v_fuera      int;
  v_primera    timestamptz;
  v_ultima     timestamptz;
  v_estado     public.estado_visita;
begin
  v_visita := coalesce(new.visita_id, old.visita_id);
  if v_visita is null then
    return coalesce(new, old);
  end if;

  select count(*),
         count(*) filter (where i.llego or i.ingreso_en is not null),
         count(*) filter (where i.salida_en is not null),
         min(i.ingreso_en),
         max(i.salida_en)
    into v_total, v_dentro, v_fuera, v_primera, v_ultima
  from public.invitado i
  where i.visita_id = v_visita;

  -- Una visita cancelada no vuelve sola: cancelarla es una decision de alguien,
  -- y que un invitado marque su llegada no la deshace.
  if (select v.estado from public.visita v where v.id = v_visita) = 'cancelada' then
    return coalesce(new, old);
  end if;

  if v_total > 0 and v_fuera = v_total then
    v_estado := 'finalizada';
  elsif v_dentro > 0 then
    v_estado := 'ingresada';
  else
    -- Se puede volver atras: si el guardia desmarca una llegada que apunto por
    -- error, la visita vuelve a estar programada en vez de quedarse mintiendo.
    v_estado := 'programada';
  end if;

  update public.visita v
     set estado     = v_estado,
         ingreso_en = case when v_dentro > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end,
         salida_en  = case when v_total > 0 and v_fuera = v_total then v_ultima else null end,
         updated_at = now()
   where v.id = v_visita
     and (v.estado is distinct from v_estado
          or v.ingreso_en is distinct from (case when v_dentro > 0 then coalesce(v_primera, v.ingreso_en, now()) else null end)
          or v.salida_en is distinct from (case when v_total > 0 and v_fuera = v_total then v_ultima else null end));

  return coalesce(new, old);
end;
$$;

comment on function public.sincronizar_estado_visita() is
  'Mantiene `visita.estado`, `ingreso_en` y `salida_en` a partir de sus invitados. Sin esto la visita se quedaba en `programada` aunque la porteria hubiera registrado la entrada y la salida.';

drop trigger if exists sincronizar_estado_visita on public.invitado;

create trigger sincronizar_estado_visita
after insert or update of llego, ingreso_en, salida_en or delete
on public.invitado
for each row
execute function public.sincronizar_estado_visita();


-- Las visitas que ya tenian invitados dentro o fuera arrastraban el estado mal
-- desde que se crearon. Se recalculan una vez.
update public.visita v
   set estado = sub.estado,
       ingreso_en = sub.ingreso_en,
       salida_en = sub.salida_en,
       updated_at = now()
from (
  select i.visita_id,
         case
           when count(*) filter (where i.salida_en is not null) = count(*) then 'finalizada'::public.estado_visita
           when count(*) filter (where i.llego or i.ingreso_en is not null) > 0 then 'ingresada'::public.estado_visita
           else 'programada'::public.estado_visita
         end as estado,
         case when count(*) filter (where i.llego or i.ingreso_en is not null) > 0
              then min(i.ingreso_en) else null end as ingreso_en,
         case when count(*) filter (where i.salida_en is not null) = count(*)
              then max(i.salida_en) else null end as salida_en
  from public.invitado i
  group by i.visita_id
) sub
where sub.visita_id = v.id
  and v.estado <> 'cancelada'
  and (v.estado is distinct from sub.estado
       or v.ingreso_en is distinct from sub.ingreso_en
       or v.salida_en is distinct from sub.salida_en);
