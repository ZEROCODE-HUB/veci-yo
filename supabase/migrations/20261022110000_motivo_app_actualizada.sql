-- El aviso de que la app se actualizó (OTA), 22/10/2026.
--
-- En archivo aparte: un valor nuevo de un enum no se puede usar en la misma
-- transacción que lo crea.

alter type public.motivo_notificacion add value if not exists 'app_actualizada';
