import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";

export interface OpcionEnTarjeta<T extends string> {
  valor: T;
  titulo: string;
  /** Una línea que explica qué pasa si se elige. */
  detalle: string;
  /** En gris y sin poder elegirse; el detalle dice por qué (18/11/2026). */
  deshabilitada?: boolean;
}

/**
 * Elegir una entre pocas opciones, cada una con su explicación debajo.
 *
 * Para las reglas de una encuesta (17/11/2026): «Una vez por vivienda» o
 * «Cada residente» no se entiende con un botón de dos palabras; hace falta
 * decir qué cambia. Son excluyentes, así que van como `radio`, con
 * `aria-checked` además de `accessibilityState` (react-native-web no traduce
 * el segundo; ver AGENTS.md).
 */
export function EleccionEnTarjetas<T extends string>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: OpcionEnTarjeta<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <View className="gap-2" accessibilityRole="radiogroup">
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        const deshabilitada = opcion.deshabilitada === true;
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="radio"
            accessibilityLabel={opcion.titulo}
            accessibilityState={{ checked: elegida, disabled: deshabilitada }}
            aria-checked={elegida}
            aria-disabled={deshabilitada}
            disabled={deshabilitada}
            onPress={() => {
              if (!deshabilitada) onCambiar(opcion.valor);
            }}
            className="flex-row items-start gap-3 rounded-xl p-3"
            style={{
              borderWidth: 1.5,
              borderColor: elegida ? theme.colors.primary : theme.colors.border,
              backgroundColor: elegida ? theme.colors.primaryLight : theme.colors.bgCard,
              opacity: deshabilitada ? 0.6 : 1,
            }}
          >
            <View
              className="mt-0.5 items-center justify-center rounded-full"
              style={{
                width: 18,
                height: 18,
                borderWidth: 2,
                borderColor: elegida ? theme.colors.primaryDark : theme.colors.borderStrong,
              }}
            >
              {elegida ? (
                <View
                  className="rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: theme.colors.primaryDark }}
                />
              ) : null}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold text-gray-900">{opcion.titulo}</Text>
              <Text className="text-xs leading-4 text-gray-500">{opcion.detalle}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
