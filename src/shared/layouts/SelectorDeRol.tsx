import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { Modal } from "@/shared/components/ui/Modal";
import { PRESENTACION_DE_ROL } from "@/shared/constants/presentacionDeRoles";
import { nombreDeVivienda } from "@/shared/services/nombreDeVivienda";
import type { RolActivo } from "@/shared/types";

/**
 * Los roles de la persona y dónde tiene cada uno, para cambiar sin salir
 * (Para Claude 174, 30/10/2026). Reemplaza a la pantalla que preguntaba el
 * rol al entrar: ahora se entra con el último y se cambia desde aquí.
 */
export function ModalDeRoles({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const roles = useAuthStore((s) => s.rolesDisponibles);
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const setRolActivo = useAuthStore((s) => s.setRolActivo);
  const condominios = useAuthStore((s) => s.condominios);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);

  const dondeTiene = (rol: NonNullable<RolActivo>) => {
    if (rol === "administrador") {
      return condominios
        .filter((c) => c.rol === "administrador" || c.rol === "coadministrador")
        .map((c) => c.condominioNombre);
    }
    if (rol === "guardia") {
      return condominios.filter((c) => c.rol === "guardia").map((c) => c.condominioNombre);
    }
    return ubicaciones.filter((u) => u.rol === rol).map((u) => nombreDeVivienda(u));
  };

  const elegir = (rol: RolActivo) => {
    setRolActivo(rol);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Cambiar de rol">
      <View className="gap-2">
        {roles.map((rol) => {
          if (!rol) return null;
          const info = PRESENTACION_DE_ROL[rol];
          const activo = rol === rolActivo;
          const lugares = dondeTiene(rol).filter(Boolean);
          return (
            <Pressable
              key={rol}
              onPress={() => elegir(rol)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              aria-selected={activo}
              className="flex-row items-center gap-3 rounded-2xl border p-3"
              style={{
                borderColor: activo ? theme.colors.primary : theme.colors.border,
                backgroundColor: activo ? theme.colors.primaryLight : theme.colors.bgCard,
              }}
            >
              <Ionicons name={info.icono} size={22} color={theme.colors.iconAmberDark} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {activo ? `${info.titulo} (ahora)` : info.titulo}
                </Text>
                <Text className="text-xs text-gray-500">
                  {lugares.length ? lugares.join(" · ") : info.descripcion}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

/** El botón de la barra de arriba, al lado del de información. Solo con más de un rol. */
export function BotonDeRoles() {
  const roles = useAuthStore((s) => s.rolesDisponibles);
  const [abierto, setAbierto] = useState(false);
  if (roles.length <= 1) return null;
  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel="Cambiar de rol"
        hitSlop={8}
        style={{ flexShrink: 0 }}
        className="mr-3"
      >
        <Ionicons name="swap-horizontal-outline" size={22} color={theme.colors.text} />
      </Pressable>
      <ModalDeRoles visible={abierto} onClose={() => setAbierto(false)} />
    </>
  );
}
