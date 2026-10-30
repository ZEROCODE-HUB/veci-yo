-- Información de la constructora y los correos de una PQRS (30/10/2026).
--
-- Pedidos del cliente:
--   · Para Claude 193: en Arquitectura, debajo de «Información de
--     Condominio», una sección «Información de Constructora», toda opcional:
--     nombre, año de entrega, hasta cuándo dura la garantía (año y mes),
--     responsable de postventa, correo de reclamaciones de postventa y un
--     teléfono de respaldo.
--   · Para Claude 194: la categoría «Constructora» de una PQRS solo se ofrece
--     si el edificio tiene ese correo de postventa. Eso lo decide la pantalla,
--     que lee esta columna.
--   · Para Claude 195: al registrar una PQRS sale un correo. A quien la
--     registró, una copia si tiene correo en su cuenta; y si es de la
--     constructora, además al correo de postventa. Si no hay correo, la PQRS
--     se guarda igual y no se intenta nada.
--
-- El correo lo manda la base al guardar la PQRS --como el del ingreso
-- aprobado--, no la pantalla: así el destinatario de postventa sale del
-- edificio y nadie puede pedir que se mande a otra dirección. Solo aditiva.

alter table public.condominio
  add column if not exists constructora_nombre text,
  add column if not exists constructora_anio_entrega integer,
  add column if not exists constructora_garantia_hasta date,
  add column if not exists constructora_postventa_responsable text,
  add column if not exists constructora_postventa_correo text,
  add column if not exists constructora_telefono text,
  add column if not exists constructora_codigo_pais text;

comment on column public.condominio.constructora_nombre is 'Nombre de la constructora del edificio (30/10/2026).';
comment on column public.condominio.constructora_anio_entrega is 'Año en que la constructora entregó el edificio.';
comment on column public.condominio.constructora_garantia_hasta is 'Hasta cuándo dura la garantía de la constructora. Se pide año y mes; se guarda el día 1 de ese mes.';
comment on column public.condominio.constructora_postventa_responsable is 'Quién atiende la postventa en la constructora.';
comment on column public.condominio.constructora_postventa_correo is 'Correo de reclamaciones de postventa. Si está, las PQRS ofrecen la categoría «Constructora» y se le manda cada una.';
comment on column public.condominio.constructora_telefono is 'Teléfono de respaldo de la constructora, solo dígitos.';
comment on column public.condominio.constructora_codigo_pais is 'País del teléfono de la constructora (ISO 3166-1 alfa-2).';

do $$ begin
  alter table public.condominio
    add constraint constructora_correo_valido check (
      constructora_postventa_correo is null
      or constructora_postventa_correo ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]{2,}$'
    );
exception when duplicate_object then null; end $$;

create or replace function public.correo_de_pqrs_registrada()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp', 'auth'
as $function$
declare
  v_url text;
  v_clave text;
  v_autor_correo text;
  v_autor_nombre text;
  v_edificio text;
  v_postventa text;
  v_constructora text;
  v_dominios text;
  v_cuerpo jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
  if v_url is null or v_clave is null then
    return null;
  end if;

  select u.email into v_autor_correo from auth.users u where u.id = new.creado_por;
  select nullif(btrim(coalesce(p.nombre, '')), '') into v_autor_nombre from public.perfil p where p.id = new.creado_por;
  select c.nombre, nullif(btrim(c.constructora_postventa_correo), ''), c.constructora_nombre
    into v_edificio, v_postventa, v_constructora
  from public.condominio c where c.id = new.condominio_id;

  v_cuerpo := jsonb_build_object(
    'condominio', v_edificio,
    'numero', new.numero,
    'titulo', new.titulo,
    'descripcion', new.descripcion,
    'deParte', coalesce(new.creado_por_nombre, v_autor_nombre)
  );

  -- La copia a quien la registró, si tiene correo.
  if nullif(btrim(coalesce(v_autor_correo, '')), '') is not null then
    perform net.http_post(
      url     := v_url || '/functions/v1/enviar-correo',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_clave),
      body    := v_cuerpo || jsonb_build_object(
        'tipo', 'pqrs-registrada', 'correo', v_autor_correo, 'nombre', v_autor_nombre,
        'constructora', case when new.area = 'constructora' then coalesce(v_constructora, 'la constructora') end
      )
    );
  end if;

  -- Y a postventa, si es de la constructora.
  if new.area = 'constructora' and v_postventa is not null then
    perform net.http_post(
      url     := v_url || '/functions/v1/enviar-correo',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_clave),
      body    := v_cuerpo || jsonb_build_object(
        'tipo', 'pqrs-constructora', 'correo', v_postventa, 'nombre', v_constructora,
        'correoContacto', coalesce(new.correo_contacto, v_autor_correo),
        'telefonoContacto', new.telefono_contacto
      )
    );
  end if;
  return null;
exception when others then
  -- Un correo que no sale no impide guardar la PQRS.
  return null;
end;
$function$;

drop trigger if exists reclamo_manda_correo on public.reclamo;
create trigger reclamo_manda_correo
  after insert on public.reclamo
  for each row execute function public.correo_de_pqrs_registrada();
