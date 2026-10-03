-- ----------------------------------------------------------------------------
-- El cron que manda los recordatorios
-- ----------------------------------------------------------------------------
-- La segunda mitad de `20261003210000`. Alli esta **a quien** hay que avisar;
-- aqui, quien lo manda y cuando corre.
--
-- `pg_cron` y `pg_net` se instalan aqui: no habia ninguna tarea periodica en
-- todo el proyecto, asi que esta es la primera vez que hacen falta.
--
-- ----------------------------------------------------------------------------
-- Por que `pg_net` y no una funcion de servidor programada
-- ----------------------------------------------------------------------------
-- Porque quien sabe a quien avisar es la base, y el correo sale de una funcion
-- de servidor. Alguien tiene que cruzar esa frontera. Hacerlo al reves --una
-- funcion de servidor que consulta la base cada hora-- añadiria un segundo
-- programador y dejaria la regla repartida en dos sitios.
--
-- `pg_net` es asincrono a proposito: `net.http_post` encola y devuelve un id,
-- no espera la respuesta. Eso significa que **la constancia se escribe antes de
-- saber si el correo llego**, y es deliberado: si se esperase, un servidor de
-- correo lento bloquearia la transaccion del cron y el resto de avisos de esa
-- pasada no saldrian. Vale mas no repetir un aviso que repetirlos todos.
--
-- Las credenciales salen del Vault, nunca escritas aqui.
--
-- Aditiva.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------

create or replace function public.enviar_recordatorios_precheckin()
returns int
language plpgsql
security definer
set search_path = public, pg_temp, extensions
as $fn$
declare
  v_url     text;
  v_clave   text;
  v_base    text;
  v_fila    record;
  v_token   text;
  v_enlace  text;
  v_tipo    text;
  v_mandados int := 0;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    raise exception 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault';
  end if;

  /*
    De donde sale el dominio de los enlaces del huesped. Es el mismo que arma
    `abrirPrecheckin` en la aplicacion, y tiene que coincidir: dos dominios para
    la misma cosa es como ya se rompio una vez el enlace del acompañante.
  */
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'veciyo_url_web'),
    'https://veciyo-web-seven.vercel.app'
  ) into v_base;

  for v_fila in select * from public.precheckins_por_recordar() loop
    begin
      if v_fila.destinatario = 'huesped' then
        /*
          Un enlace **nuevo**. El anterior no se puede recuperar --en la base
          vive solo su sha256-- asi que un recordatorio sin enlace no le sirve
          de nada a quien lo recibe. El viejo deja de valer, y por eso el
          anfitrion puede apagar este aviso.
        */
        v_token := encode(extensions.gen_random_bytes(32), 'hex');

        update public.visita
        set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
        where id = v_fila.visita_id;

        v_enlace := v_base || '/access/' || v_token;
        v_tipo := 'recordatorio-huesped';
      else
        -- Al anfitrion no se le manda el enlace de nadie: lo que necesita es
        -- saber a quien le falta, y eso va en el cuerpo del correo.
        v_enlace := v_base;
        v_tipo := 'recordatorio-anfitrion';
      end if;

      perform net.http_post(
        url     := v_url || '/functions/v1/enviar-correo',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_clave
        ),
        body    := jsonb_build_object(
          'tipo',       v_tipo,
          'correo',     v_fila.correo,
          'nombre',     v_fila.nombre,
          'enlace',     v_enlace,
          'condominio', v_fila.condominio,
          'deParte',    v_fila.nombre_huesped,
          'diasAntes',  v_fila.dias_antes
        )
      );

      insert into public.recordatorio_precheckin
        (visita_id, dias_antes, destinatario, correo)
      values
        (v_fila.visita_id, v_fila.dias_antes, v_fila.destinatario, v_fila.correo);

      v_mandados := v_mandados + 1;

    exception when others then
      /*
        Un aviso que falla no tumba los demas, y **deja constancia de que
        fallo**: sin la fila, la pasada siguiente lo reintentaria, y con un
        correo mal escrito eso es un bucle de una vez por dia hasta la llegada.
      */
      insert into public.recordatorio_precheckin
        (visita_id, dias_antes, destinatario, correo, error)
      values
        (v_fila.visita_id, v_fila.dias_antes, v_fila.destinatario, v_fila.correo, sqlerrm)
      on conflict (visita_id, dias_antes, destinatario) do nothing;
    end;
  end loop;

  return v_mandados;
end;
$fn$;

comment on function public.enviar_recordatorios_precheckin is
  'Manda los recordatorios que toquen hoy y deja constancia de cada uno. Lo llama pg_cron; tambien se puede llamar a mano para una pasada suelta.';

revoke all on function public.enviar_recordatorios_precheckin() from public;

-- ----------------------------------------------------------------------------
-- Cuando corre
-- ----------------------------------------------------------------------------
/*
  Una vez al dia, a las 14:00 UTC --las 9 de la mañana en Colombia--. A esa hora
  un correo se lee; a las tres de la madrugada se entierra bajo los de la
  mañana.

  Y una sola vez: los hitos son dias enteros, asi que correr mas a menudo no
  adelantaria ningun aviso, solo multiplicaria las oportunidades de mandar algo
  dos veces.

  `cron.unschedule` primero para que este archivo se pueda volver a aplicar.
  Falla si no existe, de ahi el bloque.
*/
do $$
begin
  perform cron.unschedule('recordatorios-precheckin');
exception when others then
  null;
end $$;

select cron.schedule(
  'recordatorios-precheckin',
  '0 14 * * *',
  $cron$ select public.enviar_recordatorios_precheckin(); $cron$
);
