import { useAuthStore } from "@/stores";
import type { DatosDelMensaje } from "../helpers/mensajeDePreregistro";

/**
 * Lo que el mensaje del preregistro dice de la reserva: la vivienda, su torre,
 * el edificio y su ciudad salen de la sesión del anfitrión.
 */
export function useDatosDelMensaje(params: {
  unidadId?: string | null;
  nombre?: string;
  desde?: string;
  hasta?: string;
}): DatosDelMensaje {
  const unidad = useAuthStore((s) => s.unidades.find((u) => u.unidadId === params.unidadId));
  return {
    nombre: params.nombre,
    vivienda: unidad?.codigo,
    torre: unidad?.torreNumero || undefined,
    condominio: unidad?.condominioNombre,
    ciudad: unidad?.condominioCiudad || undefined,
    desde: params.desde,
    hasta: params.hasta,
  };
}
