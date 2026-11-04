import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { create } from "zustand";
import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { Modal } from "@/shared/components/ui/Modal";
import { PRESENTACION_DE_ROL } from "@/shared/constants/presentacionDeRoles";
import { nombreDeVivienda } from "@/shared/services/nombreDeVivienda";
import { anotarEnLaBase } from "@/shared/services/erroresDeLaApp";
import { irAlInicio } from "@/navigation/navegacionGlobal";
import type { RolActivo } from "@/shared/types";

/** Lo que tarda en irse la ventana: la animación de `Modal` y un margen. */
const ESPERA_AL_CERRAR_MS = 350;
/** Lo que se deja a la pantalla vieja para irse antes de cambiar el rol. */
const ESPERA_AL_SALIR_MS = 120;

/*
  La ventana vive **una sola vez, en la raíz** (`VentanaDeRoles`, en App), y
  la abren la barra de arriba, el perfil y el panel (Para Claude 219,
  04/11/2026). Vivía dentro de la barra de cada pestaña, y cambiar de rol
  rehace esas pestañas: la ventana se desmontaba con ellas, y en Android su
  velo gris se quedaba encima de todo, sin dejar pulsar nada. Ya había pasado
  con el 211, y esperar a que se cerrara no bastó.
*/
const useVentanaDeRoles = create<{ abierta: boolean }>(() => ({ abierta: false }));

export function abrirCambioDeRol() {
  useVentanaDeRoles.setState({ abierta: true });
}

function cerrarCambioDeRol() {
  useVentanaDeRoles.setState({ abierta: false });
}

/** La ventana de roles de toda la app. Va en la raíz, fuera de la navegación. */
export function VentanaDeRoles() {
  const abierta = useVentanaDeRoles((s) => s.abierta);
  return <ModalDeRoles visible={abierta} onClose={cerrarCambioDeRol} />;
}

/**
 * Los roles de la persona y dónde tiene cada uno, para cambiar sin salir
 * (Para Claude 174, 30/10/2026). Reemplaza a la pantalla que preguntaba el
 * rol al entrar: ahora se entra con el último y se cambia desde aquí.
 */
function ModalDeRoles({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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

  /*
    El orden importa (Para Claude 211 y 219):
    1. se cierra la ventana;
    2. ya cerrada, se vuelve al Inicio **con el rol de antes**, para que la
       pantalla de debajo (Visitas del propietario, por ejemplo) se vaya sin
       pintarse con un rol que no es el suyo;
    3. y entonces cambia el rol, sobre el Inicio.
    Cada paso deja un rastro en la base: si un celular se vuelve a quedar
    gris, se sabrá en cuál se quedó.
  */
  const elegir = (rol: RolActivo) => {
    onClose();
    if (!rol || rol === rolActivo) return;
    const deQue = `${rolActivo ?? "ninguno"} → ${rol}`;
    void anotarEnLaBase("rastro", "cambio de rol: pedido", deQue);
    setTimeout(() => {
      irAlInicio();
      setTimeout(() => {
        setRolActivo(rol);
        void anotarEnLaBase("rastro", "cambio de rol: hecho", deQue);
      }, ESPERA_AL_SALIR_MS);
    }, ESPERA_AL_CERRAR_MS);
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
  if (roles.length <= 1) return null;
  return (
    <Pressable
        onPress={abrirCambioDeRol}
        accessibilityRole="button"
        accessibilityLabel="Cambiar de rol"
        hitSlop={8}
        style={{ flexShrink: 0 }}
        className="mr-3"
      >
        <Ionicons name="swap-horizontal-outline" size={22} color={theme.colors.text} />
      </Pressable>
  );
}
