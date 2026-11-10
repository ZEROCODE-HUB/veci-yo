-- Un motivo de aviso nuevo (10/11/2026): una reserva que llega del calendario
-- de una plataforma (Airbnb, Booking…) cae sobre una visita de amigos o
-- familia que el anfitrión ya había anunciado. Va en su propio archivo porque
-- un valor nuevo de un enum no se puede usar en la misma transacción que lo
-- crea. Solo aditiva.
alter type public.motivo_notificacion add value if not exists 'visitas_en_la_estancia';
