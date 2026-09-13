import { View, Text, Image } from "react-native";
import type { Ubicacion } from "@/shared/types";
import type { Unidad } from "@/stores/admin-store";

const iconVivienda = require("@/assets/icons/home/vivienda.png");

interface AlojamientoHeroProps {
  ubicacion?: Ubicacion;
  unidad?: Unidad;
  descripcion: string;
}

export function AlojamientoHero({
  ubicacion,
  unidad,
  descripcion,
}: AlojamientoHeroProps) {
  return (
    <View
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        backgroundColor: "#F5B800",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <View
        className="absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          top: -20,
          right: -20,
          backgroundColor: "rgba(255,255,255,0.18)",
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          width: 90,
          height: 90,
          bottom: -30,
          left: -10,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      />
      <View className="flex-row gap-3.5 items-center relative">
        <View
          className="items-center justify-center rounded-full overflow-hidden flex-shrink-0"
          style={{
            width: 72,
            height: 72,
            borderWidth: 3,
            borderColor: "#fff",
            backgroundColor: "#fff",
          }}
        >
          <Image
            source={iconVivienda}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900 leading-tight">
            Bienvenido a {ubicacion?.alias || "tu alojamiento"} ✨
          </Text>
          <Text className="text-sm text-gray-600 mt-1 leading-5">
            {ubicacion?.direccion ||
              "Tu hogar temporal, preparado con dedicación por el propietario"}
          </Text>
          {ubicacion?.alias && (
            <View
              className="mt-2 rounded-full self-start"
              style={{
                backgroundColor: "#fff",
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text className="text-xs font-semibold text-gray-900">
                🏠 {ubicacion.alias}
                {unidad ? ` · Torre ${unidad.torreNumero} · Piso ${unidad.piso}` : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
      {descripcion ? (
        <View
          className="relative mt-3.5 p-3 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.92)" }}
        >
          <Text className="text-sm text-gray-900 leading-6">{descripcion}</Text>
        </View>
      ) : null}
    </View>
  );
}

