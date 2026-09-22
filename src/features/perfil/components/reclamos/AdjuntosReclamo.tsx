import React from "react";
import { View, Text, Pressable, Image, Linking } from "react-native";
import { theme } from "@/config";
import { useAdjuntosReclamo } from "../../hooks/useAdjuntosReclamo";

const iconAdjuntarDocumento = require("@/assets/icons/shared/adjuntar-documento.png");
const iconAdjuntarImagen = require("@/assets/icons/shared/adjuntar-imagen.png");

interface Props {
  reclamoId: string;
  /** Quien no abrió la PQRS puede verlos, pero no agregar ni quitar. */
  puedeEditar: boolean;
}

export function AdjuntosReclamo({ reclamoId, puedeEditar }: Props) {
  const { adjuntos, agregarDocumento, agregarImagen, quitar, subiendo, abrir } =
    useAdjuntosReclamo(reclamoId);

  const acciones = [
    {
      key: "documento",
      label: "Adjuntar Documento",
      icon: iconAdjuntarDocumento,
      onPress: agregarDocumento,
    },
    {
      key: "imagen",
      label: "Adjuntar Imagen",
      icon: iconAdjuntarImagen,
      onPress: agregarImagen,
    },
  ];

  return (
    <View className="gap-3">
      <Text className="text-sm font-bold text-gray-900 underline">
        Adjuntos
      </Text>

      {adjuntos.length === 0 && (
        <Text className="text-sm text-gray-400">
          {puedeEditar
            ? "Todavía no adjuntaste nada."
            : "No hay archivos adjuntos."}
        </Text>
      )}

      {adjuntos.map((adjunto) => (
        <View
          key={adjunto.id}
          className="flex-row items-center gap-2.5 py-2.5 px-3 rounded-xl"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <Text style={{ fontSize: 18 }}>
            {adjunto.tipoMime.startsWith("image/") ? "🖼️" : "📄"}
          </Text>
          <Pressable className="flex-1" onPress={() => abrir(adjunto)}>
            <Text className="text-sm text-gray-900" numberOfLines={1}>
              {adjunto.nombre}
            </Text>
          </Pressable>
          {puedeEditar && (
            <Pressable onPress={() => quitar(adjunto)} hitSlop={8}>
              <Text style={{ color: theme.colors.danger, fontSize: 16 }}>✕</Text>
            </Pressable>
          )}
        </View>
      ))}

      {puedeEditar && (
        <View className="flex-row gap-6 justify-center mt-1">
          {acciones.map((accion) => (
            <Pressable
              key={accion.key}
              onPress={accion.onPress}
              disabled={subiendo}
              className="items-center gap-2"
              style={{ opacity: subiendo ? 0.4 : 1 }}
            >
              <Image
                source={accion.icon}
                style={{ width: 64, height: 64, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Text className="text-sm text-gray-900 text-center">
                {subiendo ? "Subiendo..." : accion.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
