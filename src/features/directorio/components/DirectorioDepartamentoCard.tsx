import { theme } from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { Tipologia, Unidad } from "../types/directorio";
import type { DirectorioContactos } from "../types/directorio";
export function DirectorioDepartamentoCard({
  item,
  tipologias,
  contactos,
  anfitrionPrimario,
  onPress,
}: {
  item: Unidad;
  tipologias: Tipologia[];
  contactos: DirectorioContactos;
  anfitrionPrimario?: string;
  onPress: () => void;
}) {
  const tipologia = tipologias.find((value) => value.id === item.tipologiaId);
  const tipologiaNombre =
    tipologia?.nombre === "Estandar" ? "Estándar" : tipologia?.nombre;
  /*
    El nombre sale de `contactos` --lo que trae la base-- y no de
    `propietarioAsignado`, que solo se rellena en memoria al asignar un
    propietario en esa misma sesion. La tarjeta decia «Propietario: —» arriba
    y, tres lineas mas abajo, «Propietario: Guillermo Provenzano»: el mismo
    campo dos veces, uno vacio y otro con el dato.

    Por lo mismo, el distintivo «Primario» no se encendia nunca.
  */
  const propietario = contactos.propietario.nombre;
  const esPrimario = Boolean(
    propietario && anfitrionPrimario && propietario === anfitrionPrimario,
  );
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        backgroundColor: theme.colors.bgCard,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        boxShadow: theme.shadows.card,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="text-sm font-bold text-gray-900">
            Torre {item.torreNumero} → Depto {item.codigo}{" "}
            {tipologiaNombre ? `(${tipologiaNombre})` : ""}
          </Text>
          <Text className="text-xs text-gray-500">
            Piso {item.piso} · {item.estado}
          </Text>
          <View className="flex-row flex-wrap items-center">
            <Text className="text-xs text-gray-500">
              Propietario: {propietario}
            </Text>
            {esPrimario ? (
              <View className="ml-1 rounded-full bg-primary-light px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-primary">
                  Primario
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      </View>
      <View
        style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}
      >
        <View
          className="rounded-full"
          style={{
            backgroundColor: theme.colors.borderLight,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text className="text-gray-500" style={{ fontSize: 10 }}>
            🏠 Estac: {item.estacionamientos ?? 0}
          </Text>
        </View>
        <View
          className="rounded-full"
          style={{
            backgroundColor: theme.colors.borderLight,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text className="text-gray-500" style={{ fontSize: 10 }}>
            📦 Depósitos asociados al depto
          </Text>
        </View>
      </View>
      <Text className="text-xs text-gray-500" style={{ marginTop: 8 }}>
        Propietario: {contactos.propietario.nombre} · Anfitrión primario:{" "}
        {contactos.anfitrion.nombre} · Admin: {contactos.administrador.nombre}
      </Text>
    </Pressable>
  );
}
