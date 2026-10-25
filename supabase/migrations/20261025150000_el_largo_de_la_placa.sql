-- El largo de una placa, una sola vez.
--
-- Parametrización (25/10/2026): la visita pedía 4 a 8 caracteres, el
-- vehículo del residente 4 a 10 (contando espacios y guiones, y con un
-- mensaje que decía «entre 4 y 8»), y la portería y la web no miraban nada.
-- Ahora las cuatro pantallas comparan la placa limpia --sin espacios ni
-- guiones-- con estos dos parámetros.

insert into public.configuracion_plataforma
  (clave, valor, tipo, unidad, minimo, maximo, valor_por_defecto, ambito, categoria, riesgo, es_publico, descripcion)
values
  ('placa_largo_minimo', '4', 'entero', 'caracteres', 2, 10, '4', 'plataforma', 'preregistro', 'bajo', true,
   'Caracteres mínimos de una placa, sin espacios ni guiones. Lo usan la visita, el vehículo del residente, la portería y el preregistro.'),
  ('placa_largo_maximo', '8', 'entero', 'caracteres', 4, 15, '8', 'plataforma', 'preregistro', 'bajo', true,
   'Caracteres máximos de una placa, sin espacios ni guiones. Lo usan la visita, el vehículo del residente, la portería y el preregistro.')
on conflict (clave) do nothing;
