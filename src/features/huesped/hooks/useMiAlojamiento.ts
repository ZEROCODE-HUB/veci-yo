import { useQuery } from "@tanstack/react-query";
import { useAdminStore, usePerfilStore, useUbicacionStore } from "@/stores";
import {
  obtenerAlojamientoConfigRequest,
  obtenerLibroHuesped,
} from "../services";
import { tieneInformacionLibroHuesped } from "../helpers/huesped.helpers";

export function useMiAlojamiento() {
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const unidades = useAdminStore((state) => state.unidades);
  const tipologias = useAdminStore((state) => state.tipologias);

  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  // El libro se leia de un store en memoria: la pantalla decia "Tu Guestbook
  // aun esta vacio" aunque el anfitrion lo hubiera cargado.

  // La ubicacion activa trae el codigo de la unidad; el id numerico del
  // prototipo no sirve para buscar en la base.
  const unidad = unidades.find(
    (item) => item.codigo === ubicacionActiva?.codigo,
  );
  const unidadId = (unidad as any)?.uuid ?? "";

  const query = useQuery({
    queryKey: ["huesped", "alojamiento", unidadId],
    queryFn: () => obtenerAlojamientoConfigRequest(unidadId),
    enabled: Boolean(unidadId),
  });

  const libro = useQuery({
    queryKey: ["huesped", "libro", unidadId],
    queryFn: () => obtenerLibroHuesped(unidadId),
    enabled: Boolean(unidadId),
  });
  const guestbook = libro.data ?? null;
  const tipologia = unidad
    ? tipologias.find((item) => item.id === unidad.tipologiaId)
    : null;

  return {
    ...query,
    ubicacionActiva,
    unidad,
    tipologia,
    // Sin suscripcion de renta corta no hay ficha: antes se mostraba una
    // inventada.
    config: query.data ?? null,
    guestbook,
    hasGuestbook: tieneInformacionLibroHuesped(guestbook),
  };
}

