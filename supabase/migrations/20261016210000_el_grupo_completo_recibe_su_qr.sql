-- ============================================================================
-- Cuando todo el grupo terminó, cada uno recibe su QR por correo
-- ============================================================================
-- La responsable de producto (16/10/2026), en la última pantalla del
-- preregistro: «Cuando el proceso de registro de todo tu grupo esté completo,
-- recibirás confirmación de aprobación de ingreso a tu correo electrónico con
-- un QR para agilizar tu registro físico a tu llegada».
--
-- Ese correo no existía. Una pantalla que promete un correo que nadie manda es
-- el defecto más caro de este proyecto, así que se construye:
--
--   · «Aprobado» es: el preregistro cerrado, ninguna consulta de antecedentes
--     pendiente, nadie esperando la decisión del anfitrión y nadie rechazado.
--   · Se comprueba cada vez que cambia una de esas cosas (tres disparadores) y
--     se manda UNA vez por estancia (`visita.ingreso_aprobado_avisado_en`).
--   · Va a cada adulto con correo. El QR es el código de la estancia
--     (`codigo_acceso`), que la web pinta en `/qr/<codigo>`. No es una llave:
--     la portería lo busca con su sesión y RLS manda.
--   · Si faltan los secretos del Vault no se manda y no se rompe nada: queda
--     sin marcar y se reintenta en el siguiente cambio.
--
-- Solo aditiva.

alter table public.visita
  add column if not exists ingreso_aprobado_avisado_en timestamptz;

comment on column public.visita.ingreso_aprobado_avisado_en is
  'Cuando se mando a cada adulto el correo de ingreso aprobado con su QR (16/10/2026). Nula: todavia no.';


create or replace function public.estancia_aprobada(p_visita_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.precheckin_completado_en is not null
     and v.estado <> 'cancelada'
     -- Cada adulto con su consulta hecha: al cerrar se encolan, y sin esto la
     -- estancia salía «aprobada» en el instante entre cerrar y encolarlas.
     and not exists (
       select 1 from public.invitado i
       where i.visita_id = v.id and not i.es_menor
         and not exists (
           select 1 from public.verificacion_antecedentes va where va.invitado_id = i.id
         )
     )
     and not exists (
       select 1 from public.invitado i
       where i.visita_id = v.id
         and (
           i.revision_anfitrion = 'rechazada'
           or (public.requiere_revision_manual(i.id) and i.revision_anfitrion is null)
           or exists (
             select 1 from public.verificacion_antecedentes va
             where va.invitado_id = i.id and va.resultado = 'pendiente'
           )
         )
     )
  from public.visita v
  where v.id = p_visita_id;
$$;

comment on function public.estancia_aprobada(uuid) is
  'Preregistro cerrado, sin consultas pendientes, sin revisiones por decidir y sin rechazos.';

revoke all on function public.estancia_aprobada(uuid) from public;
grant execute on function public.estancia_aprobada(uuid) to authenticated, service_role;


create or replace function public.avisar_ingreso_aprobado(p_visita_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp, vault, extensions
as $$
declare
  v        record;
  v_url    text;
  v_clave  text;
  v_base   text;
  v_codigo text;
  p        record;
  v_n      int := 0;
begin
  select vi.id, vi.codigo_acceso, vi.ingreso_aprobado_avisado_en, vi.tipo, c.nombre as condominio
    into v
  from public.visita vi join public.condominio c on c.id = vi.condominio_id
  where vi.id = p_visita_id;

  if v.id is null or v.tipo <> 'huesped_temporal' or v.ingreso_aprobado_avisado_en is not null then
    return 0;
  end if;
  if not public.estancia_aprobada(p_visita_id) then
    return 0;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
  if v_url is null or v_clave is null then
    return 0;
  end if;
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'veciyo_url_web'),
    'https://veciyo-web-seven.vercel.app'
  ) into v_base;

  v_codigo := v.codigo_acceso;
  if v_codigo is null then
    v_codigo := upper(encode(gen_random_bytes(6), 'hex'));
    update public.visita set codigo_acceso = v_codigo where id = p_visita_id;
  end if;

  for p in
    select i.nombre, i.correo from public.invitado i
    where i.visita_id = p_visita_id and not i.es_menor
      and coalesce(btrim(i.correo), '') <> ''
      -- Los dominios de prueba no: las pruebas cierran preregistros a diario.
      and i.correo !~* '(\.(test|example|invalid)$|@ejemplo\.)'
  loop
    perform net.http_post(
      url     := v_url || '/functions/v1/enviar-correo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_clave
      ),
      body    := jsonb_build_object(
        'tipo',       'ingreso-aprobado',
        'correo',     p.correo,
        'nombre',     p.nombre,
        'enlace',     v_base || '/qr/' || v_codigo,
        'condominio', v.condominio
      )
    );
    v_n := v_n + 1;
  end loop;

  update public.visita set ingreso_aprobado_avisado_en = now() where id = p_visita_id;
  return v_n;
end;
$$;

comment on function public.avisar_ingreso_aprobado(uuid) is
  'Si la estancia quedo aprobada y no se aviso todavia, manda a cada adulto el correo con su QR. Una vez.';

revoke all on function public.avisar_ingreso_aprobado(uuid) from public;
grant execute on function public.avisar_ingreso_aprobado(uuid) to service_role;


-- Los tres momentos en que puede quedar aprobada.

create or replace function public.al_cambiar_algo_de_la_aprobacion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visita uuid;
begin
  if tg_table_name = 'visita' then
    v_visita := new.id;
  elsif tg_table_name = 'invitado' then
    v_visita := new.visita_id;
  else
    select i.visita_id into v_visita from public.invitado i where i.id = new.invitado_id;
  end if;

  if v_visita is not null then
    begin
      perform public.avisar_ingreso_aprobado(v_visita);
    exception when others then
      -- Un correo que no sale no puede tumbar lo que lo disparó.
      raise warning 'avisar_ingreso_aprobado(%): %', v_visita, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

/*
  Diferidos, al final de la transacción: `cerrar_precheckin` pone la fecha de
  cierre y encola las consultas en la misma llamada, y un disparador inmediato
  miraría la estancia a medio cerrar.
*/
drop trigger if exists aprobacion_al_cerrar on public.visita;
create constraint trigger aprobacion_al_cerrar
  after update of precheckin_completado_en on public.visita
  deferrable initially deferred
  for each row when (new.precheckin_completado_en is not null)
  execute function public.al_cambiar_algo_de_la_aprobacion();

drop trigger if exists aprobacion_al_decidir on public.invitado;
create constraint trigger aprobacion_al_decidir
  after update of revision_anfitrion on public.invitado
  deferrable initially deferred
  for each row execute function public.al_cambiar_algo_de_la_aprobacion();

drop trigger if exists aprobacion_al_verificar on public.verificacion_antecedentes;
create constraint trigger aprobacion_al_verificar
  after insert or update of resultado on public.verificacion_antecedentes
  deferrable initially deferred
  for each row execute function public.al_cambiar_algo_de_la_aprobacion();
