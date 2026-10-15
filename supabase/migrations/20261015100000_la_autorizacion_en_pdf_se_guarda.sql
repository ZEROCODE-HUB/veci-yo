-- La autorización firmada de un menor en PDF se guarda (15/10/2026).
--
-- La web y `subir-autorizacion-menor` aceptan PDF desde el 03/10/2026 —una
-- autorización notarial suele llegar escaneada así—, pero el bucket `visitas`
-- solo admitía imágenes, así que toda autorización en PDF fallaba al guardarse
-- con «No se pudo guardar la autorización». Se vio recorriendo el alta.
--
-- Solo se añade el tipo: no se quita ninguno ni se toca ningún archivo.
update storage.buckets
   set allowed_mime_types = array(
         select distinct unnest(allowed_mime_types || array['application/pdf'])
       )
 where id = 'visitas'
   and not ('application/pdf' = any(allowed_mime_types));
