import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DepartamentoRentaCorta } from "../../types/reglas";

const iconDepartamento = require("@/assets/icons/inquilino-lider/reconocimiento-hero.png");
const iconRnt = require("@/assets/icons/shared/rnt.png");

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
        source={iconDepartamento}
        className="h-11 w-11 rounded-full"
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
            source={iconRnt}
            className="h-7 w-7 rounded-full"
            resizeMode="cover"
          />
          {(departamento.cumplimiento.antirruido ||
            departamento.cumplimiento.noFumar ||
            departamento.cumplimiento.sensor) && (
            <View className="flex-row gap-1">
              <Pressable
                onPress={onCompliance}
                className={`h-7 w-7 items-center justify-center rounded-full ${departamento.cumplimiento.antirruido ? "bg-green-100" : "bg-gray-100"}`}
              >
                <Text>🔇</Text>
              </Pressable>
              <Pressable
                onPress={onCompliance}
                className={`h-7 w-7 items-center justify-center rounded-full ${departamento.cumplimiento.noFumar ? "bg-green-100" : "bg-gray-100"}`}
              >
                <Text>🚭</Text>
              </Pressable>
              <Pressable
                onPress={onCompliance}
                className={`h-7 w-7 items-center justify-center rounded-full ${departamento.cumplimiento.sensor ? "bg-green-100" : "bg-gray-100"}`}
              >
                <Text>🔥</Text>
              </Pressable>
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
        onPress={onActions}
        className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#374151" />
      </Pressable>
    </View>
  );
}
