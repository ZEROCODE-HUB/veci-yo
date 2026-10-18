-- Los tipos con que se describe un parámetro (18/10/2026).
--
-- Aditiva: solo tipos nuevos. Van en su propio archivo, aparte de la migración
-- que los usa, como todos los enums de este proyecto.

do $$ begin
  create type public.tipo_parametro as enum (
    'entero', 'decimal', 'dias', 'horas', 'minutos', 'segundos', 'megabytes',
    'hora_del_dia', 'texto', 'booleano', 'lista'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ambito_parametro as enum ('plataforma', 'edificio', 'pais');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.riesgo_parametro as enum ('bajo', 'medio', 'alto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.categoria_parametro as enum (
    'cuentas', 'preregistro', 'antecedentes', 'cuotas', 'zonas', 'renta_corta',
    'porteria', 'archivos', 'tareas', 'avisos', 'edificio', 'integraciones',
    'calendario', 'soporte'
  );
exception when duplicate_object then null; end $$;

comment on type public.tipo_parametro is
  'Qué clase de valor guarda un parámetro. Decide cómo se valida: los de tiempo y "entero" '
  'tienen que ser números enteros; "megabytes" y "decimal" admiten decimales; "hora_del_dia" '
  'es HH:MM; "booleano" es true/false; "lista" es un arreglo JSON.';
comment on type public.ambito_parametro is
  'Hasta dónde llega un parámetro: "plataforma" vale igual para todos los edificios; '
  '"edificio" tiene un valor general que cada edificio puede reemplazar; "pais" depende del país.';
comment on type public.riesgo_parametro is
  'Qué tan delicado es cambiarlo. "alto" toca algo legal, de cobro o de seguridad.';
comment on type public.categoria_parametro is
  'De qué parte de la app es el parámetro. Solo sirve para ordenarlos al mirarlos.';
