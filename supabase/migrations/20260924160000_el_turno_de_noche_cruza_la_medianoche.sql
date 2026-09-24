-- ----------------------------------------------------------------------------
-- El turno de noche cruza la medianoche
-- ----------------------------------------------------------------------------
-- `turno_override` --el ajuste puntual de un dia-- exigia `hora_fin > hora_inicio`.
-- Un guardia de noche entra a las 22:00 y sale a las 06:00, asi que esa
-- comprobacion rechaza el turno mas comun que hay en una porteria.
--
-- Y la incoherencia estaba dentro de casa: `turno_guardia`, el horario
-- **habitual**, no lleva esa restriccion. O sea que el turno de noche de todas
-- las semanas se podia fijar, y el ajuste de una sola noche no. La pantalla
-- no explica por que: la base responde un error de restriccion.
--
-- Esto no decide ninguna regla de producto --el KT no dice nada de jornadas ni
-- de horarios-- sino que quita una restriccion que contradecia a su tabla
-- hermana.
--
-- Lo que si es un invariante de verdad es el que ya estaba escrito en el
-- comentario de la tabla: **sin horas significa que ese dia no trabaja**. Media
-- hora --una puesta y la otra no-- no quiere decir nada, y eso si se sujeta.

alter table public.turno_override
  drop constraint if exists turno_override_horas_coherentes;

alter table public.turno_override
  add constraint turno_override_horas_completas
  check ((hora_inicio is null) = (hora_fin is null));

comment on constraint turno_override_horas_completas on public.turno_override is
  'Las dos horas o ninguna. Ninguna significa que ese dia no trabaja; media hora no significa nada. No se compara el orden: un turno de noche sale al dia siguiente.';
