import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useUIStore } from "@/stores";
import { Button, Input, Modal } from "@/shared/components";
import { useSeguridad } from "../hooks/useSeguridad";
import {
  SeguridadContacto,
  SeguridadPreferencias,
} from "../components/seguridad";

const RAZONES_ELIMINAR = [
  "Ya no resido en este condominio",
  "Cambio de condominio",
  "No uso la aplicación",
  "Problemas con la app",
  "Otro",
];

export function SeguridadScreen() {
  const { control, setValue, actualizarSeguridad, pausarCuenta } =
    useSeguridad();
  const { addToast } = useUIStore();
  const [showCambiarPass, setShowCambiarPass] = useState(false);
  const [showPausar, setShowPausar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [razonEliminar, setRazonEliminar] = useState(RAZONES_ELIMINAR[0]);
  const [otraRazon, setOtraRazon] = useState("");

  const confirmarPausar = () => {
    pausarCuenta();
    setValue("pausarCuenta", true);
    setShowPausar(false);
    addToast(
      "Cuenta pausada. Ahora estás invisible y no recibirás notificaciones.",
      "success",
    );
  };
  const confirmarEliminar = () => {
    const razon =
      razonEliminar === "Otro" ? otraRazon.trim() || "Otro" : razonEliminar;
    setShowEliminar(false);
    addToast(`Cuenta eliminada (demo). Razón: ${razon}`, "success");
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <SeguridadContacto
          control={control}
          onChange={(value) => actualizarSeguridad({ correoRespaldo: value })}
        />
        <SeguridadPreferencias
          control={control}
          onChange={(key, value) => actualizarSeguridad({ [key]: value })}
          onPausar={() => setShowPausar(true)}
        />
        <Button variant="primary" onPress={() => setShowCambiarPass(true)}>
          Cambiar Contraseña
        </Button>
        <Button variant="secondary" onPress={() => setShowEliminar(true)}>
          Eliminar Cuenta
        </Button>
      </ScrollView>

      <Modal
        visible={showCambiarPass}
        onClose={() => setShowCambiarPass(false)}
        title="Cambiar contraseña"
      >
        <View className="gap-4 items-center py-2">
          <Text className="text-lg font-bold text-gray-900">
            Revisa su correo!
          </Text>
          <Text
            className="text-base text-gray-500 text-center"
            style={{ lineHeight: 22 }}
          >
            Se envió el enlace de restablecimiento de contraseña a su correo
            tiene vigencia 15 minutos y vence!
          </Text>
          <Button
            variant="primary"
            fullWidth
            onPress={() => setShowCambiarPass(false)}
          >
            Aceptar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={showPausar}
        onClose={() => setShowPausar(false)}
        title="Pausar cuenta"
      >
        <View className="gap-4 items-center py-2">
          <Text style={{ fontSize: 48 }}>⏸️</Text>
          <Text
            className="text-sm text-gray-900 text-center"
            style={{ lineHeight: 22 }}
          >
            Al pausar la cuenta te invisibilizas en todo lugar de la aplicación,
            pero tampoco recibirás notificaciones.
          </Text>
          <Button variant="primary" onPress={confirmarPausar}>
            Pausar cuenta
          </Button>
          <Button variant="ghost" onPress={() => setShowPausar(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={showEliminar}
        onClose={() => setShowEliminar(false)}
        title="Eliminar cuenta"
      >
        <View className="gap-3.5">
          <Text className="text-sm text-gray-900 text-center">
            ¿Es porque ya no resides en este condominio o cuál es la razón?
          </Text>
          <View className="gap-2">
            {RAZONES_ELIMINAR.map((razon) => (
              <Pressable
                key={razon}
                onPress={() => setRazonEliminar(razon)}
                className="rounded-md px-3.5 py-3"
                style={{
                  borderWidth: 1.5,
                  borderColor: razonEliminar === razon ? "#F5B800" : "#E5E7EB",
                  backgroundColor:
                    razonEliminar === razon ? "#FFF8E1" : "#FFFFFF",
                }}
              >
                <Text className="text-sm font-medium text-gray-900">
                  {razon}
                </Text>
              </Pressable>
            ))}
          </View>
          {razonEliminar === "Otro" && (
            <Input
              label="Cuéntanos la razón"
              value={otraRazon}
              onChangeText={setOtraRazon}
              placeholder="Escribe tu razón"
              multiline
              rows={2}
            />
          )}
          <Button variant="danger" fullWidth onPress={confirmarEliminar}>
            Eliminar cuenta
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => setShowEliminar(false)}
          >
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
