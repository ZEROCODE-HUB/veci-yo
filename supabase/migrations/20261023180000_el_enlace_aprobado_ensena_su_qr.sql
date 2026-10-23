-- Con el ingreso aprobado, el enlace del preregistro enseña el QR.
--
-- QA 23/10/2026 (responsable de producto): «Cuando todos estén sin hallazgos
-- recién confirmar que ya fueron aprobados, y ahí mismo le muestra el QR y el
-- resumen de la reserva». El QR ya iba por correo (`avisar_ingreso_aprobado`);
-- esto lo deja ver también al volver a abrir el enlace.
--
-- Solo con la estancia aprobada (`estancia_aprobada`), y solo a quien tiene un
-- enlace vigente de esa reserva: es el mismo código que ya le llegó por correo.

create or replace function public.qr_del_precheckin(p_token text)
returns text
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_codigo text;
begin
  select p.visita_id into v_visita from public.persona_del_enlace(p_token) p;
  if v_visita is null then
    return null;
  end if;
  if not public.estancia_aprobada(v_visita) then
    return null;
  end if;
  select codigo_acceso into v_codigo from public.visita where id = v_visita;
  return v_codigo;
end;
$$;

comment on function public.qr_del_precheckin(text) is
  'El código del QR de ingreso, si la estancia del enlace ya está aprobada; '
  'si no, null.';

revoke all on function public.qr_del_precheckin(text) from public;
grant execute on function public.qr_del_precheckin(text) to anon, authenticated, service_role;
