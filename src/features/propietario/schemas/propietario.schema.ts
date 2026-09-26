import { z } from "zod";

export const aceptacionSchema = z.object({
  permiteRentaCorta: z.boolean(),
  permiteMascotas: z.boolean(),
  aptoNinos: z.boolean(),
});

export type AceptacionFormData = z.infer<typeof aceptacionSchema>;

/*
  Aquí había dos esquemas más que nadie usaba. `vehiculoSchema` valida una
  placa y un tipo, que es lo que ya hace el formulario de vehículos contra la
  tabla `vehiculo`.

  Y `pagoSuscripcionSchema` recogía `cardNumber`, `cardExpiry` y `cardCvv`:
  datos de tarjeta, validados en el cliente, sin nada al otro lado. El cobro va
  con un proveedor externo, y en ese modelo esos campos no pasan nunca por la
  aplicación --los pinta el SDK del proveedor y el número de tarjeta no llega a
  tocar este código--. Un esquema así, esperando a que alguien lo conecte, es
  una invitación a hacerlo mal.
*/
