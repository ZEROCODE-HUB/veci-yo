-- Los buckets no ponen su propio tope: lo pone `archivo_tamano_maximo_mb`.
--
-- Parametrización (25/10/2026): el tamaño máximo de un archivo eran tres
-- cifras a la vez --8 MB el parámetro, 5 MB las fotos de zona y del edificio,
-- 10 MB la mayoría de los buckets-- y en «correspondencia» y «condominios»
-- ninguna. Quien subía algo de 9 MB podía recibir el error del servidor en
-- vez de la frase de la app.
--
-- Ahora lo comprueba la app y la web contra el parámetro antes de subir, y
-- las funciones de servidor también. Los buckets quedan en 50 MB, que es el
-- máximo que admite el parámetro: un techo de seguridad, no una regla más.

update storage.buckets
   set file_size_limit = 52428800
 where id in (
   'antecedentes', 'condominios', 'correspondencia', 'pqrs',
   'reglamentos', 'reservas', 'visitas', 'zonas'
 );
