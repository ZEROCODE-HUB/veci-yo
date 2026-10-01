-- ============================================================================
-- 0014 · Bucket para los comprobantes de pago de reservas
-- ============================================================================
-- Flujo acordado el 01/07/2026: cuando la zona tiene costo, el residente sube
-- el comprobante y la administracion aprueba a mano. No hay verificacion
-- automatica contra el banco.
--
-- Un comprobante de pago lleva datos bancarios: el bucket es privado y solo lo
-- ven quien puede operar la unidad que reservo, y la administracion.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reservas', 'reservas', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Convencion de rutas: `<reserva_id>/<archivo>`.
create or replace function public.puede_ver_reserva(p_reserva_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = p_reserva_id
      and (
        public.puede_operar_unidad(r.unidad_id)
        or public.es_admin_condominio(z.condominio_id)
      )
  );
$$;

create policy "reservas_lectura_comprobantes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reservas'
    and public.puede_ver_reserva(((storage.foldername(name))[1])::uuid)
  );

create policy "reservas_alta_comprobantes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reservas'
    and public.puede_ver_reserva(((storage.foldername(name))[1])::uuid)
  );
