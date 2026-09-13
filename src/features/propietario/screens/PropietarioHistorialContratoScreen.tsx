import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "@/shared/components";
import { ContratoCard, type ContratoResumen } from "../components/contratos";

const CONTRATOS: ContratoResumen[] = [
  {
    id: 1,
    numero: "16548",
    estado: "Activa",
    rango: "01/12/2025 a 15/01/2026",
    fechaInicio: "21/12/2025",
    fechaFin: "21/12/2028",
  },
  {
    id: 2,
    numero: "16548",
    estado: "Finalizado",
    rango: "01/12/2024 a 15/01/2025",
    fechaInicio: "21/12/2024",
    fechaFin: "21/12/2025",
  },
];
const CONTRACT_TEXT = `Los términos y condiciones de un contrato de alquiler entre un inquilino y un propietario regulan los derechos y obligaciones de ambas partes.
Derechos del inquilino
· Vivir en paz y sin interrupciones, lo que se conoce como "uso tranquilo"
· Quejarse con el propietario si otros inquilinos lo molestan
· Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento
Obligaciones del inquilino
· Pagar la renta y otros gastos pactados en tiempo y forma
· Cuidar y mantener el inmueble
· Permitir el acceso al propietario para reparaciones
· No realizar obras sin consentimiento
· Respetar las normas de la comunidad
· Devolver el inmueble en buen estado
Plazos del contrato
· El plazo máximo de contrato es de 20 años para viviendas y 50 años para otros inmuebles
· Si no se estableció un plazo y se alquila el inmueble para vivienda permanente, se entiende que el contrato dura 2 años`;

export function PropietarioHistorialContratoScreen() {
  const [contratoActivo, setContratoActivo] = useState<ContratoResumen | null>(
    null,
  );
  const [showDescargar, setShowDescargar] = useState(false);
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      {CONTRATOS.map((contrato) => (
        <ContratoCard
          key={contrato.id}
          contrato={contrato}
          onPress={() => setContratoActivo(contrato)}
        />
      ))}
      <View className="h-6" />
      <Modal
        visible={!!contratoActivo && !showDescargar}
        onClose={() => setContratoActivo(null)}
        title={contratoActivo ? `Contrato N°: ${contratoActivo.numero}` : ""}
        headerAction={
          <Pressable
            onPress={() => setShowDescargar(true)}
            className="w-[34px] h-[34px] rounded-lg items-center justify-center"
            style={{ backgroundColor: "#F5B800" }}
          >
            <Ionicons name="download" size={16} color="#111827" />
          </Pressable>
        }
      >
        {contratoActivo && (
          <View className="flex-col gap-3">
            <View className="flex-row justify-between">
              <Text className="text-xs" style={{ color: "#6B7280" }}>
                Fecha inicio: {contratoActivo.fechaInicio}
              </Text>
              <Text className="text-xs" style={{ color: "#6B7280" }}>
                Fecha fin: {contratoActivo.fechaFin}
              </Text>
            </View>
            <ScrollView
              className="rounded-xl p-3 max-h-[300px]"
              style={{ backgroundColor: "#F2F2F7" }}
            >
              <Text
                className="text-sm text-gray-900"
                style={{ lineHeight: 22 }}
              >
                {CONTRACT_TEXT}
              </Text>
            </ScrollView>
          </View>
        )}
      </Modal>
      <Modal
        visible={showDescargar}
        onClose={() => setShowDescargar(false)}
        title="Descargar Contrato"
      >
        <View className="flex-col items-center gap-5 py-2">
          <Text className="text-base font-semibold text-gray-900 text-center">
            Descarga existosa del contrato N°:{contratoActivo?.numero}
          </Text>
          <View className="flex-col items-center gap-1.5">
            <Ionicons name="document-text-outline" size={36} color="#6B7280" />
            <Text className="text-sm" style={{ color: "#6B7280" }}>
              ContratoN{contratoActivo?.numero}.pdf
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
