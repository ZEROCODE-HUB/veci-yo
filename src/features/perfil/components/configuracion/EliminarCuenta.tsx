import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Checkbox, Input, Modal } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { eliminarMiCuenta } from "../../services/cuenta.repo";

const RAZONES = [
  "Ya no resido en este condominio",
  "Cambio de condominio",
  "No uso la aplicación",
  "Problemas con la aplicación",
  "Otro",
];

/**
 * El botón «Eliminar cuenta» y su ventana.
 *
 * Estaba escrito dos veces --en Configuración y en Seguridad--, pedía el
 * motivo y la confirmación, y respondía «todavía no está disponible». El
 * motivo se tiraba. Decidido con el cliente el 13/10/2026: tiene que
 * funcionar.
 *
 * Pide dos cosas antes de dejar pulsar: el motivo --escrito, si es «Otro»-- y
 * marcar que se entiende que no se puede deshacer. Es lo único de la
 * aplicación que no tiene vuelta atrás.
 */
export function EliminarCuenta() {
  const addToast = useUIStore((s) => s.addToast);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const [abierta, setAbierta] = useState(false);
  const [razon, setRazon] = useState(RAZONES[0]);
  const [otra, setOtra] = useState("");
  const [entendido, setEntendido] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const motivo = razon === "Otro" ? otra.trim() : razon;
  const listo = Boolean(motivo) && entendido;

  const cerrar = () => {
    if (eliminando) return;
    setAbierta(false);
    setEntendido(false);
  };

  const eliminar = async () => {
    if (!listo || eliminando) return;
    setEliminando(true);
    try {
      await eliminarMiCuenta(motivo);
      addToast("Tu cuenta quedó eliminada.", "success");
      // La cuenta ya no existe: la sesión se cierra aquí.
      cerrarSesion();
    } catch (fallo) {
      // El motivo viene de la base y dice qué hacer: «nombra a otra persona
      // antes», «cierra tus estancias».
      addToast(
        mensajeDeError(fallo, "No se pudo eliminar la cuenta"),
        "error",
      );
      setEliminando(false);
    }
  };

  return (
    <>
      <Button variant="danger" onPress={() => setAbierta(true)}>
        <Text>Eliminar cuenta</Text>
      </Button>

      <Modal visible={abierta} onClose={cerrar} title="Eliminar cuenta">
        <View className="gap-3.5">
          <Text className="text-sm text-gray-900">
            Se borran tu perfil, tus avisos y tus preferencias, y dejas de
            pertenecer a tus viviendas. Lo que quedó registrado --visitas,
            paquetes, reservas-- se conserva sin tu nombre.
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            ¿Por qué te vas?
          </Text>
          <View className="gap-2">
            {RAZONES.map((opcion) => (
              <Pressable
                key={opcion}
                onPress={() => setRazon(opcion)}
                accessibilityRole="radio"
                accessibilityState={{ checked: razon === opcion }}
                aria-checked={razon === opcion}
                className="p-3 rounded-xl"
                style={{
                  borderWidth: 1.5,
                  borderColor:
                    razon === opcion
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    razon === opcion
                      ? theme.colors.secondaryLight
                      : theme.colors.bgCard,
                }}
              >
                <Text className="text-sm font-medium text-gray-900">
                  {opcion}
                </Text>
              </Pressable>
            ))}
          </View>
          {razon === "Otro" && (
            <Input
              label="Cuéntanos la razón"
              value={otra}
              onChangeText={setOtra}
              placeholder="Escribe tu razón"
              multiline
              rows={2}
            />
          )}
          <Checkbox
            checked={entendido}
            onChange={setEntendido}
            label="Entiendo que no se puede deshacer"
          />
          <Button
            variant="danger"
            fullWidth
            disabled={!listo}
            loading={eliminando}
            onPress={() => void eliminar()}
          >
            <Text>Eliminar mi cuenta</Text>
          </Button>
          <Button variant="ghost" fullWidth onPress={cerrar}>
            <Text>Cancelar</Text>
          </Button>
        </View>
      </Modal>
    </>
  );
}
