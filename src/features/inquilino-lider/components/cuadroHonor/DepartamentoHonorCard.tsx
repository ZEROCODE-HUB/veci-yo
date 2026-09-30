import { theme } from "@/config";
import { View, Text, Pressable, Image } from "react-native";
import type { UnidadCuadroHonor } from "../../services/cuadroHonor.repo";
import type { DestinatarioReconocimiento } from "../../hooks/useCuadroHonor";

const iconDepartamento = require("@/assets/icons/inquilino-lider/reconocimiento-hero.png");

interface DepartamentoHonorCardProps {
  departamento: UnidadCuadroHonor;
  puedeParticipar: boolean;
  onReconocer: (destinatario: DestinatarioReconocimiento) => void;
}

export function DepartamentoHonorCard({
  departamento,
  puedeParticipar,
  onReconocer,
}: DepartamentoHonorCardProps) {
  // Solo se puede reconocer a quien tiene cuenta: el reconocimiento se guarda
  // contra `auth.users`, no contra un nombre.
  const reconocible = puedeParticipar && !!departamento.responsableUsuarioId;

  return (
    <View
      className="bg-white rounded-xl p-3.5 gap-3"
      style={{
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="rounded-full overflow-hidden items-center justify-center"
          style={{ width: 44, height: 44, backgroundColor: theme.colors.bgMuted }}
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
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: theme.colors.successLight }}
        >
          <Text
            className="text-2xs font-semibold"
            style={{ color: theme.colors.success }}
          >
            Al día
          </Text>
        </View>
      </View>

      {/*
        Las insignias, una por una, como en el diseño original: «🤝 2 · ♻️ 1»
        dice qué clase de vecino es, y «🏅 3» --la suma, que es lo que había--
        no dice nada. Solo salen las que tiene: el prototipo pintaba las cinco
        del catálogo aunque estuvieran a cero, y eso son cuatro etiquetas vacías
        por vivienda.
      */}
      <View className="flex-row items-center gap-1.5 flex-wrap">
        {departamento.insigniasDetalle.length > 0 ? (
          departamento.insigniasDetalle.map((insignia) => (
            <View
              key={insignia.clave}
              accessibilityLabel={`${insignia.etiqueta}: ${insignia.cantidad}`}
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: theme.colors.borderLight }}
            >
              <Text className="text-2xs text-gray-500">
                {insignia.icono} {insignia.cantidad}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-2xs" style={{ color: theme.colors.textMuted }}>
            Aún sin reconocimientos
          </Text>
        )}
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: theme.colors.borderLight }}
        >
          <Text className="text-2xs text-gray-500">
            Cuotas {departamento.contador}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-end">
        {reconocible && (
          <Pressable
            accessibilityLabel="Reconocer a esta vivienda"
            onPress={() =>
              onReconocer({
                usuarioId: departamento.responsableUsuarioId,
                nombre: departamento.responsable,
              })
            }
            className="items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              backgroundColor: theme.colors.primaryLight,
            }}
          >
            <Text style={{ fontSize: 18 }}>🎁</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
