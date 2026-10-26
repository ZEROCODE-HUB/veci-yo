-- Los enlaces de App Store y Google Play, en la base (hueco 4).
--
-- El cliente respondió el 21/10/2026: «Poner los links parametrizables desde
-- Supabase». Estaban escritos en `veciyo-web/src/components/Tiendas.tsx`, y
-- son provisionales mientras la aplicación no esté publicada: así se cambian
-- desde el panel (Ajustes) el día que lo esté, sin desplegar la web.
--
-- Públicos, porque los lee la web del huésped, que no tiene sesión.
-- Solo aditiva: dos filas nuevas.

insert into public.configuracion_plataforma
  (clave, valor, valor_por_defecto, descripcion, tipo, ambito, categoria, riesgo, es_publico)
values
  ('tienda_app_store_url',
   'https://apps.apple.com/app/veciyo/id0000000000',
   'https://apps.apple.com/app/veciyo/id0000000000',
   'Enlace de Veciyo en App Store. Lo enseña la web del huésped cuando decide crear su cuenta. Provisional hasta publicar la app; vacío oculta el botón.',
   'texto', 'plataforma', 'integraciones', 'bajo', true),
  ('tienda_google_play_url',
   'https://play.google.com/store/apps/details?id=com.veciyo.app',
   'https://play.google.com/store/apps/details?id=com.veciyo.app',
   'Enlace de Veciyo en Google Play. Lo enseña la web del huésped cuando decide crear su cuenta. Provisional hasta publicar la app; vacío oculta el botón.',
   'texto', 'plataforma', 'integraciones', 'bajo', true)
on conflict (clave) do nothing;
