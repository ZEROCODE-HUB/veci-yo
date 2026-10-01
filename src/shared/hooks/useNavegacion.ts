import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  AuthStackParamList,
  NavegacionApp,
  RootStackParamList,
} from "@/shared/types";

/**
 * Navegar, con las rutas comprobadas.
 *
 * Reemplaza a `useNavegacion()`, que estaba en 34 archivos: con `any`, el
 * nombre de la pantalla y sus parámetros no los comprobaba nadie, así que
 * `navigate("Pantalla")` mal escrito compilaba y fallaba al pulsar.
 *
 * Existe como hook propio para no repetir el genérico en cada pantalla: si
 * mañana cambia el tipo de la navegación, cambia aquí.
 */
export function useNavegacion() {
  return useNavigation<NativeStackNavigationProp<NavegacionApp>>();
}

/**
 * Los parámetros con los que se abrió esta pantalla.
 *
 * Se le dice de qué ruta se trata --`useParametros("ZonaDetalles")`-- y devuelve
 * lo que esa ruta declara en su `ParamList`, no un objeto sin forma.
 */
export function useParametros<Ruta extends keyof NavegacionApp>(
  ruta: Ruta,
): NavegacionApp[Ruta] {
  /*
    El nombre de la ruta no se usa en tiempo de ejecucion --`useRoute` ya sabe
    en cual esta-- pero es lo que elige el tipo, y hace que se lea en la
    pantalla de que ruta son los parametros que se estan pidiendo.
  */
  void ruta;
  return useRoute<RouteProp<NavegacionApp, Ruta>>()
    .params as NavegacionApp[Ruta];
}

/**
 * Navegar desde las pantallas de entrada: login, registro, invitación.
 *
 * Están **fuera** de los tres stacks de la aplicación, así que su navegación es
 * otra: van a las rutas de autenticación y a las de la raíz --`App`, que es el
 * salto a la aplicación una vez dentro--.
 *
 * Separado a propósito y no unido al resto: desde dentro de la aplicación no se
 * puede navegar a `Login`, y desde `Login` no se puede navegar a una pantalla
 * que exige sesión. Un solo tipo para todo lo permitiría y dejaría de avisar.
 */
export function useNavegacionEntrada() {
  return useNavigation<
    NativeStackNavigationProp<AuthStackParamList & RootStackParamList>
  >();
}
