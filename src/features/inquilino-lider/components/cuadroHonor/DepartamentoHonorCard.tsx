import { View, Text, Pressable, Image } from "react-native";
import type { DepartamentoCuadroHonor, InsigniaVecino } from "../../types";

const iconDepartamento = require("@/assets/icons/inquilino-lider/reconocimiento-hero.png");

interface DepartamentoHonorCardProps {
  departamento: DepartamentoCuadroHonor;
  insignias: InsigniaVecino[];
  puedeParticipar: boolean;
  onReconocer: (nombre: string) => void;
}

export function DepartamentoHonorCard({
  departamento,
  insignias,
  puedeParticipar,
  onReconocer,
}: DepartamentoHonorCardProps) {
  return (
    <View
      className="bg-white rounded-xl p-3.5 gap-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="rounded-full overflow-hidden items-center justify-center"
          style={{ width: 44, height: 44, backgroundColor: "#F9FAFB" }}
        >
          <Image
            source={iconDepartamento}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {departamento.departamento}
          </Text>
          <Text className="text-sm text-gray-500">
            Responsable: {departamento.responsable}
          </Text>
        </View>
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7" }}>
          <Text className="text-2xs font-semibold" style={{ color: "#16A34A" }}>
            Al día
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1.5 flex-wrap">
        {insignias.map((insignia) => (
          <View
            key={insignia.key}
            className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#F3F4F6" }}
          >
            <Text className="text-2xs text-gray-500">
              {insignia.icono} {insignia.cantidad}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row justify-end">
        {puedeParticipar && (
          <Pressable
            onPress={() => onReconocer(departamento.responsable)}
            className="items-center justify-center rounded-full"
            style={{ width: 36, height: 36, backgroundColor: "#FFF8E1" }}
          >
            <Text style={{ fontSize: 18 }}>🎁</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

