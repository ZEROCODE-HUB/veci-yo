import { useEffect, useRef } from "react";
import { Animated, Platform, View, type DimensionValue } from "react-native";
import { theme } from "@/config";

/**
 * Bloques grises con la forma de lo que va a llegar (13/11/2026, cliente:
 * «en muchas pantallas no hay estados de carga… prefiero bloques grises»).
 *
 * Mientras una pantalla espera sus datos ya no enseña una rueda ni --peor--
 * un «no hay nada» que todavía no es verdad: enseña la silueta de lo que
 * vendrá, latiendo despacio. Es lo que hacen las apps que la gente ya conoce,
 * y deja claro de un vistazo que algo está llegando.
 *
 * `Bloque` es la pieza suelta; las `formas` de abajo son las siluetas que se
 * repiten en la app (una lista de filas, una ficha, un formulario, tarjetas).
 * Una pantalla con una forma propia puede componer la suya con `Bloque`.
 */

/** El latido: todos los bloques de una silueta comparten uno. */
function useLatido() {
  const valor = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(valor, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(valor, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [valor]);
  return valor;
}

export function Bloque({
  ancho = "100%",
  alto = 14,
  redondo = 8,
  style,
}: {
  ancho?: DimensionValue;
  alto?: DimensionValue;
  redondo?: number;
  style?: object;
}) {
  return (
    <View
      style={[
        { width: ancho, height: alto, borderRadius: redondo, backgroundColor: theme.colors.border },
        style,
      ]}
    />
  );
}

/** Una fila de lista: círculo, dos líneas y algo a la derecha. */
function Fila({ conAvatar = true }: { conAvatar?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
      {conAvatar ? <Bloque ancho={40} alto={40} redondo={20} /> : null}
      <View className="flex-1 gap-2">
        <Bloque ancho="65%" alto={14} />
        <Bloque ancho="40%" alto={12} />
      </View>
      <Bloque ancho={48} alto={20} redondo={10} />
    </View>
  );
}

function Tarjeta() {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <Bloque ancho="100%" alto={110} redondo={12} />
      <Bloque ancho="70%" alto={16} />
      <Bloque ancho="45%" alto={12} />
    </View>
  );
}

function Campo() {
  return (
    <View className="gap-2">
      <Bloque ancho="35%" alto={12} />
      <Bloque ancho="100%" alto={48} redondo={16} />
    </View>
  );
}

function Ficha() {
  return (
    <View className="gap-4">
      <View className="items-center gap-3 rounded-2xl bg-white p-5">
        <Bloque ancho={64} alto={64} redondo={32} />
        <Bloque ancho="55%" alto={18} />
        <Bloque ancho="35%" alto={12} />
      </View>
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Bloque ancho="90%" />
        <Bloque ancho="75%" />
        <Bloque ancho="60%" />
      </View>
    </View>
  );
}

export type FormaDelEsqueleto = "lista" | "filas" | "tarjetas" | "formulario" | "ficha" | "lineas";

/**
 * La silueta completa. `cuantos` es cuántas filas/tarjetas/campos dibuja.
 *
 *   · `lista`: filas con círculo (personas, conversaciones, visitas).
 *   · `filas`: filas sin círculo (pagos, reservas, movimientos).
 *   · `tarjetas`: tarjetas con imagen (zonas, anuncios).
 *   · `formulario`: etiqueta + campo, uno debajo de otro.
 *   · `ficha`: cabecera centrada y un bloque de texto (detalle de algo).
 *   · `lineas`: unas líneas sueltas, para un trozo pequeño dentro de otra cosa.
 */
export function Esqueleto({
  forma = "lista",
  cuantos,
}: {
  forma?: FormaDelEsqueleto;
  cuantos?: number;
}) {
  const latido = useLatido();
  const n = cuantos ?? (forma === "tarjetas" ? 2 : forma === "lineas" ? 3 : forma === "formulario" ? 4 : 5);

  let contenido: React.ReactNode;
  if (forma === "ficha") contenido = <Ficha />;
  else if (forma === "lineas")
    contenido = Array.from({ length: n }, (_, i) => (
      <Bloque key={i} ancho={i === n - 1 ? "55%" : "90%"} />
    ));
  else
    contenido = Array.from({ length: n }, (_, i) =>
      forma === "tarjetas" ? (
        <Tarjeta key={i} />
      ) : forma === "formulario" ? (
        <Campo key={i} />
      ) : (
        <Fila key={i} conAvatar={forma === "lista"} />
      ),
    );

  return (
    /*
      El espacio va en `style` y no en `className`: un componente envuelto en
      `Animated` pierde sus clases (AGENTS.md), y las líneas salían pegadas.
    */
    <Animated.View
      style={{ opacity: latido, gap: forma === "lineas" ? 8 : 12, paddingVertical: forma === "lineas" ? 8 : 0 }}
    >
      {contenido}
    </Animated.View>
  );
}
