/*
  El bucket del informe de antecedentes (14/10/2026).

  Privado y **sin ninguna politica**: lo escribe y lo firma solo la funcion
  `reporte-antecedentes`, con la clave de servicio, despues de comprobar que
  quien lo pide es el anfitrion. Va aparte de `visitas` a proposito: en ese
  bucket la porteria lee lo que cuelga de la visita, y este informe no lo
  puede ver nunca.

  Solo aditiva.
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('antecedentes', 'antecedentes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
