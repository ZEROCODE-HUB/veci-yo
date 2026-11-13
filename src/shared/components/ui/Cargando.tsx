import { ActivityIndicator, View } from "react-native";
import { Esqueleto, type FormaDelEsqueleto } from "./Esqueleto";
import { theme } from "@/config";

/**
 * Mientras se está cargando algo.
 *
 * Existe porque **no existía**, y eso se notaba de dos formas. La primera es
 * cosmética y se ve: cada pantalla se inventaba la suya —ocho
 * `ActivityIndicator size="large"` copiados, y textos que decían «Cargando…»,
 * «Cargando...», «Cargando zonas...» y «Cargando tu alojamiento…»—.
 *
 * La segunda es la que importa. Sin un estado de carga, lo que una pantalla
 * enseña mientras no hay datos es **lo que haya en el almacén**, y el almacén
 * de viviendas arrancaba con dos casas inventadas —«Casa Amorcito» en
 * Miraflores y «Casa Mamá» en Cusco—. O sea que al abrir la aplicación se veía,
 * durante un parpadeo, una vivienda que no es de nadie; y si la carga fallaba,
 * se quedaba ahí.
 *
 * Lo pidió el cliente el 06/10/2026, con estas palabras: «sobre esos estados
 * iniciales no debe pasar, deberíamos tener un estado o componente de carga y
 * usarlo en todo».
 *
 * ## Qué decide y qué no
 *
 * Dice **que se está cargando**, y nada más. Lo que no hace, a propósito:
 *
 *   · **no decide si hay que cargar.** Eso lo sabe quien tiene los datos, y
 *     meterlo aquí obligaría a este componente a conocer la consulta;
 *   · **no es un «no hay nada».** Una lista vacía y una lista que todavía no ha
 *     llegado se parecen en la pantalla y no son lo mismo: la primera se
 *     explica —«todavía no tienes visitas»— y la segunda se espera. Confundirlas
 *     es lo que hace que una carga lenta parezca una casa sin nada.
 */
export function Cargando({
  /** Qué se está cargando. Lo lee un lector de pantalla: «Cargando tus visitas». */
  texto,
  /**
   * `completo` ocupa la pantalla; `enLinea` se queda donde esté, para un trozo
   * que se recarga sin que lo demás desaparezca; `control` es solo la rueda,
   * pequeña, para **dentro de un botón o una opción** que se está pulsando; y
   * `rueda` es la rueda grande centrada, para el arranque de la app, donde
   * todavía no hay pantalla de la que dibujar la silueta.
   */
  variante = "completo",
  /**
   * La silueta de lo que va a llegar (13/11/2026, el cliente eligió bloques
   * grises en vez de la rueda). Sin decirla, `completo` dibuja una lista y
   * `enLinea` unas líneas.
   */
  forma,
  /** Cuántas filas, tarjetas o campos dibuja la silueta. */
  cuantos,
}: {
  texto?: string;
  variante?: "completo" | "enLinea" | "control" | "rueda";
  forma?: FormaDelEsqueleto;
  cuantos?: number;
}) {
  const etiqueta = texto ? `Cargando ${texto}` : "Cargando";

  if (variante === "control" || variante === "rueda") {
    const rueda = (
      <ActivityIndicator
        size={variante === "rueda" ? "large" : "small"}
        color={theme.colors.primary}
        accessibilityLabel={etiqueta}
        aria-busy
      />
    );
    return variante === "rueda" ? (
      <View className="flex-1 items-center justify-center p-8">{rueda}</View>
    ) : (
      rueda
    );
  }

  const esCompleto = variante === "completo";
  return (
    <View
      className={esCompleto ? "flex-1 p-4" : "py-2"}
      /*
        Para quien no ve los bloques. `role="status"` es lo que hace que un
        lector de pantalla anuncie el cambio sin que la persona tenga que ir a
        buscarlo; sin él, la espera es silenciosa.
      */
      accessibilityRole="progressbar"
      aria-busy
      role="status"
      accessibilityLabel={etiqueta}
    >
      <Esqueleto forma={forma ?? (esCompleto ? "lista" : "lineas")} cuantos={cuantos} />
    </View>
  );
}
