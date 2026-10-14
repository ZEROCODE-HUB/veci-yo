-- Un tipo de documento legal mas: la autorizacion del huesped para consultar
-- sus datos en listas publicas (14/10/2026). Va solo en su archivo porque
-- `alter type ... add value` no se puede usar en la misma transaccion.
alter type public.tipo_documento_legal add value if not exists 'consulta_antecedentes';
