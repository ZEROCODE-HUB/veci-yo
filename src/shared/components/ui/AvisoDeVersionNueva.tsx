import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { COMMIT } from "@/shared/version/version.generado";
import { hayVersionNueva } from "@/shared/version/versionNueva";
import {
  aplicarActualizacionSiHay,
  reiniciarConActualizacion,
  useHayActualizacionLista,
} from "@/shared/services/actualizaciones";

const CADA_MS = 5 * 60_000;

/**
 * «Hay una versión nueva de Veciyo» con un botón para recargar (21/10/2026).
 *
 * En web pregunta por `/version.json` --lo escribe `scripts/generar-version.mjs`
 * al publicar-- al abrir, al volver a la pestaña y cada cinco minutos. Una
 * pestaña vieja tenía al tester probando arreglos que ya estaban publicados.
 *
 * En el celular (22/10/2026, actualizaciones OTA): al volver a la app se busca
 * una actualización y, si hay, la app se reinicia con ella sola. Si quedó una
 * descargada esperando (por ejemplo, la bajó el aviso «Veciyo se actualizó»),
 * sale el mismo aviso con «Reiniciar». También la descarga `AvisosPushDeLaSesion` al llegar el aviso
 * «Veciyo se actualizó».
 */
export function AvisoDeVersionNueva() {
  const [nueva, setNueva] = useState(false);
  const lista = useHayActualizacionLista();

  useEffect(() => {
    if (Platform.OS === "web") return;
    const s = AppState.addEventListener("change", (e) => {
      // Sin red, o sin nada nuevo, no hay nada que decir: se mira la próxima vez.
      if (e === "active") aplicarActualizacionSiHay().catch(() => {});
    });
    return () => s.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    let vigente = true;
    const mirar = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const publicada = await r.json();
        if (vigente && hayVersionNueva(COMMIT, publicada)) setNueva(true);
      } catch {
        // Sin red no se sabe; se vuelve a mirar en la siguiente.
      }
    };
    void mirar();
    const t = setInterval(() => void mirar(), CADA_MS);
    const s = AppState.addEventListener("change", (e) => {
      if (e === "active") void mirar();
    });
    return () => {
      vigente = false;
      clearInterval(t);
      s.remove();
    };
  }, []);

  if (!nueva && !lista) return null;

  return (
    <View
      className="absolute left-0 right-0 top-0 z-50 flex-row items-center justify-between gap-3 px-4 py-2.5"
      style={{ backgroundColor: theme.colors.secondaryDark }}
    >
      <Text className="flex-1 text-sm font-semibold text-white">
        Hay una versión nueva de Veciyo.
      </Text>
      <Pressable
        onPress={() => (lista ? void reiniciarConActualizacion() : globalThis.location?.reload())}
        accessibilityRole="button"
        className="rounded-lg bg-white px-3 py-1.5"
      >
        <Text className="text-sm font-bold" style={{ color: theme.colors.secondaryDark }}>
          {lista ? "Reiniciar" : "Recargar"}
        </Text>
      </Pressable>
    </View>
  );
}
