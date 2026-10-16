-- La plataforma de donde viene una reserva de huésped temporal (16/10/2026).
-- Va en su propio archivo: un tipo nuevo, aparte de quien lo usa.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plataforma_reserva') then
    create type public.plataforma_reserva as enum ('airbnb', 'booking', 'directo', 'otra');
  end if;
end $$;

comment on type public.plataforma_reserva is
  'De donde viene la reserva: Airbnb, Booking, directa con el anfitrion u otra plataforma.';
