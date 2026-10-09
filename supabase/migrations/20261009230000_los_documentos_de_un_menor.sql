-- Los documentos que tiene un menor
--
-- Al decidir el 09/10/2026 que a un menor también se le pide su documento
-- --el ministerio lo exige por cada persona-- salió que `tipo_documento` no
-- tiene **ninguno que le sirva**: cédula de ciudadanía, de extranjería, DNI,
-- carné de extranjería, PEP, pasaporte y PPT. Todos de adulto.
--
-- En Colombia un menor tiene registro civil de nacimiento hasta los siete años
-- y tarjeta de identidad de los siete a los diecisiete. Sin esos dos valores,
-- la lista obligaría a elegir uno falso: alguien marcaría «cédula de
-- ciudadanía» para un niño de siete años, y eso viaja tal cual al MinCIT.
--
-- Es lo que ya pasó con el país del condominio, que se recortaba a dos letras
-- y guardaba `ES` para «Estados Unidos»: **un dato malo con la forma
-- correcta**, que ninguna restricción detecta porque encaja.
--
-- Va en su propio archivo porque `alter type ... add value` no admite
-- compañía en la misma transacción. Aditiva: solo añade valores.

alter type public.tipo_documento add value if not exists 'registro_civil';
alter type public.tipo_documento add value if not exists 'tarjeta_identidad';
