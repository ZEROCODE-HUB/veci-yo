-- ----------------------------------------------------------------------------
-- El huésped puede poner el nombre de su propia visita
-- ----------------------------------------------------------------------------
-- `visita_alta` deja explícitamente que un huésped temporal registre una visita
-- --lleva `registrada_por = auth.uid() and es_huesped_con_reserva(unidad_id)`--
-- pero `invitado_acceso` usa `puede_ver_visita`, que se apoya en
-- `puede_operar_unidad` y ésa **excluye al huésped a propósito**.
--
-- Las dos políticas no concuerdan, y el resultado se ve en la aplicación: el
-- `POST /visita` responde 201 y el `POST /invitado` responde 403. Queda una
-- visita creada **sin una sola persona dentro**, y la pantalla no dice nada.
-- Comprobado recorriendo la aplicación como Tomás, huésped de la 102.
--
-- Una visita sin invitados no es un dato incompleto: es alguien que va a
-- presentarse en la portería y no figura por ningún lado.
--
-- El añadido es el mismo que ya tiene `visita_alta`, ni un permiso más: el
-- huésped solo alcanza los invitados de las visitas que **él mismo registró**.
-- No los de las visitas del propietario de la vivienda donde se aloja, que son
-- asunto ajeno.

create or replace function public.puede_ver_visita(p_visita_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        public.es_personal_condominio(v.condominio_id)
        or (v.unidad_id is not null and public.puede_operar_unidad(v.unidad_id))
        -- Lo suyo, y solo lo suyo: la visita que él registró.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.es_huesped_con_reserva(v.unidad_id)
        )
      )
  );
$$;

comment on function public.puede_ver_visita(uuid) is
  'Quien puede tocar una visita y sus invitados: el personal del condominio, quien opera la unidad, y el huesped temporal sobre la visita que el mismo registro (igual que visita_alta).';
