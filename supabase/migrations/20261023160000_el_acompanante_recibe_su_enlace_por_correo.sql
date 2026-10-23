-- El acompañante recibe su enlace por correo.
--
-- QA 23/10/2026: «Revisar si le llega a los acompañantes el correo de llenado
-- directamente». No le llegaba: `abrir_precheckin_acompanante` solo devolvía el
-- enlace para que el titular lo copiara, y la plantilla `acceso-acompanante`
-- de `enviar-correo` existía sin que nadie la usara. Ahora, si la persona
-- tiene correo, se le envía al emitir su enlace, igual que el recordatorio
-- (`enviar_recordatorios_precheckin`): por `pg_net`, con la clave de servicio
-- del Vault, sin esperar respuesta.
--
-- Si faltan los secretos o el envío falla, el enlace se devuelve igual: el
-- titular lo puede copiar como antes.

create or replace function public.abrir_precheckin_acompanante(p_token text, p_acompanante_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_url    text;
  v_clave  text;
  v_web    text;
  v_dato   record;
begin
  select id into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  /*
    Que el acompañante sea **de esta reserva**. Sin esto, quien tenga un enlace
    valido podria emitir credenciales sobre invitados de otra estancia pasando
    cualquier uuid.
  */
  if not exists (
    select 1 from public.invitado
    where id = p_acompanante_id and visita_id = v_visita and not es_titular
  ) then
    raise exception 'Esa persona no esta en esta reserva';
  end if;

  update public.invitado
     set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
         auto_registro = true
   where id = p_acompanante_id;

  -- El correo, si tiene. Un fallo aquí no le quita el enlace al titular.
  begin
    select i.correo, i.nombre, c.nombre as condominio,
           coalesce(nullif(btrim(concat_ws(' ', t.nombre, t.apellidos)), ''), null) as titular
      into v_dato
      from public.invitado i
      join public.visita v on v.id = i.visita_id
      join public.condominio c on c.id = v.condominio_id
      left join public.invitado t on t.visita_id = v.id and t.es_titular
     where i.id = p_acompanante_id;

    if nullif(btrim(coalesce(v_dato.correo, '')), '') is not null then
      select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
      select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
      -- La misma web y el mismo respaldo que el recordatorio.
      select coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'veciyo_url_web'),
        'https://veciyo-web-seven.vercel.app'
      ) into v_web;
      if v_url is not null and v_clave is not null and v_web is not null then
        perform net.http_post(
          url     := v_url || '/functions/v1/enviar-correo',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_clave
          ),
          body    := jsonb_build_object(
            'tipo',       'acceso-acompanante',
            'correo',     btrim(v_dato.correo),
            -- «Acompañante 2» es el nombre de relleno: mejor «Hola,» a secas.
            'nombre',     case when v_dato.nombre ~* '^acompa' then null else v_dato.nombre end,
            'enlace',     rtrim(v_web, '/') || '/access/acompanante/' || v_token,
            'condominio', v_dato.condominio,
            'deParte',    v_dato.titular
          )
        );
      end if;
    end if;
  exception when others then
    null;
  end;

  return v_token;
end;
$$;

comment on function public.abrir_precheckin_acompanante(text, uuid) is
  'Emite el enlace propio de un acompañante (anula el anterior) y, si tiene '
  'correo, se lo envía con la plantilla acceso-acompanante.';
