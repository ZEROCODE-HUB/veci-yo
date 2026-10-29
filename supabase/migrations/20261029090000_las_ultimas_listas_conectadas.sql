-- Las últimas listas conectadas (29/10/2026).
--
-- Quedaban escritas en la app: el país por defecto, los oficios de un
-- profesional, las empresas de mensajería, las franjas de los turnos, los
-- campos obligatorios del preregistro y los tipos de archivo que se aceptan.
-- Las pantallas ya las leen de la base, así que aquí:
--
--   · se marcan como conectadas (salen en Panel › Más › Listas);
--   · cada una declara qué datos propios se cambian desde el panel;
--   · y la base sujeta lo que la pantalla no podría: un país que no existe,
--     un oficio sin tipo válido, una franja sin horas, un tipo de archivo que
--     el depósito no acepta.
--
-- Las nacionalidades NO se conectan, a propósito: el cliente pidió que en el
-- preregistro estén todas, y la web ofrece las 245 del mundo. La lista de la
-- base tiene 197; conectarla quitaría opciones. Solo aditiva: no se borra nada.

-- 1. El país por defecto tiene que ser un país.
create or replace function public.pais_por_defecto_existe()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.clave = 'pais_por_defecto' then
    new.valor := upper(btrim(new.valor));
    if not exists (select 1 from public.pais where codigo = new.valor) then
      raise exception 'No existe el país «%». Usa el código de dos letras (CO, PE…)', new.valor;
    end if;
  end if;
  return new;
end;
$$;
comment on function public.pais_por_defecto_existe() is
  'El ajuste pais_por_defecto solo acepta un código de la tabla pais: es el que viene elegido en los formularios.';
drop trigger if exists configuracion_plataforma_pais_existe on public.configuracion_plataforma;
create trigger configuracion_plataforma_pais_existe before insert or update of valor on public.configuracion_plataforma
  for each row execute function public.pais_por_defecto_existe();

update public.configuracion_plataforma
   set descripcion = 'País que viene elegido por defecto en los formularios: el prefijo del teléfono, el país de un contacto y el alta de un edificio. Código de dos letras de la tabla pais (CO, PE…). La app lo lee al abrirse.'
 where clave = 'pais_por_defecto';

-- 2. Lo que cada lista deja cambiar desde el panel.
update public.catalogo_info set conectada = true,
  descripcion = 'Al registrar a un profesional permanente o temporal. «Para» dice a cuál se ofrece: permanente, temporal, o vacío para los dos. Se guarda el nombre, así que renombrar no cambia las visitas ya registradas. Las que terminan en «otros» abren el campo para escribir la profesión.',
  campos_extra = '[{"tipo": "texto", "clave": "tipo", "etiqueta": "Para (permanente, temporal o vacío = los dos)"}]'
 where catalogo = 'oficios_de_profesionales';

update public.catalogo_info set conectada = true,
  descripcion = 'Al registrar un paquete en portería. «Otro» abre el campo para escribir la empresa; lo que se guarda es el nombre.'
 where catalogo = 'empresas_de_mensajeria';

update public.catalogo_info set conectada = true,
  descripcion = 'Seguridad › filtros y horario de un guardia. Las «a» (00:00 a 06:00…) son las franjas que se eligen; Mañana, Tarde y Noche son los nombres del filtro de turnos. El que cruza medianoche es «el resto». Una franja que acaba a las 00:00 acaba a medianoche.',
  campos_extra = '[{"tipo": "hora", "clave": "desde", "etiqueta": "Desde"}, {"tipo": "hora", "clave": "hasta", "etiqueta": "Hasta"}]'
 where catalogo = 'turnos_franjas';

update public.catalogo_info set conectada = true,
  descripcion = 'Qué datos tiene que llenar en el preregistro quien reserva y cada acompañante. La etiqueta es lo que dice el aviso «Falta …». Lo mal escrito se rechaza siempre, aunque el campo no sea obligatorio. Cuidado: el reporte al ministerio (TRA) pide casi todos.'
 where catalogo = 'campos_obligatorios_preregistro';

update public.catalogo_info set conectada = true,
  descripcion = 'Qué tipos de archivo se aceptan en cada sitio, y cómo se dicen en pantalla. El tamaño máximo es el ajuste archivo_tamano_maximo_mb. No se puede poner un tipo que el depósito de ese sitio no acepte, ni apagar un sitio.',
  campos_extra = '[{"tipo": "lista", "clave": "tipos_mime", "etiqueta": "Tipos aceptados (image/jpeg, application/pdf…)"}, {"tipo": "texto", "clave": "extensiones", "etiqueta": "Cómo se dice en pantalla"}]'
 where catalogo = 'archivo_formatos';

-- Las franjas con las mismas dos claves que los nombres de turno, para que
-- el panel cambie sus horas. Se añaden; las de antes se quedan.
update public.catalogo_opcion
   set extra = extra || jsonb_build_object(
         'desde', extra->>'hora_inicio',
         'hasta', case when extra->>'hora_fin' = '24:00' then '00:00' else extra->>'hora_fin' end)
 where catalogo = 'turnos_franjas' and extra->>'grupo' = 'franja_filtro' and not (extra ? 'desde');

-- Los formatos que no decían cómo se nombran.
update public.catalogo_opcion set extra = extra || '{"extensiones": "JPG, PNG o WEBP"}'
 where catalogo = 'archivo_formatos' and codigo = 'documento_huesped' and not (extra ? 'extensiones');
update public.catalogo_opcion set extra = extra || '{"extensiones": "JPG, PNG, WEBP o PDF"}'
 where catalogo = 'archivo_formatos' and codigo = 'autorizacion_menor' and not (extra ? 'extensiones');

-- 3. Lo que la base sujeta de estas listas.
create or replace function public.opcion_de_lista_valida()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tipo text;
  v_permitidos jsonb;
begin
  if new.catalogo = 'oficios_de_profesionales' then
    v_tipo := nullif(btrim(coalesce(new.extra->>'tipo', '')), '');
    if v_tipo is not null and v_tipo not in ('permanente', 'temporal') then
      raise exception '«Para» tiene que ser permanente, temporal o quedar vacío';
    end if;
  elsif new.catalogo = 'turnos_franjas' then
    if coalesce(new.extra->>'desde', new.extra->>'hora_inicio') is null
       or coalesce(new.extra->>'hasta', new.extra->>'hora_fin') is null then
      raise exception 'Una franja necesita su hora de inicio y de fin';
    end if;
    if new.extra->>'desde' = new.extra->>'hasta' then
      raise exception 'Una franja no puede empezar y acabar a la misma hora';
    end if;
  elsif new.catalogo = 'archivo_formatos' then
    if not new.activo then
      raise exception 'Un sitio de subida no se apaga: cambia sus tipos';
    end if;
    if coalesce(jsonb_typeof(new.extra->'tipos_mime'), '') <> 'array'
       or jsonb_array_length(new.extra->'tipos_mime') = 0 then
      raise exception 'Tiene que aceptar al menos un tipo de archivo';
    end if;
    v_permitidos := new.extra->'bucket_tipos_mime';
    if jsonb_typeof(v_permitidos) = 'array' and exists (
         select 1 from jsonb_array_elements_text(new.extra->'tipos_mime') t
         where not v_permitidos ? t) then
      raise exception 'El depósito de este sitio solo acepta: %',
        (select string_agg(x, ', ') from jsonb_array_elements_text(v_permitidos) x);
    end if;
  end if;
  return new;
end;
$$;
comment on function public.opcion_de_lista_valida() is
  'Sujeta lo que el panel puede cambiar en oficios (tipo), franjas de turno (horas) y formatos de archivo (dentro de lo que acepta el depósito, sin apagar un sitio).';
drop trigger if exists catalogo_opcion_valida on public.catalogo_opcion;
create trigger catalogo_opcion_valida before insert or update on public.catalogo_opcion
  for each row execute function public.opcion_de_lista_valida();

-- 4. Para las funciones del servidor que reciben un archivo del preregistro.
create or replace function public.formato_de_archivo(p_sitio text)
returns jsonb
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object('tipos_mime', extra->'tipos_mime', 'extensiones', extra->>'extensiones')
    from public.catalogo_opcion
   where catalogo = 'archivo_formatos' and codigo = p_sitio;
$$;
comment on function public.formato_de_archivo(text) is
  'Los tipos de archivo que acepta un sitio (lista archivo_formatos) y cómo se dicen. Lo leen las funciones de subida del preregistro.';
