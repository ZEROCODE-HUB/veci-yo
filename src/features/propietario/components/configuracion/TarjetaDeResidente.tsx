import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Checkbox } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

interface Props {
  residente: ResidenteDeUnidad;
  /** Se ofrece «Puede registrar visitas» en los huéspedes. */
  mostrarPermisoDeVisitas: boolean;
  onMarcarAnfitrion: () => void;
  onMarcarAdministrador: () => void;
  onCambiarPermisoDeVisitas: () => void;
  onMenu: () => void;
}

/** Una persona de la vivienda en la configuración del propietario. */
export function TarjetaDeResidente({
  residente: r,
  mostrarPermisoDeVisitas,
  onMarcarAnfitrion,
  onMarcarAdministrador,
  onCambiarPermisoDeVisitas,
  onMenu,
}: Props) {
  const gris = { color: theme.colors.textSecondary };
  const suave = { color: theme.colors.textMuted };
  return (
    <View className="rounded-2xl p-4" style={ESTILO_DE_TARJETA}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1" style={{ minWidth: 0 }}>
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {r.nombre}
            {r.esAnfitrionPrimario && (
              <Text
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: theme.colors.primaryLight, color: theme.colors.primary }}
              >
                {" "}
                Anfitrión primario
              </Text>
            )}
            {r.esAdministradorPrimario && (
              <Text
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: theme.colors.accentPink, color: theme.colors.accentPinkText }}
              >
                {" "}
                Admin primario
              </Text>
            )}
          </Text>
          <View className="flex-row justify-between">
            <Text className="text-sm" style={gris}>CI: {r.ci}</Text>
            <Text className="text-sm" style={gris}>{r.fecha}</Text>
          </View>
          <View className="flex-row gap-1.5 flex-wrap mt-1">
            <Text className="text-xs" style={suave}>
              {r.datosVisibles === false ? "🔒 Datos ocultos" : "👁️ Datos visibles"}
            </Text>
            <Text className="text-xs" style={suave}>
              {r.contactableChat ? "💬 Chat" : "💬✕"}
            </Text>
            <Text className="text-xs" style={suave}>
              {r.contactableWhatsapp ? "📱 WhatsApp" : "📱✕"}
            </Text>
          </View>
          {(r.rol === "Residente" ||
            r.rol === "Corresidente" ||
            r.rol === "Inquilino Lider" ||
            r.rol === "Propietario") && (
            <Checkbox
              checked={!!r.esAnfitrionPrimario}
              onChange={onMarcarAnfitrion}
              label="Anfitrión primario"
            />
          )}
          {/*
            «Aprobar huésped por huésped»: el anfitrión habilita a cada huésped
            para registrar visitas (15/10/2026).
          */}
          {r.rol === "Huesped Temporal" && mostrarPermisoDeVisitas ? (
            <Checkbox
              checked={r.puedeRegistrarVisitas}
              onChange={onCambiarPermisoDeVisitas}
              label="Puede registrar visitas"
            />
          ) : null}
          {(r.rol === "Coadministrador" || r.rol === "Propietario") && (
            <Checkbox
              checked={!!r.esAdministradorPrimario}
              onChange={onMarcarAdministrador}
              label="Administrador primario"
            />
          )}
        </View>
        <Pressable
          hitSlop={10}
          accessibilityLabel={`Opciones de ${r.nombre}`}
          onPress={onMenu}
          className="p-1"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
