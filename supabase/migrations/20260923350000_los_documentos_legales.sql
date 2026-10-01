-- ----------------------------------------------------------------------------
-- Los documentos legales
-- ----------------------------------------------------------------------------
-- "Terminos y Condiciones de la App", "Tratamiento de Datos Personales",
-- "Politica de Privacidad" y "Terminos y Condiciones del Condominio" vivian en
-- `LegalAccordion.tsx`, escritos a mano y **con un parrafo de relleno cada
-- uno**:
--
--   "1. Aceptacion de los Terminos\n\nAl registrarse en VeciYo, el usuario
--    acepta cumplir con los presentes terminos y condiciones de uso."
--
-- Eso es el texto entero. Para cambiarlo --para poner el de verdad-- hay que
-- publicar la aplicacion, y el cuarto es **por condominio**, asi que ni
-- siquiera puede ser un texto unico.
--
-- Es el mismo caso que el reglamento, que ya se resolvio asi: el texto vive en
-- la base y el cliente lo reemplaza sin tocar codigo.
--
-- La diferencia esta en quien puede leerlos. La pantalla que los muestra esta
-- en el `AuthStack`: se ve **antes de iniciar sesion**, porque aceptarlos es
-- parte de registrarse. Asi que los de la plataforma son publicos de verdad
-- --`anon` incluido--, y los de un condominio los ve quien pertenece a el.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_documento_legal') then
    create type public.tipo_documento_legal as enum (
      'terminos_app',
      'tratamiento_datos',
      'privacidad',
      'terminos_condominio'
    );
  end if;
end $$;

create table if not exists public.documento_legal (
  id            uuid primary key default gen_random_uuid(),
  -- Nulo = de la plataforma. Con condominio = de ese edificio.
  condominio_id uuid references public.condominio(id) on delete cascade,
  tipo          public.tipo_documento_legal not null,
  titulo        text not null,
  contenido     text not null,
  version       integer not null default 1,
  vigente       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Los de la plataforma no llevan condominio y el del condominio si: mezclar
  -- los dos haria que la pantalla de registro mostrara el reglamento de un
  -- edificio cualquiera.
  constraint documento_legal_ambito_coherente
    check (
      (tipo = 'terminos_condominio' and condominio_id is not null)
      or (tipo <> 'terminos_condominio' and condominio_id is null)
    )
);

comment on table public.documento_legal is
  'Los textos legales que la persona acepta al registrarse. Vivian en el codigo con un parrafo de relleno cada uno.';

-- Uno vigente por tipo y ambito: dos a la vez harian que la pantalla mostrara
-- uno u otro segun el orden de lectura.
create unique index if not exists documento_legal_vigente_unico
  on public.documento_legal (tipo, coalesce(condominio_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where vigente;

drop trigger if exists documento_legal_tocar_updated_at on public.documento_legal;
create trigger documento_legal_tocar_updated_at
  before update on public.documento_legal
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- Quien los lee
-- ----------------------------------------------------------------------------
alter table public.documento_legal enable row level security;

-- Los de la plataforma, cualquiera: la pantalla que los muestra esta en el
-- stack de autenticacion y se ve antes de tener cuenta. Negarselos a `anon`
-- seria pedirle a alguien que acepte unos terminos que no puede leer.
drop policy if exists documento_legal_lectura_publica on public.documento_legal;
create policy documento_legal_lectura_publica on public.documento_legal
  for select to anon, authenticated
  using (vigente and condominio_id is null);

drop policy if exists documento_legal_lectura_condominio on public.documento_legal;
create policy documento_legal_lectura_condominio on public.documento_legal
  for select to authenticated
  using (
    vigente
    and condominio_id is not null
    and (
      public.es_miembro_condominio(condominio_id)
      or public.es_huesped_del_condominio(condominio_id)
    )
  );

-- Los del condominio los escribe su administracion. Los de la plataforma no
-- los escribe nadie desde la aplicacion: son de quien opera el producto, y van
-- con `service_role`, igual que el precio del plan.
drop policy if exists documento_legal_escritura on public.documento_legal;
create policy documento_legal_escritura on public.documento_legal
  for all to authenticated
  using (condominio_id is not null and public.es_admin_condominio(condominio_id))
  with check (condominio_id is not null and public.es_admin_condominio(condominio_id));

grant select on public.documento_legal to anon, authenticated;
grant insert, update, delete on public.documento_legal to authenticated;


-- ----------------------------------------------------------------------------
-- Semilla
-- ----------------------------------------------------------------------------
-- Se siembra **lo que la aplicacion mostraba** y nada mas. No es el texto
-- legal de nadie: es un parrafo de maqueta, y sembrarlo no lo aprueba. Lo
-- pone donde el cliente pueda reemplazarlo, que es justo lo que faltaba --el
-- mismo criterio que con el reglamento y R-51--.
insert into public.documento_legal (condominio_id, tipo, titulo, contenido)
values
  (null, 'terminos_app', 'Términos y Condiciones de la App y Web',
   '1. Aceptación de los Términos' || chr(10) || chr(10) ||
   'Al registrarse en VeciYo, el usuario acepta cumplir con los presentes términos y condiciones de uso.'),
  (null, 'tratamiento_datos', 'Tratamiento de Datos Personales',
   '1. Marco Legal' || chr(10) || chr(10) ||
   'Esta política se rige por la Ley de Protección de Datos Personales vigente.'),
  (null, 'privacidad', 'Política de Privacidad',
   '1. Recopilación de Datos' || chr(10) || chr(10) ||
   'VeciYo recopila información personal necesaria para el funcionamiento de la plataforma.')
on conflict do nothing;

-- El del condominio, uno por cada uno que haya.
insert into public.documento_legal (condominio_id, tipo, titulo, contenido)
select c.id, 'terminos_condominio', 'Términos y Condiciones del Condominio',
   '1. Normas de Convivencia' || chr(10) || chr(10) ||
   'Todos los residentes se comprometen a mantener un comportamiento respetuoso.'
from public.condominio c
where not exists (
  select 1 from public.documento_legal d
  where d.condominio_id = c.id and d.tipo = 'terminos_condominio' and d.vigente
);
