import "../../global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { Providers } from "./providers";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ToastContainer } from "@/shared/components/ui/Toast";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("@/assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("@/assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("@/assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("@/assets/fonts/Inter-Bold.ttf"),
    "Inter-ExtraBold": require("@/assets/fonts/Inter-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Providers>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <RootNavigator />
      {/* Una sola vez, sobre todo el arbol: colgaba de `ScreenLayout`, asi que
          las pantallas que no lo usan (Cuadro de Honor, entre otras) llamaban a
          `addToast` y el aviso no se veia en ninguna parte. */}
      <ToastContainer />
    </Providers>
  );
}
