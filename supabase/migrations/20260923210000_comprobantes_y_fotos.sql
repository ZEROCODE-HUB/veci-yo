-- ----------------------------------------------------------------------------
-- El comprobante de pago no lo ve la porteria, y la foto la borra quien la saco
-- ----------------------------------------------------------------------------
-- El bucket `reservas` guarda los comprobantes de pago de las reservas de zona
-- comun. Su propia migracion dice por que es privado:
--
--   "Un comprobante de pago lleva datos bancarios: el bucket es privado y solo
--    lo ve quien puede ver la reserva."
--
-- Y despues define "quien puede ver la reserva" como `puede_operar_unidad`,
-- que incluye `es_personal_condominio`. O sea: **la porteria ve la
-- transferencia bancaria de cualquier residente**. No es lo que la frase
-- anterior queria decir, y no hay ningun motivo por el que un guardia necesite
-- el comprobante de pago del salon de eventos.
--
-- Quien lo necesita es quien hizo la reserva —para subirlo— y la
-- administracion, que es quien aprueba a mano.
--
-- Es la tercera vez que `puede_operar_unidad` aparece donde hacia falta
-- `es_miembro_unidad`: la primera fue el reporte legal, la segunda el alta del
-- reporte. La funcion esta bien; el problema es su nombre, que suena a "quien
-- tiene que ver con esta vivienda" cuando significa "eso, mas todo el personal
-- del edificio".

create or replace function public.puede_ver_reserva(p_reserva_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = p_reserva_id
      and (
        public.es_miembro_unidad(r.unidad_id)
        or public.es_admin_condominio(z.condominio_id)
        -- El huesped reserva a su nombre y tiene que poder adjuntar el suyo.
        or r.solicitada_por = auth.uid()
      )
  );
$$;

comment on function public.puede_ver_reserva(uuid) is
  'Quien puede ver el comprobante de pago de una reserva. NO la porteria: lleva datos bancarios.';


-- ----------------------------------------------------------------------------
-- La foto del documento la borra quien la saco
-- ----------------------------------------------------------------------------
-- El bucket `visitas` guarda las fotos del documento de quien entra. Leerlas
-- es de todo el personal —la porteria las necesita en la puerta— pero
-- **borrarlas** estaba con el mismo predicado, asi que un guardia podia
-- eliminar la foto que habia tomado otro. Es la constancia de quien entro al
-- edificio.
--
-- Quien saca una foto mal tiene que poder repetirla, asi que borra la suya;
-- y la administracion, que responde por el archivo.
drop policy if exists "visitas_baja_fotos" on storage.objects;

create policy "visitas_baja_fotos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'visitas'
    and public.puede_ver_visita(((storage.foldername(name))[1])::uuid)
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.visita v
        where v.id = ((storage.foldername(name))[1])::uuid
          and public.es_admin_condominio(v.condominio_id)
      )
    )
  );
