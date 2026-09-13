import { useQuery } from "@tanstack/react-query";
import { useAdminStore, usePerfilStore, useUbicacionStore } from "@/stores";
import { obtenerAlojamientoConfigRequest } from "../services";
import { tieneInformacionLibroHuesped } from "../helpers/huesped.helpers";
import { ALOJAMIENTO_POR_DEFECTO } from "../data/huespedMockData";

export function useMiAlojamiento() {
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const unidades = useAdminStore((state) => state.unidades);
  const tipologias = useAdminStore((state) => state.tipologias);
  const guestbooks = usePerfilStore((state) => state.guestbook);

  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const ubicacionId = ubicacionActiva?.id || 1;
  const query = useQuery({
    queryKey: ["huesped", "alojamiento", ubicacionId],
    queryFn: () => obtenerAlojamientoConfigRequest(ubicacionId),
  });

  const guestbook = guestbooks[String(ubicacionActiva?.id)] || null;
  const unidad = unidades.find(
    (item) =>
      item.id === ubicacionActiva?.id ||
      (ubicacionActiva?.alias && item.codigo === ubicacionActiva.alias) ||
      item.torreNumero === ubicacionActiva?.torreNumero,
  );
  const tipologia = unidad
    ? tipologias.find((item) => item.id === unidad.tipologiaId)
    : null;

  return {
    ...query,
    ubicacionActiva,
    unidad,
    tipologia,
    config: query.data || ALOJAMIENTO_POR_DEFECTO,
    guestbook,
    hasGuestbook: tieneInformacionLibroHuesped(guestbook),
  };
}

