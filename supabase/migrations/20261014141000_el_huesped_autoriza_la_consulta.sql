/*
  La autorizacion del huesped para la consulta de antecedentes (14/10/2026).

  En Colombia consultar los datos de una persona en listas necesita su
  autorizacion (Ley 1581 de 2012). Se acepta en el preregistro junto con los
  terminos: `legales_de_la_estancia` ya devuelve los documentos de la
  plataforma, asi que aparece solo en la casilla que ya existe.

  El KT dice que el huesped no ve la palabra «verificacion»: el texto habla de
  «consultar listas publicas».

  **Texto provisional**: lo tiene que revisar el abogado del cliente
  (REVISAR-A-OJO). Sembrarlo no lo aprueba; lo deja donde se puede cambiar.

  Solo aditiva.
*/

insert into public.documento_legal (condominio_id, tipo, titulo, contenido)
select null, 'consulta_antecedentes', 'Autorización para consultar listas públicas',
  'Autorizo a Veciyo y al anfitrión de este alojamiento a consultar mi nombre y '
  || 'mi documento de identidad en bases de datos y listas públicas y restrictivas '
  || '(antecedentes judiciales y policiales, y listas nacionales e internacionales), '
  || 'a través de un proveedor especializado, con el único fin de dar seguridad a la '
  || 'comunidad del edificio durante mi estancia.' || chr(10) || chr(10)
  || 'El resultado solo lo conoce el anfitrión. Mis datos se tratan conforme a la '
  || 'Ley 1581 de 2012 de protección de datos personales, y puedo pedir que se '
  || 'consulten, corrijan o supriman escribiendo al soporte de Veciyo.'
where not exists (
  select 1 from public.documento_legal d
  where d.tipo = 'consulta_antecedentes' and d.condominio_id is null and d.vigente
);
