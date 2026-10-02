import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PlataformaStackParamList } from "@/shared/types/navigation";

/**
 * Navegar dentro del panel de la plataforma.
 *
 * Propio, y **no** añadido a `NavegacionApp`: si las pantallas del panel
 * entraran en esa unión, cualquier pantalla de un edificio podría escribir
 * `navigate("PlataformaEquipo")` y compilaría. El tipo es lo que hace que el
 * límite entre los dos árboles no se cruce por descuido.
 */
export function useNavegacionPlataforma() {
  return useNavigation<NativeStackNavigationProp<PlataformaStackParamList>>();
}
