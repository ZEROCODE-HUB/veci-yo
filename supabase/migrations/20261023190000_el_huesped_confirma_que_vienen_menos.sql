-- El huésped puede confirmar que al final vienen menos.
--
-- QA 23/10/2026 (responsable de producto): «Si se guarda que son 6 personas
-- pero el huésped llena solo 5, se debe poder confirmar que solo son 5 y ya se
-- actualiza el dato». Cambia la decisión del 09/10/2026, cuando el número solo
-- lo cambiaba el anfitrión: `cerrar_precheckin` respondía «Añade a quien
-- falte, o pídele al anfitrión que cambie el número» y el huésped se quedaba
-- atascado.
--
-- Solo hacia abajo y nunca por debajo de los que ya están registrados: el
-- huésped no amplía la reserva (eso sigue siendo del anfitrión). Al anfitrión
-- le llega un aviso con el número nuevo.

create or replace function public.confirmar_cuantos_vienen(p_token text, p_cuantos int)
returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita     public.visita%rowtype;
  v_titular    boolean;
  v_registrados int;
begin
  select v.* into v_visita
  from public.persona_del_enlace(p_token) p
  join public.visita v on v.id = p.visita_id;

  select p.es_titular into v_titular from public.persona_del_enlace(p_token) p;

  if v_visita.id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  if not coalesce(v_titular, false) then
    raise exception 'Solo quien hizo la reserva puede confirmar cuántos vienen';
  end if;
  if v_visita.precheckin_completado_en is not null then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  select count(*) into v_registrados from public.invitado where visita_id = v_visita.id;

  if p_cuantos is null or p_cuantos < v_registrados then
    raise exception 'Ya hay % personas registradas: no pueden venir menos que eso.', v_registrados;
  end if;
  if v_visita.huespedes_previstos is not null and p_cuantos > v_visita.huespedes_previstos then
    raise exception 'Para que vengan más de % personas, pídeselo al anfitrión.', v_visita.huespedes_previstos;
  end if;

  update public.visita
     set huespedes_previstos = p_cuantos,
         menores_previstos = case when menores_previstos is null then null
                                  else least(menores_previstos, greatest(p_cuantos - 1, 0)) end
   where id = v_visita.id;

  if v_visita.huespedes_previstos is distinct from p_cuantos then
    perform public.notificar_unidad(
      v_visita.unidad_id, 'preregistro_incompleto',
      'Vienen menos personas',
      format('Tu huésped confirmó que en la reserva del %s vienen %s persona(s), no %s.',
             to_char(v_visita.fecha_desde, 'DD/MM/YYYY'), p_cuantos, v_visita.huespedes_previstos),
      'visita', v_visita.id, null, true);
  end if;

  return p_cuantos;
end;
$$;

comment on function public.confirmar_cuantos_vienen(text, int) is
  'El titular confirma que vienen menos personas de las reservadas (nunca '
  'menos que las registradas ni más que las reservadas). Avisa al anfitrión.';

revoke all on function public.confirmar_cuantos_vienen(text, int) from public;
grant execute on function public.confirmar_cuantos_vienen(text, int) to anon, authenticated, service_role;
