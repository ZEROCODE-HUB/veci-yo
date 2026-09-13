import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore } from "@/stores";
import { Select, Input, Button, Modal } from "@/shared/components";
import type { PerfilStackParamList } from "@/shared/types";
import { useReclamos } from "../hooks/useReclamos";

type RouteProps = RouteProp<PerfilStackParamList, "ReclamoDetalle">;

const ESTADOS_ADMIN = ["Pendiente", "En curso", "Resuelto"];

export function ReclamoDetalleScreen() {
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const { rolActivo } = useAuthStore();
  const { reclamos, cambiarEstado, resolver } = useReclamos();

  const reclamo = reclamos.find((r) => String(r.id) === id);
  const esAdmin = rolActivo === "administrador";

  const [resolucionOpen, setResolucionOpen] = useState(false);
  const [mensajeResolucion, setMensajeResolucion] = useState("");

  // Auto-advance Pendiente → En curso for admin
  useEffect(() => {
    if (esAdmin && reclamo && reclamo.estado === "Pendiente") {
      resolver.mutate({
        id: reclamo.id,
        estado: "En curso",
        mensaje: "Su PQRS está siendo revisado",
      });
    }
  }, [esAdmin, reclamo?.id, reclamo?.estado]);

  if (!reclamo) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-base text-gray-500">No se encontró el PQRS.</Text>
      </View>
    );
  }

  const handleEstadoChange = (estado: string) => {
    if (!estado) return;
    if (reclamo.estado === "Resuelto") return;
    if (estado === "Resuelto") {
      setResolucionOpen(true);
      return;
    }
    cambiarEstado.mutate({ id: reclamo.id, estado });
  };

  const handleResolver = () => {
    if (!mensajeResolucion.trim()) return;
    resolver.mutate({
      id: reclamo.id,
      estado: "Resuelto",
      mensaje: mensajeResolucion.trim(),
    });
    setResolucionOpen(false);
    setMensajeResolucion("");
  };

  const estadoColor = reclamo.estado === "Resuelto" ? "#DCFCE7" : "#FEF9C3";
  const estadoTextColor = reclamo.estado === "Resuelto" ? "#16A34A" : "#92400E";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {/* Card principal */}
      <View
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className="text-sm text-gray-500 mb-2.5">PQRS</Text>

        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Título
        </Text>
        <Text className="text-base text-gray-900 mb-4">{reclamo.titulo}</Text>

        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Descripción:
        </Text>
        <Text className="text-base text-gray-900">{reclamo.descripcion}</Text>

        {reclamo.resolucionAdmin && (
          <>
            <Text className="text-sm font-bold text-gray-900 underline mt-4 mb-1.5">
              Resolución:
            </Text>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: "#F0FDF4" }}
            >
              <Text className="text-base text-gray-900">
                {reclamo.resolucionAdmin}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Estado */}
      <View className="gap-2 items-center">
        {esAdmin ? (
          <Select
            label="Estado del PQRS"
            value={reclamo.estado}
            options={ESTADOS_ADMIN}
            onChange={(estado) => handleEstadoChange(String(estado))}
            placeholder="Seleccionar estado"
          />
        ) : (
          <View className="items-center gap-2">
            <Text className="text-sm font-bold text-gray-900 underline">
              ESTADO
            </Text>
            <View
              className="px-6 py-2 rounded-full"
              style={{ backgroundColor: estadoColor }}
            >
              <Text
                className="font-semibold text-sm"
                style={{ color: estadoTextColor }}
              >
                {reclamo.estado}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Fechas */}
      <View className="flex-row justify-between px-2">
        <Text className="text-sm text-gray-500">{reclamo.fechaCreacion}</Text>
        <Text className="text-sm text-gray-500">{reclamo.fechaRevision}</Text>
      </View>

      <Modal
        visible={resolucionOpen}
        onClose={() => setResolucionOpen(false)}
        title="Resolver PQRS"
      >
        <View className="gap-4">
          <Input
            label="Mensaje de resolución*"
            value={mensajeResolucion}
            onChangeText={setMensajeResolucion}
            placeholder="Describa cómo se resolvió el reclamo..."
            multiline
          />
          <Button variant="primary" fullWidth onPress={handleResolver}>
            Marcar como Resuelto
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
