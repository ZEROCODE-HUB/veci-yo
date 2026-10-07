import { theme } from "@/config";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DepartamentoRentaCorta } from "../../types/reglas";

const iconDepartamento = require("@/assets/icons/inquilino-lider/reconocimiento-hero.png");
const iconRnt = require("@/assets/icons/shared/rnt.png");

/**
 * Uno de los tres iconos de equipamiento.
 *
 * Tres estados, no dos (REVISAR-A-OJO 174): gris «no lo tiene», ámbar «lo dice
 * el anfitrión» y verde «el edificio lo comprobó». Antes el verde era para
 * cualquier casilla encendida, así que una declaración del interesado se leía
 * igual que una comprobación del edificio.
 *
 * El nombre accesible dice **cuál de los tres es**: el color es el único
 * indicio y quien no lo ve se queda sin saberlo.
 */
function ReglaEquipamientoChip({
  etiqueta,
  icono,
  declarado,
  verificada,
  onPress,
}: {
  etiqueta: string;
  icono: string;
  declarado: boolean;
  verificada: boolean;
  onPress: () => void;
}) {
  const estado = !declarado
    ? "no lo tiene"
    : verificada
      ? "comprobado por el edificio"
      : "declarado por el anfitrión, sin comprobar";
  const fondo = !declarado
    ? "bg-gray-100"
    : verificada
      ? "bg-green-100"
      : "bg-amber-100";

  return (
    <Pressable
      accessibilityLabel={`${etiqueta}: ${estado}`}
      onPress={onPress}
      className={`h-7 w-7 items-center justify-center rounded-full ${fondo}`}
    >
      <Text>{icono}</Text>
    </Pressable>
  );
}

function ReglaContactoMark({ complete }: { complete: boolean }) {
  return (
    <Text
      className={`font-bold ${complete ? "text-green-600" : "text-red-500"}`}
    >
      {complete ? "✓" : "✕"}
    </Text>
  );
}

export function ReglaDepartamentoCard({
  departamento,
  onActions,
  onCompliance,
}: {
  departamento: DepartamentoRentaCorta;
  onActions: () => void;
  onCompliance: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
      <Image
        style={{ height: 44, width: 44 }}
        source={iconDepartamento}
        className="rounded-full"
        resizeMode="cover"
      />
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900">
          {departamento.ocultarNumero
            ? "Departamento (oculto)"
            : departamento.departamento}
        </Text>
        <Text className="text-xs leading-5 text-gray-500">
          Anfitrión: {departamento.anfitrion}{" "}
          <ReglaContactoMark complete={!!departamento.telAnfitrion} />
          {`\n`}Administrador: {departamento.administrador}{" "}
          <ReglaContactoMark complete={!!departamento.telAdmin} />
          {`\n`}Propietario: {departamento.propietario}{" "}
          <ReglaContactoMark complete={!!departamento.telPropietario} />
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Image
            style={{ height: 28, width: 28 }}
            source={iconRnt}
            className="rounded-full"
            resizeMode="cover"
          />
          {(departamento.cumplimiento.antirruido ||
            departamento.cumplimiento.noFumar ||
            departamento.cumplimiento.sensor) && (
            <View className="flex-row gap-1">
              <ReglaEquipamientoChip
                etiqueta="Antirruido"
                icono="🔇"
                declarado={departamento.cumplimiento.antirruido}
                verificada={!!departamento.verificadaEn}
                onPress={onCompliance}
              />
              <ReglaEquipamientoChip
                etiqueta="No fumar"
                icono="🚭"
                declarado={departamento.cumplimiento.noFumar}
                verificada={!!departamento.verificadaEn}
                onPress={onCompliance}
              />
              <ReglaEquipamientoChip
                etiqueta="Sensor de humo"
                icono="🔥"
                declarado={departamento.cumplimiento.sensor}
                verificada={!!departamento.verificadaEn}
                onPress={onCompliance}
              />
            </View>
          )}
          {departamento.mascotas && (
            <View className="rounded-full bg-green-50 px-2 py-1">
              <Text className="text-[10px] text-green-700">🐾 Mascotas</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable
        accessibilityLabel="Opciones de esta vivienda"
        onPress={onActions}
        className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
      >
        <Ionicons
          name="ellipsis-vertical"
          size={18}
          color={theme.colors.textStrong}
        />
      </Pressable>
    </View>
  );
}
