import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button } from "@/shared/components";
import { FotoDeZona } from "@/features/zonas/components/FotoDeZona";
import type { GestionZona } from "@/stores/zonas-store";
import { ETIQUETA_TIPO_ZONA } from "../../types/gestionZona";
import { formatAmount } from "@/shared/utils";
import { useNavegacion } from "@/shared/hooks";

/*
  Este mapa traducia cada valor a si mismo, en ingles, con los nombres del
  prototipo. La etiqueta sale ahora del mismo sitio que las opciones del
  formulario, para que no vuelvan a separarse.
*/

export function GestionZonasList({
  zonas,
  onEdit,
  onDelete,
}: {
  zonas: GestionZona[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigation = useNavegacion();

  return (
    <View className="gap-3.5">
      {zonas.map((zona) => (
        /*
          La tarjeta entera abría la edición y «Ver reservas» estaba escondido
          en un menú de tres puntos dentro de ella: al buscarlo se acababa
          editando la zona (Para Claude, 20/10/2026). Ahora la tarjeta no
          hace nada al tocarla y las dos acciones están a la vista.
        */
        <View
          key={zona.id}
          className="bg-white rounded-xl overflow-hidden"
          style={{
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <FotoDeZona
            imagen={zona.imagen}
            icono={zona.emoji}
            nombre={zona.nombre}
            alto={140}
          />

          <View className="px-4 py-3.5 gap-2">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {zona.nombre}
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  {ETIQUETA_TIPO_ZONA[zona.tipo] || zona.tipo}
                </Text>
              </View>
              <Badge status={zona.activa ? "Activa" : "Inactiva"} />
            </View>

            <View className="flex-row flex-wrap items-center gap-3">
              <Text className="text-xs text-gray-400">
                🕐 {zona.horarioApertura} - {zona.horarioCierre}
              </Text>
              {/*
                Con etiqueta, y los dos importes. Antes se pintaba solo la
                garantia con un icono de dinero y sin decir que era: la
                piscina salia como «COP 50.000» --que es el deposito-- y
                reservarla cuesta 30.000. Quien administra el edificio leia
                un precio que no es el precio.
              */}
              {zona.costoReserva > 0 && (
                <Text className="text-xs text-gray-400">
                  Reserva {zona.moneda} {formatAmount(zona.costoReserva)}
                </Text>
              )}
              {zona.montoGarantia > 0 && (
                <Text className="text-xs text-gray-400">
                  Garantía {zona.moneda} {formatAmount(zona.montoGarantia)}
                </Text>
              )}
            </View>

            <View className="flex-row items-center gap-2 mt-1">
              <Button
                variant="primary"
                size="sm"
                style={{ flex: 1 }}
                onPress={() =>
                  navigation.navigate("GestionZonaReservas", { id: zona.id })
                }
              >
                Ver reservas
              </Button>
              <Button
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => onEdit(zona.id)}
              >
                Editar
              </Button>
              <Pressable
                onPress={() => onDelete(zona.id)}
                className="p-2 rounded-full items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${zona.nombre}`}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.danger}
                />
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
