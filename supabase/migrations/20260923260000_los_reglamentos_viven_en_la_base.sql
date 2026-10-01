-- ----------------------------------------------------------------------------
-- Los reglamentos viven en la base, uno por condominio
-- ----------------------------------------------------------------------------
-- La tabla `reglamento` existe desde el primer dia —con `condominio_id`, el
-- contenido por secciones, `archivo_path`, `version` y `vigente`— y estaba
-- **vacia y sin leer**. La pantalla mostraba el texto de
-- `src/features/reglas/reglasContenido.ts`, un archivo TypeScript: el mismo
-- reglamento para todos los edificios, y para cambiar una linea habia que
-- publicar la aplicacion.
--
-- Cada condominio tiene el suyo: es su reglamento interno, y el de renta corta
-- es justamente el que el RNT exige presentar.
--
-- Esta migracion siembra en la tabla **el texto que la aplicacion mostraba
-- hasta ahora**, para no perderlo al desconectar el archivo. Ojo con el de
-- huesped temporal: R-51 dice que es un contrato de arrendamiento de larga
-- duracion —habla de pagar renta mensual y de un plazo de 20 anios— y que no
-- aplica a una estancia de cuatro noches. Sembrarlo no lo aprueba; lo pone
-- donde el cliente pueda reemplazarlo sin tocar codigo, que es justo lo que
-- faltaba.
--
-- `on conflict do nothing` porque no hay clave unica por (condominio, tipo):
-- un condominio puede tener versiones, y `vigente` dice cual rige.

insert into public.reglamento (condominio_id, tipo, titulo, contenido)
select c.id, 'residente_permanente', 'Residente Permanente', '[{"titulo":"","items":["Vivir en paz y sin interrupciones, lo que se conoce como \"uso tranquilo\"","Quejarse con el propietario si otros inquilinos lo molestan","Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento"]},{"titulo":"Obligaciones del inquilino","items":["Pagar la renta y otros gastos pactados en tiempo y forma","Cuidar el inmueble y devolverlo en las mismas condiciones","Respetar el reglamento interno del condominio","Permitir inspecciones acordadas previamente"]},{"titulo":"Duración del contrato","items":["El plazo máximo de un contrato de arrendamiento es de 20 años","La renovación debe pactarse por escrito antes del vencimiento"]}]'::jsonb
from public.condominio c
where not exists (
  select 1 from public.reglamento r
  where r.condominio_id = c.id and r.tipo = 'residente_permanente'
);

insert into public.reglamento (condominio_id, tipo, titulo, contenido)
select c.id, 'huesped_temporal', 'Huéspedes Temporales', '[{"titulo":"","items":["Vivir en paz y sin interrupciones, lo que se conoce como \"uso tranquilo\"","Quejarse con el propietario si otros inquilinos lo molestan","Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento"]},{"titulo":"Obligaciones del inquilino","items":["Pagar la renta y otros gastos pactados en tiempo y forma","Cuidar el inmueble y devolverlo en las mismas condiciones","Respetar el reglamento interno del condominio","Permitir inspecciones acordadas previamente"]},{"titulo":"Duración del contrato","items":["El plazo máximo de un contrato de arrendamiento es de 20 años","La renovación debe pactarse por escrito antes del vencimiento"]}]'::jsonb
from public.condominio c
where not exists (
  select 1 from public.reglamento r
  where r.condominio_id = c.id and r.tipo = 'huesped_temporal'
);

insert into public.reglamento (condominio_id, tipo, titulo, contenido)
select c.id, 'guardia_seguridad', 'Guardia de Seguridad', '[{"titulo":"Funciones del Guardia","items":["Controlar el ingreso y salida de personas y vehículos","Verificar la identidad de visitantes y residentes","Reportar cualquier incidente de seguridad al administrador","Mantener el registro de visitas actualizado"]},{"titulo":"Prohibiciones","items":["Abandonar el puesto sin autorización","Permitir el ingreso de personas no autorizadas","Divulgar información de los residentes"]}]'::jsonb
from public.condominio c
where not exists (
  select 1 from public.reglamento r
  where r.condominio_id = c.id and r.tipo = 'guardia_seguridad'
);

comment on table public.reglamento is
  'El reglamento de cada condominio, por tipo. `vigente` dice cual rige; `archivo_path` apunta al PDF en el bucket cuando lo haya. El texto vivia en un archivo TypeScript, igual para todos los edificios.';
