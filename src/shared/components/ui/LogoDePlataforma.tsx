import React from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOGOS } from "@/shared/constants";

/**
 * El logo oficial de Airbnb o de Booking (hueco 5, 21/10/2026: «usar logos
 * oficiales»). Los dibujos están en `logos.generado.ts`; se regeneran con
 * `npm run logos`.
 *
 * El tamaño va en `style`: React Native Web no dimensiona con clases
 * (AGENTS.md, «`<Image>` no se dimensiona con clases»).
 */
export function LogoDePlataforma({
  plataforma,
  /** El alto en píxeles; el ancho sale de la proporción del logo. */
  alto,
}: {
  plataforma: "airbnb" | "booking";
  alto: number;
}) {
  const logo = LOGOS[plataforma];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={plataforma === "airbnb" ? "Airbnb" : "Booking"}
      style={{ width: Math.round(alto * logo.proporcion), height: alto }}
    >
      <SvgXml xml={logo.svg} width="100%" height="100%" />
    </View>
  );
}
