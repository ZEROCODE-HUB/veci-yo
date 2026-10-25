import { theme } from "@/config";
import { useState } from "react";
import { View, Image } from "react-native";

const sosIlustracion = require("@/assets/branding/sos.png");

/** Por debajo de esto la ilustración es una franja que no se reconoce. */
const ALTO_MINIMO = 100;

/**
 * La ilustración del S.O.S., que cede su sitio a los botones.
 *
 * Tenía 220 de alto fijos, y en un celular bajo o con la letra grande los
 * botones quedaban fuera de la pantalla, sin scroll (auditoría de
 * responsividad, 25/10/2026). Ahora ocupa lo que sobra, hasta 220, y si sobra
 * menos de `ALTO_MINIMO` no se dibuja: en una emergencia importan los botones.
 */
export function IlustracionSos() {
  const [alto, setAlto] = useState(0);
  return (
    <View
      className="rounded-xl overflow-hidden"
      onLayout={(e) => setAlto(e.nativeEvent.layout.height)}
      style={{
        flex: 1,
        maxHeight: 220,
        minHeight: 0,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: alto >= ALTO_MINIMO ? 0.08 : 0,
        shadowRadius: 8,
        elevation: alto >= ALTO_MINIMO ? 3 : 0,
      }}
    >
      {alto >= ALTO_MINIMO ? (
        <Image
          source={sosIlustracion}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}
