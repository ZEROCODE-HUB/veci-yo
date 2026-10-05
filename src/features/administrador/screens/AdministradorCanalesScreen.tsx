import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";
import { useCanales } from "../hooks/useCanales";
import { CanalForm } from "../components/canales/CanalForm";
import {
  ROLES_DE_EDIFICIO,
  ROLES_DE_VIVIENDA,
  type Canal,
} from "../services/canales.repo";

/**
 * Los canales del chat del edificio.
 *
 * Pedido por el cliente el 02/10/2026: «canales creados al dar de alta el
 * edificio, con nombre y roles, editables». Las tres partes:
 *
 *   · **creados al dar de alta**: `panel_crear_condominio` deja los dos de
 *     siempre --Residentes y Propietarios-- así que un edificio nuevo ya no
 *     nace con el chat vacío;
 *   · **con nombre y roles**: viven en `conversacion.nombre` y en `canal_rol`.
 *     Antes los roles estaban dentro de una función de la base;
 *   · **editables**: esta pantalla.
 *
 * Un canal no se borra: se archiva. `mensaje` cuelga de `conversacion` con
 * cascade, así que borrarlo se llevaría por delante todo lo que se dijo en él.
 */
export function AdministradorCanalesScreen() {
  const { canales, cargando, guardando, guardar, archivar } = useCanales();
  const [editando, setEditando] = useState<Canal | null>(null);
  const [abierto, setAbierto] = useState(false);

  const abrir = (canal: Canal | null) => {
    setEditando(canal);
    setAbierto(true);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4 gap-3">
        <View>
          <Text className="text-lg font-bold text-gray-900">
            Canales del chat
          </Text>
          <Text className="mt-1 text-xs leading-5 text-gray-500">
            Quién entra en cada canal lo decide el rol. No hay que añadir a
            nadie: quien llega al edificio con ese rol aparece, y quien se va
            deja de aparecer.
          </Text>
        </View>

        <Button variant="primary" fullWidth onPress={() => abrir(null)}>
          + Nuevo canal
        </Button>

        {cargando ? (
          <Text className="py-6 text-center text-sm text-gray-500">
            Cargando…
          </Text>
        ) : canales.length === 0 ? (
          <Text className="py-6 text-center text-sm text-gray-500">
            Este edificio no tiene canales todavía.
          </Text>
        ) : (
          canales.map((canal) => (
            <View
              key={canal.id}
              className="rounded-2xl p-3.5 gap-2"
              style={{
                backgroundColor: theme.colors.bgCard,
                boxShadow: theme.shadows.card,
                opacity: canal.archivado ? 0.6 : 1,
              }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-base font-bold text-gray-900">
                  {canal.nombre}
                </Text>
                {canal.archivado && (
                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: theme.colors.borderLight }}
                  >
                    <Text className="text-2xs font-semibold text-gray-500">
                      Archivado
                    </Text>
                  </View>
                )}
              </View>

              <Text className="text-xs text-gray-500">
                {nombresDeRoles(canal) || "Sin roles"}
              </Text>

              <Text className="text-xs text-gray-400">
                {/*
                  A cuánta gente alcanza. Marcar roles sin ver esto es marcar a
                  ciegas: «corresidente» puede ser una persona o ciento.
                */}
                {canal.personas === 1
                  ? "1 persona"
                  : `${canal.personas} personas`}
              </Text>

              <View className="flex-row justify-end gap-3">
                {!canal.archivado && (
                  <Pressable
                    accessibilityLabel={`Editar ${canal.nombre}`}
                    onPress={() => abrir(canal)}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: theme.colors.primary }}
                    >
                      Editar
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityLabel={
                    canal.archivado
                      ? `Recuperar ${canal.nombre}`
                      : `Archivar ${canal.nombre}`
                  }
                  onPress={() => archivar(canal)}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: canal.archivado
                        ? theme.colors.primary
                        : theme.colors.danger,
                    }}
                  >
                    {canal.archivado ? "Recuperar" : "Archivar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={abierto}
        onClose={() => setAbierto(false)}
        title={editando ? "Editar canal" : "Nuevo canal"}
      >
        <CanalForm
          editando={editando}
          guardando={guardando}
          onCancelar={() => setAbierto(false)}
          onGuardar={(params) => {
            guardar(params);
            setAbierto(false);
          }}
        />
      </Modal>
    </View>
  );
}

/** «Propietarios, Residentes · Portería», que es lo que dice quién entra. */
function nombresDeRoles(canal: Canal): string {
  const vivienda = canal.rolesVivienda
    .map((rol) => ROLES_DE_VIVIENDA.find((r) => r.clave === rol)?.etiqueta)
    .filter(Boolean);
  const edificio = canal.rolesEdificio
    .map((rol) => ROLES_DE_EDIFICIO.find((r) => r.clave === rol)?.etiqueta)
    .filter(Boolean);

  return [vivienda.join(", "), edificio.join(", ")]
    .filter((parte) => parte !== "")
    .join(" · ");
}
