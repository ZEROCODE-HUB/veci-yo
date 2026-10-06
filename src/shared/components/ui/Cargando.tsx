import { ActivityIndicator, Text, View } from "react-native";
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
  /** Qué se está cargando. Sin esto dice solo «Cargando…». */
  texto,
  /**
   * `completo` ocupa la pantalla y centra; `enLinea` se queda donde esté, para
   * un trozo que se recarga sin que lo demás desaparezca.
   */
  variante = "completo",
}: {
  texto?: string;
  variante?: "completo" | "enLinea";
}) {
  const esCompleto = variante === "completo";

  return (
    <View
      className={
        esCompleto
          ? "flex-1 items-center justify-center gap-3 p-8"
          : "items-center gap-2 py-4"
      }
      /*
        Para quien no ve la rueda. `role="status"` es lo que hace que un lector
        de pantalla anuncie el cambio sin que la persona tenga que ir a
        buscarlo; sin él, la espera es silenciosa.
      */
      accessibilityRole="progressbar"
      aria-busy
      role="status"
      accessibilityLabel={texto ? `Cargando ${texto}` : "Cargando"}
    >
      <ActivityIndicator
        size={esCompleto ? "large" : "small"}
        color={theme.colors.primary}
      />
      <Text
        className={esCompleto ? "text-sm" : "text-xs"}
        style={{ color: theme.colors.textSecondary }}
      >
        {texto ? `Cargando ${texto}…` : "Cargando…"}
      </Text>
    </View>
  );
}
