import { theme } from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { DirectorioContactos, Unidad } from "../types/directorio";
import { propietariosDe } from "../helpers/filtrosDelDirectorio";
import type { VehiculoDelDirectorio } from "../services/vehiculos.repo";

/**
 * Una vivienda en la lista del directorio.
 *
 * 10/11/2026, pedido del cliente («muy cargada»): solo el depto, el piso, el
 * propietario con su nombre completo y, si los tiene, sus estacionamientos y
 * depósitos. El resto de la gente y el estado están en el detalle, al tocarla.
 *
 * Los vehículos sí se quedan (el cliente, el mismo día: «si alguien busca una
 * placa debe ver a quién pertenece»), pero diciendo de quién son: antes salía
 * «🚗 1234» al lado de «Sin estacionamiento» y no se entendía que era el auto
 * de una visita que seguía dentro.
 */
export function DirectorioDepartamentoCard({
  item,
  contactos,
  depositos,
  vehiculos = [],
  onPress,
  marcada,
}: {
  item: Unidad;
  contactos: DirectorioContactos;
  /** Los códigos de los depósitos de esta vivienda. */
  depositos: string[];
  /** Los de la vivienda y los de las visitas que están dentro. */
  vehiculos?: VehiculoDelDirectorio[];
  /** Al tocarla: abre el detalle o, seleccionando, la marca o desmarca. */
  onPress: () => void;
  /**
   * Solo mientras la administración selecciona viviendas para un mensaje
   * (16/11/2026): la casilla y si está puesta. Sin esto, no hay casilla.
   */
  marcada?: boolean;
}) {
  // Con copropietarios, todos; los nombres vienen completos de la base.
  const propietarios = propietariosDe(contactos);
  const seleccionando = marcada !== undefined;
  // Con su nivel al lado, «S1-03 · Sótano 1» (16/11/2026).
  const estacionamientos = (item.codigosEstacionamiento ?? []).map((c, i) =>
    item.nivelesEstacionamiento?.[i] ? `${c} · ${item.nivelesEstacionamiento[i]}` : c,
  );
  const propios = vehiculos.filter((v) => v.de === "residente").map((v) => v.placa);
  const deVisitas = vehiculos.filter((v) => v.de === "visita").map((v) => v.placa);

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      accessibilityRole={seleccionando ? "checkbox" : "button"}
      accessibilityLabel={`Torre ${item.torreNumero} · Depto ${item.codigo}`}
      accessibilityState={seleccionando ? { checked: marcada } : undefined}
      aria-checked={seleccionando ? marcada : undefined}
      style={{
        backgroundColor: theme.colors.bgCard,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        boxShadow: theme.shadows.card,
      }}
    >
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        {seleccionando ? (
          <Ionicons
            name={marcada ? "checkbox" : "square-outline"}
            size={24}
            color={marcada ? theme.colors.primary : theme.colors.textMuted}
          />
        ) : null}
        <View className="flex-1" style={{ gap: 2 }}>
          <Text className="text-base font-bold text-gray-900">
            {`Torre ${item.torreNumero} · Depto ${item.codigo}`}
          </Text>
          <Text className="text-xs text-gray-500">{`Piso ${item.piso}`}</Text>
          {propietarios.length ? (
            <Text className="text-sm text-gray-900">
              {propietarios.length > 1
                ? `Propietarios: ${propietarios.join(", ")}`
                : `Propietario: ${propietarios[0]}`}
            </Text>
          ) : (
            /*
              En rojo, para que salte a la vista (16/11/2026, cliente: «poner
              indicador rojo para Propietarios: Sin Asignar»). Era el mismo
              texto gris que un nombre.
            */
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Text className="text-sm text-gray-900">Propietario:</Text>
              <View
                className="rounded-full"
                style={{ backgroundColor: theme.colors.dangerLight, paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <Text className="text-xs font-semibold" style={{ color: theme.colors.dangerDark }}>
                  Sin asignar
                </Text>
              </View>
            </View>
          )}
        </View>
        {seleccionando ? null : (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        )}
      </View>
      {estacionamientos.length || depositos.length || vehiculos.length ? (
        <View className="flex-row flex-wrap" style={{ marginTop: 8, gap: 6 }}>
          {estacionamientos.length ? (
            <Etiqueta icono="car-outline">
              {`${estacionamientos.length === 1 ? "Estacionamiento" : "Estacionamientos"}: ${estacionamientos.join(", ")}`}
            </Etiqueta>
          ) : null}
          {depositos.length ? (
            <Etiqueta icono="cube-outline">
              {`${depositos.length === 1 ? "Depósito" : "Depósitos"}: ${depositos.join(", ")}`}
            </Etiqueta>
          ) : null}
          {propios.length ? (
            <Etiqueta icono="car-sport-outline">{`Vehículo de la vivienda: ${propios.join(", ")}`}</Etiqueta>
          ) : null}
          {deVisitas.length ? (
            <Etiqueta icono="car-sport-outline">{`Vehículo de visita dentro: ${deVisitas.join(", ")}`}</Etiqueta>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function Etiqueta({
  icono,
  children,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  children: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ backgroundColor: theme.colors.borderLight, paddingHorizontal: 8, paddingVertical: 2, gap: 4 }}
    >
      <Ionicons name={icono} size={12} color={theme.colors.textSecondary} />
      <Text className="text-2xs text-gray-500">{children}</Text>
    </View>
  );
}
