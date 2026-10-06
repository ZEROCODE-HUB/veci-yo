import { View } from "react-native";
import { theme } from "@/config";
import { SvgXml } from "react-native-svg";
import { BANDERAS } from "@/shared/constants";

/**
 * La bandera de un país, dibujada.
 *
 * Hasta el 05/10/2026 salía del **código del país**: las dos letras de `CO`
 * convertidas en los dos «indicadores regionales» que el sistema dibuja como
 * 🇨🇴. Cero archivos y cero red, y **en Windows no se veía**: ese sistema no
 * trae la fuente de banderas, así que Chrome pintaba las dos letras. El
 * cliente lo pidió con imagen.
 *
 * Los dibujos viven dentro del proyecto —`banderas.generado.ts`, 13 KB las
 * veintiocho— y no se piden por red: una lista de países que no funciona sin
 * conexión es peor que una sin banderas.
 *
 * ## Por qué hay un recuadro debajo
 *
 * Varias banderas son blancas por un lado —Perú, Argentina, Canadá— y sobre
 * una fila blanca el borde desaparece y parece que falta media bandera. El
 * recuadro gris de un píxel la delimita siempre, y de paso **reserva el sitio**
 * cuando el código no tiene dibujo: sin él, la fila daría un salto.
 *
 * El tamaño va en `style` y no en clases. React Native Web escribe el tamaño
 * real del archivo como estilo en línea, y un estilo en línea gana a una
 * clase: está documentado en AGENTS.md y costó un modal transparente.
 */
export function Bandera({
  codigo,
  /** El ancho en píxeles. El alto sale de la proporción 3:2 de los dibujos. */
  ancho = 20,
}: {
  codigo: string | null | undefined;
  ancho?: number;
}) {
  const iso = (codigo ?? "").trim().toUpperCase();
  const dibujo = BANDERAS[iso];
  const alto = Math.round((ancho * 2) / 3);

  return (
    <View
      style={{
        width: ancho,
        height: alto,
        borderRadius: 2,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.borderLight,
      }}
      /*
        Decorativa: al lado va siempre el nombre del país, así que leerla en
        voz alta sería decirlo dos veces.
      */
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {dibujo ? <SvgXml xml={dibujo} width={ancho} height={alto} /> : null}
    </View>
  );
}
