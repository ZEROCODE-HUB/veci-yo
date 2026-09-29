import { z } from "zod";

/*
  `faceId`, `huellaDactilar` y `f2a` estaban aqui y en la pantalla, y no hacian
  nada: vivian en un store en memoria, asi que encender la verificacion en dos
  pasos y volver a entrar la dejaba apagada. El de 2FA era el peor, porque quien
  lo encendia creia tener una segunda barrera que no existia.

  Decision del 29/09/2026: **no se implementan por ahora y se quitan de la
  pantalla**, aunque esten en los requerimientos. Mejor no ofrecer una
  proteccion que ofrecerla de mentira. Ver `REVISAR-A-OJO.md` (57).
*/
export const seguridadSchema = z.object({
  correoRespaldo: z.string(),
  pausarCuenta: z.boolean(),
});

export type SeguridadFormularioValores = z.infer<typeof seguridadSchema>;
