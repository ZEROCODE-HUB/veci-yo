import { Text, View } from "react-native";

/**
 * De quién es la reserva que se está editando.
 *
 * Aquí había dos campos editables —un selector con tres residentes escritos a
 * mano y una caja de texto libre, las dos atadas a la misma clave del
 * formulario— para "cambiar" el residente. Quien reserva es una clave foránea
 * y no se reasigna desde aquí; el propio archivo ya lo decía en `saveEdit`.
 * Así que se muestra, no se pide.
 */

interface Props {
  solicitante?: string;
  depto?: string;
}

export function ReservaDeQuien({ solicitante, depto }: Props) {
  return (
    <View className="gap-1 rounded-xl bg-gray-100 p-3">
      <Text className="text-xs uppercase tracking-wide text-gray-500">
        Reserva de
      </Text>
      <Text className="text-base font-semibold text-gray-900">
        {solicitante ?? "—"}
      </Text>
      {depto ? (
        <Text className="text-sm text-gray-500">{depto}</Text>
      ) : null}
    </View>
  );
}
