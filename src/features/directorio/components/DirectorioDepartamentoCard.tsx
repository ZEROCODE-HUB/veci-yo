import { theme } from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { DirectorioContactos, Unidad } from "../types/directorio";
import { PAPEL_EN_LA_VIVIENDA } from "../helpers/contactos";
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
}: {
  item: Unidad;
  contactos: DirectorioContactos;
  /** Cuántos depósitos tiene esta vivienda. */
  depositos: number;
  /** Los de la vivienda y los de las visitas que están dentro. */
  vehiculos?: VehiculoDelDirectorio[];
  onPress: () => void;
}) {
  // Con copropietarios, todos; los nombres vienen completos de la base.
  const propietarios = contactos.personas
    .filter((p) => p.papel === PAPEL_EN_LA_VIVIENDA.propietario)
    .map((p) => p.nombre);
  const estacionamientos = item.codigosEstacionamiento ?? [];
  const propios = vehiculos.filter((v) => v.de === "residente").map((v) => v.placa);
  const deVisitas = vehiculos.filter((v) => v.de === "visita").map((v) => v.placa);

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
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <View className="flex-1" style={{ gap: 2 }}>
          <Text className="text-base font-bold text-gray-900">
            {`Torre ${item.torreNumero} · Depto ${item.codigo}`}
          </Text>
          <Text className="text-xs text-gray-500">{`Piso ${item.piso}`}</Text>
          <Text className="text-sm text-gray-900">
            {propietarios.length > 1
              ? `Propietarios: ${propietarios.join(", ")}`
              : `Propietario: ${propietarios[0] ?? "Sin asignar"}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
      {estacionamientos.length || depositos || vehiculos.length ? (
        <View className="flex-row flex-wrap" style={{ marginTop: 8, gap: 6 }}>
          {estacionamientos.length ? (
            <Etiqueta icono="car-outline">
              {`${estacionamientos.length === 1 ? "Estacionamiento" : "Estacionamientos"}: ${estacionamientos.join(", ")}`}
            </Etiqueta>
          ) : null}
          {depositos ? (
            <Etiqueta icono="cube-outline">
              {depositos === 1 ? "1 depósito" : `${depositos} depósitos`}
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
