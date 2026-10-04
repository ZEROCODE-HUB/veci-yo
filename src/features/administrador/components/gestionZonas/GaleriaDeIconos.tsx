import { theme } from "@/config";
import { Image, Pressable, Text, View } from "react-native";
import zonaIcons from "@/assets/icons/zonas";

/**
 * Los iconos entre los que el administrador puede elegir.
 *
 * Hasta el 03/10/2026 el icono de una zona salía de su **tipo**: dos zonas del
 * mismo tipo se veían idénticas --«BBQ terraza» y «BBQ jardín», el mismo
 * dibujo-- y una zona de un tipo que no estuviera en la lista se quedaba sin
 * ninguno. Los ocho dibujos existían en `assets` desde el principio y no había
 * forma de escogerlos.
 *
 * Lo pidió el cliente el 02/10/2026: una galería.
 *
 * Se guarda la **clave**, no la imagen. Así el dibujo se puede cambiar sin
 * tocar los datos, y la base no guarda una ruta de un archivo que viaja dentro
 * de la aplicación.
 */
const ICONOS: { clave: string; nombre: string }[] = [
  { clave: "piscina", nombre: "Piscina" },
  { clave: "parque", nombre: "Parque" },
  { clave: "bbq", nombre: "Parrilla" },
  { clave: "gym", nombre: "Gimnasio" },
  { clave: "coworking", nombre: "Coworking" },
  { clave: "tenis", nombre: "Tenis" },
  { clave: "sala-juegos", nombre: "Sala de juegos" },
  { clave: "lavanderia", nombre: "Lavandería" },
];

export function GaleriaDeIconos({
  value,
  onChange,
}: {
  /** La clave elegida, o vacío para que se deduzca del tipo, como antes. */
  value: string;
  onChange: (clave: string) => void;
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-500">Icono</Text>
      <Text className="mt-1 text-xs leading-5 text-gray-400">
        El que se ve en la lista de zonas. Si no eliges ninguno, se usa el que
        corresponda al tipo.
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2.5">
        {ICONOS.map((icono) => {
          const puesto = value === icono.clave;
          return (
            <Pressable
              key={icono.clave}
              accessibilityRole="radio"
              accessibilityLabel={`Icono de ${icono.nombre}`}
              /*
                Los dos: react-native-web no traduce `accessibilityState` a
                ningún atributo del DOM. Está documentado en `Checkbox.tsx` y
                ya mordió dos veces esta misma semana.
              */
              aria-checked={puesto}
              accessibilityState={{ checked: puesto }}
              onPress={() => onChange(puesto ? "" : icono.clave)}
              className="items-center justify-center rounded-xl border p-2"
              style={{
                width: 72,
                borderColor: puesto ? theme.colors.primary : theme.colors.borderLight,
                borderWidth: puesto ? 2 : 1,
                backgroundColor: puesto
                  ? theme.colors.primaryLight
                  : theme.colors.bgCard,
              }}
            >
              <Image
                source={(zonaIcons as Record<string, number>)[icono.clave]}
                // El tamaño va en `style`: react-native-web escribe el del
                // archivo como estilo en línea y una clase no lo gana.
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
              <Text
                className="mt-1 text-center text-[10px] text-gray-600"
                numberOfLines={1}
              >
                {icono.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
