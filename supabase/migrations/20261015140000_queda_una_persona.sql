-- «Queda 1 persona», no «Quedan 1 persona» (15/10/2026).
--
-- El aviso de salida parcial al anfitrión decía «Quedan 1 persona dentro.».
-- Se vio en el recorrido de la portería. Solo cambia el texto.

CREATE OR REPLACE FUNCTION public.avisar_salida_de_huesped()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v       public.visita%rowtype;
  dentro  int;
begin
  if new.salida_en is null or old.salida_en is not null then
    return new;
  end if;
  select * into v from public.visita where id = new.visita_id;
  if v.tipo <> 'huesped_temporal' then
    return new;
  end if;

  select count(*) into dentro
  from public.invitado i
  where i.visita_id = v.id and i.llego and i.salida_en is null;

  if dentro > 0 then
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida_parcial',
      'Salió alguien de tu estancia',
      new.nombre || ' salió del edificio. ' ||
        case when dentro = 1 then 'Queda 1 persona dentro.'
             else 'Quedan ' || dentro || ' personas dentro.' end,
      'visita', v.id
    );
  else
    perform public.notificar_anfitrion(
      v.unidad_id, 'huesped_salida',
      'Salieron todos: estancia completa',
      new.nombre || ' salió del edificio, el último de la estancia.',
      'visita', v.id
    );
  end if;
  return new;
end;
$function$;
