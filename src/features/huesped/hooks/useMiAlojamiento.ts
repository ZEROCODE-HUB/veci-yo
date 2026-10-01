import { useQuery } from "@tanstack/react-query";
import { useAdminStore, useUbicacionStore } from "@/stores";
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
  const unidadId = unidad?.uuid ?? "";

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

  // Si la estancia todavia no ha empezado, el libro llega vacio a proposito:
  // la base no entrega las credenciales de entrada hasta el dia de llegada.
  // La pantalla necesita saberlo para decirlo, en vez de dar a entender que el
  // anfitrion no ha cargado nada.
  const hoy = new Date().toISOString().slice(0, 10);
  const llegadaPendiente =
    ubicacionActiva?.vigenteDesde && ubicacionActiva.vigenteDesde > hoy
      ? ubicacionActiva.vigenteDesde
      : null;

  return {
    ...query,
    /*
      Si todavia no se sabe. La vivienda sale del store de arquitectura, que se
      llena al arrancar la aplicacion: hasta que llega, `unidadId` esta vacio,
      las dos consultas ni se lanzan y `config` y `guestbook` son nulos --que es
      exactamente lo mismo que devuelven cuando de verdad no hay nada--.

      La pantalla no podia distinguirlo y al entrar por primera vez afirmaba
      «Esta vivienda todavia no tiene ficha de alojamiento» y «Tu Guestbook aun
      esta vacio» sobre una vivienda que si tenia las dos cosas. Es lo primero
      que lee alguien que acaba de llegar al edificio.
    */
    cargando: !unidadId || query.isLoading || libro.isLoading,
    llegadaPendiente,
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

