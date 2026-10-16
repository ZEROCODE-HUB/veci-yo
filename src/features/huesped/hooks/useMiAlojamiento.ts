import { useQuery } from "@tanstack/react-query";
import { formatDateInput } from "@/shared/utils";
import { useAdminStore, useUbicacionStore } from "@/stores";
import {
  miCodigoDeAcceso,
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
  // El QR de la estancia (14/10/2026): sale al cerrar el preregistro.
  const codigo = useQuery({
    queryKey: ["huesped", "codigo", unidadId],
    queryFn: () => miCodigoDeAcceso(unidadId),
    enabled: Boolean(unidadId),
  });
  const guestbook = libro.data ?? null;
  const tipologia = unidad
    ? tipologias.find((item) => item.uuid === unidad.tipologiaId)
    : null;

  // Si la estancia todavia no ha empezado, el libro llega vacio a proposito:
  // la base no entrega las credenciales de entrada hasta el dia de llegada.
  // La pantalla necesita saberlo para decirlo, en vez de dar a entender que el
  // anfitrion no ha cargado nada.
  const hoy = formatDateInput(new Date());
  const llegadaPendiente =
    ubicacionActiva?.vigenteDesde && ubicacionActiva.vigenteDesde > hoy
      ? ubicacionActiva.vigenteDesde
      : null;

  return {
    ...query,
    acceso: codigo.data ?? null,
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
    /*
      Cuál de las dos lecturas falló. Un fallo --un corte, un permiso-- deja el
      dato en nulo, igual que «no hay nada», y la pantalla decía «todavía no
      tiene ficha» y «tu Guestbook aún está vacío» sobre un alojamiento que
      tenía las dos cosas (13/10/2026). Es mandar al huésped a perseguir a su
      anfitrión por algo que está cargado.
    */
    falloLaFicha: query.isError,
    falloElLibro: libro.isError,
    reintentar: () => {
      void query.refetch();
      void libro.refetch();
    },
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

