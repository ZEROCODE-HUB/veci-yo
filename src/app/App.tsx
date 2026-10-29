import "../../global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { Providers } from "./providers";
import { releerAlVolverALaApp } from "./releerAlVolver";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ToastContainer } from "@/shared/components/ui/Toast";
import { AvisoDeVersionNueva } from "@/shared/components/ui/AvisoDeVersionNueva";
import { AvisosPushDeLaSesion } from "./AvisosPushDeLaSesion";
import { MonedasDeLaBase } from "./MonedasDeLaBase";
import { aplicarActualizacionSiHay } from "@/shared/services/actualizaciones";
import { ErrorBoundary } from "@/shared/components/ui/ErrorBoundary";
import { anotarErroresGlobales } from "./anotarErroresGlobales";

releerAlVolverALaApp();
anotarErroresGlobales();

/**
 * Lo más que se espera al abrir a que baje una actualización (OTA) antes de
 * enseñar la app con la que ya tiene. Sin red, o con una red mala, no puede
 * quedarse en la pantalla de carga.
 */
const ESPERA_ACTUALIZACION_MS = 8000;

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("@/assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("@/assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("@/assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("@/assets/fonts/Inter-Bold.ttf"),
    "Inter-ExtraBold": require("@/assets/fonts/Inter-ExtraBold.ttf"),
  });

  /*
    Al abrir, con la pantalla de carga todavía puesta: si hay una
    actualización se descarga y la app se reinicia con ella, así se ve lo
    nuevo a la primera (22/10/2026). Si no hay, o tarda más de la cuenta, se
    sigue con la que hay.
  */
  const [actualizacionMirada, setActualizacionMirada] = useState(false);
  useEffect(() => {
    const tope = new Promise<void>((resolver) => setTimeout(resolver, ESPERA_ACTUALIZACION_MS));
    Promise.race([aplicarActualizacionSiHay(), tope])
      .catch(() => {})
      .finally(() => setActualizacionMirada(true));
  }, []);

  const listo = fontsLoaded && actualizacionMirada;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <Providers>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ErrorBoundary donde="app">
        <RootNavigator />
      </ErrorBoundary>
      {/* Una sola vez, sobre todo el arbol: colgaba de `ScreenLayout`, asi que
          las pantallas que no lo usan (Cuadro de Honor, entre otras) llamaban a
          `addToast` y el aviso no se veia en ninguna parte. */}
      <ToastContainer />
      <AvisoDeVersionNueva />
      <AvisosPushDeLaSesion />
      <MonedasDeLaBase />
    </Providers>
  );
}
