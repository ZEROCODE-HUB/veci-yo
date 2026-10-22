-- El aviso de prueba que cada quien se manda a sí mismo desde Perfil › Avisos
-- para comprobar que el push le llega al celular (22/10/2026).
--
-- En archivo aparte: un valor nuevo de un enum no se puede usar en la misma
-- transacción que lo crea.

alter type public.motivo_notificacion add value if not exists 'aviso_de_prueba';
