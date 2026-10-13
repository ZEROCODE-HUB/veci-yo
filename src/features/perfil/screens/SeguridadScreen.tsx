import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { theme } from "@/config";
import { useUIStore } from "@/stores";
import { Button, Input, Modal } from "@/shared/components";
import { supabase } from "@/shared/services/supabase";
import { solicitarRecuperacionRequest } from "@/features/onboarding/services";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { EliminarCuenta } from "../components/configuracion";

/**
 * Seguridad de la cuenta: el correo alternativo, la contraseña y eliminar.
 *
 * Tenía tres cosas que no hacían nada (13/10/2026):
 *
 *   · un «Correo de respaldo» que vivía en un almacén en memoria y se perdía
 *     al cerrar. Es el mismo dato que el «correo alternativo» de
 *     Configuración, así que ahora es **la misma columna**: escribirlo aquí o
 *     allí es lo mismo;
 *   · «Pausar cuenta», que se retira;
 *   · y «Eliminar cuenta», escrito otra vez igual que en Configuración. Es un
 *     solo componente.
 */
export function SeguridadScreen() {
  const { addToast } = useUIStore();
  const { preferencias, escribir, guardarCampo } = useConfiguracion();
  const [showCambiarPass, setShowCambiarPass] = useState(false);
  const [enviandoPass, setEnviandoPass] = useState(false);

  /*
    El modal decia «Se envió el enlace de restablecimiento a su correo» y no se
    enviaba nada: el boton solo lo abria. Ahora se pide de verdad, y hasta que
    Supabase responde no se afirma que salio.
  */
  const pedirCambioDePass = async () => {
    if (enviandoPass) return;
    setEnviandoPass(true);
    try {
      const { data } = await supabase.auth.getUser();
      const correo = data.user?.email;
      if (!correo) throw new Error("No encontramos el correo de tu cuenta.");
      await solicitarRecuperacionRequest(correo);
      setShowCambiarPass(true);
    } catch (e) {
      addToast(
        mensajeDeError(
          e,
          "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.",
        ),
        "error",
      );
    } finally {
      setEnviandoPass(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <View
          className="bg-white rounded-xl p-4 gap-2"
          style={{
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-base font-bold text-gray-900 text-center mb-1.5">
            Información de contacto
          </Text>
          <Input
            label="Correo alternativo"
            type="email"
            value={preferencias.correoAlt}
            onChangeText={(v) => escribir({ correoAlt: v })}
            onBlur={() => guardarCampo("correoAlt")}
            placeholder="correo@ejemplo.com"
          />
          <Text className="text-xs text-gray-500">
            Es el mismo de Configuración: se guarda al salir del campo.
          </Text>
        </View>
        <Button
          variant="primary"
          loading={enviandoPass}
          onPress={() => void pedirCambioDePass()}
        >
          Cambiar contraseña
        </Button>
        <EliminarCuenta />
      </ScrollView>

      <Modal
        visible={showCambiarPass}
        onClose={() => setShowCambiarPass(false)}
        title="Cambiar contraseña"
      >
        <View className="gap-4 items-center py-2">
          <Text className="text-lg font-bold text-gray-900">
            Revisa tu correo
          </Text>
          <Text
            className="text-base text-gray-500 text-center"
            style={{ lineHeight: 22 }}
          >
            Te enviamos un enlace para cambiar la contraseña. Si no llega en
            unos minutos, mira en la carpeta de correo no deseado.
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
    </View>
  );
}
