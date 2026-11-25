import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Badge, Cargando, Checkbox } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";
import { Etiqueta } from "./Etiqueta";
import { ESTILO_DE_TARJETA, ROL_COLORES } from "./gruposDeResidentes";

interface Props {
  residente: ResidenteDeUnidad;
  /** Se ofrece «Puede registrar visitas» en los huéspedes. */
  mostrarPermisoDeVisitas: boolean;
  onCambiarPermisoDeVisitas: () => void;
  onMenu: () => void;
  /** Lo de esta persona que se está guardando: gira solo eso. */
  pendiente?: "anfitrion" | "administrador" | "visitas" | null;
  /** Hay un guardado en curso en la lista: las casillas esperan (sin doble toque). */
  ocupado?: boolean;
}

/** Lo que dice la etiqueta de cada rol. */
const NOMBRE_DEL_ROL: Record<string, string> = {
  "Inquilino Lider": "Inquilino líder",
  "Huesped Temporal": "Huésped",
};

/**
 * Una persona de la vivienda (25/11/2026, el cliente: «hazlo sencillo»): su
 * nombre, su rol, si tiene la app, y el «⋮» con todo lo que se hace con ella
 * --editar, privilegios, dar de baja--. Lo demás (datos visibles, chat,
 * WhatsApp, documento, las casillas de «primario») estaba aquí a la vista y
 * confundía: vive en «Editar» y en «Contactos principales».
 */
export function TarjetaDeResidente({
  residente: r,
  mostrarPermisoDeVisitas,
  onCambiarPermisoDeVisitas,
  onMenu,
  pendiente = null,
  ocupado = false,
}: Props) {
  const colores = ROL_COLORES[r.rol] ?? ROL_COLORES.Residente;
  return (
    <View className="rounded-2xl px-4 py-3" style={ESTILO_DE_TARJETA}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 gap-1.5" style={{ minWidth: 0 }}>
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {r.nombre}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Etiqueta texto={NOMBRE_DEL_ROL[r.rol] ?? r.rol} fondo={colores.bg} color={colores.color} />
            {r.esAnfitrionPrimario ? (
              <Etiqueta texto="Contacto de huéspedes" fondo={theme.colors.primaryLight} color={theme.colors.primary} />
            ) : null}
            {r.esAdministradorPrimario ? (
              <Etiqueta texto="Contacto principal" fondo={theme.colors.accentPink} color={theme.colors.accentPinkText} />
            ) : null}
            {/* Vive aquí sin la app (17/11/2026): un niño, un abuelo. */}
            {r.usuarioId ? null : (
              <Badge status="Sin app">{r.esMenor ? "Sin app · menor de edad" : "Sin app"}</Badge>
            )}
          </View>
          {/*
            «Aprobar huésped por huésped»: el anfitrión habilita a cada huésped
            para registrar visitas (15/10/2026).
          */}
          {r.rol === "Huesped Temporal" && mostrarPermisoDeVisitas ? (
            <View className="flex-row items-center gap-2">
              <Checkbox
                checked={r.puedeRegistrarVisitas}
                onChange={onCambiarPermisoDeVisitas}
                label="Puede registrar visitas"
                disabled={ocupado}
              />
              {pendiente === "visitas" ? <Cargando variante="control" texto="el permiso de visitas" /> : null}
            </View>
          ) : null}
        </View>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${r.nombre}`}
          onPress={onMenu}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
