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

  La segunda linea decia «Alias: Torre 1 · 102». No era un alias: nadie lo
  escribio, lo compone `sesion.ts` con la torre y el codigo. El nombre venia del
  prototipo, donde esto era una libreta de direcciones personales --«Casa
  Amorcito», «Casa Mama»-- y uno les ponia el mote que queria.

  Ahora esa promesa se cumple de verdad: el lapiz pone un **apodo**, que se
  guarda en la membresia de esta persona --`membresia_unidad.apodo`-- y por eso
  es suyo: quien comparta la vivienda puede llamarla de otra forma. Este lapiz
  si escribe en la base.
*/
export function UbicacionCard({
  ubicacion,
  esGuardia,
  onFavorito,
  onPonerNombre,
}: UbicacionAccionProps) {
  const apodo = ubicacion.apodo?.trim() || "";
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
        <Text
          className={
            apodo
              ? "flex-1 text-sm font-medium text-gray-900"
              : "flex-1 text-sm text-gray-500"
          }
          numberOfLines={1}
        >
          {esGuardia ? nombre : apodo || ubicacion.alias}
        </Text>
        {!esGuardia && onPonerNombre && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              apodo ? "Cambiar el nombre que le diste" : "Ponle nombre"
            }
            onPress={() => onPonerNombre(ubicacion)}
            className="p-0.5"
          >
            <Text style={{ fontSize: 16, color: theme.colors.textMuted }}>
              ✏️
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
