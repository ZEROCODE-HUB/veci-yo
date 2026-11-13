-- La 206 (11/11/2026, a mano: no está en el respaldo). Es de Guillermo, no vive
-- nadie y se alquila por noches. Hace el papel que tenía la 205 hasta que
-- desde el 29/10 una vivienda con inquilina líder dejó de poder alquilarse:
-- la usan las pruebas que necesitan estancias propias lejos de la 102.
begin;
insert into public.unidad (id, condominio_id, torre_id, codigo, piso, estado)
values ('44444444-4444-4444-4444-444444444445', '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222', '206', 2, 'aceptado')
on conflict do nothing;
insert into public.membresia_unidad (id, unidad_id, usuario_id, nombre, rol, es_anfitrion_primario,
  es_admin_primario, es_residente, puede_acceder, activo, datos_visibles, contactable_chat, contactable_whatsapp)
values ('46666666-0000-0000-0000-000000000206', '44444444-4444-4444-4444-444444444445',
        '58537b22-7599-4720-a387-dd0467b1c11e', 'Guillermo Provenzano', 'propietario', true,
        true, false, true, true, true, true, true)
on conflict do nothing;
insert into public.suscripcion_renta_corta (id, unidad_id, estado, iniciada_en, verificaciones_base,
  max_huespedes, estacionamientos_huesped, estancia_minima_noches, permite_mascotas)
values ('46666666-0000-0000-0000-000000000207', '44444444-4444-4444-4444-444444444445', 'activa',
        '2026-11-11', 1000, 5, 1, 1, true)
on conflict do nothing;
commit;
