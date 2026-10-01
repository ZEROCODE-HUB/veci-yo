import { theme } from "@/config";
import { View, Text, Pressable } from "react-native";
import type { UbicacionAccionProps } from "../../types";

/*
  La tarjeta tenia un lapiz y una papelera. Los dos llamaban a un servicio del
  prototipo --`SIMULATED_REQUEST_DELAY`, 150 ms y un almacen en memoria-- que
  nunca tocaba la base: la papelera borraba de la lista la vivienda donde uno
  vive, decia «Ubicacion eliminada», y al recargar volvia a estar.

  Y no es solo que fingieran: ninguna de las dos acciones le corresponde a un
  residente. Una vivienda la da de alta la administracion y uno entra a ella
  por invitacion; nadie se borra su propia casa del edificio.

  La segunda linea decia «Alias: Torre 1 · 102». No es un alias: nadie lo
  escribio. `sesion.ts` lo compone con la torre y el codigo de la unidad. El
  nombre venia del prototipo, donde esto era una libreta de direcciones
  personales --«Casa Amorcito», «Casa Mama»-- y uno les ponia el mote que
  queria. Al conectar la sesion el campo paso a guardar la vivienda, y la
  etiqueta se quedo prometiendo algo que ya no existe.
*/
export function UbicacionCard({
  ubicacion,
  esGuardia,
  onFavorito,
}: UbicacionAccionProps) {
  const nombre = esGuardia
    ? `Guardia de seguridad: ${ubicacion.alias || ubicacion.direccion}`
    : ubicacion.direccion;

  return (
    <View
      className="bg-white rounded-xl overflow-hidden"
      style={{
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="flex-row items-center gap-2.5 px-4 py-3.5"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderLight,
        }}
      >
        <Text style={{ fontSize: 18 }}>🏠</Text>
        <Text
          className="flex-1 text-base font-medium text-gray-900"
          numberOfLines={1}
        >
          {nombre}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            ubicacion.favorito
              ? "Esta es la vivienda que estás viendo"
              : "Ver esta vivienda"
          }
          onPress={() => onFavorito(ubicacion.id)}
          className="p-0.5"
        >
          <Text
            style={{
              fontSize: 18,
              color: ubicacion.favorito
                ? theme.colors.primary
                : theme.colors.textMuted,
            }}
          >
            {ubicacion.favorito ? "★" : "☆"}
          </Text>
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2.5 px-4 py-3.5">
        <Text style={{ fontSize: 18 }}>🏷️</Text>
        <Text className="flex-1 text-sm text-gray-500" numberOfLines={1}>
          {esGuardia ? nombre : ubicacion.alias}
        </Text>
      </View>
    </View>
  );
}
