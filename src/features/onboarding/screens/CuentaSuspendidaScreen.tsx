import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Card } from "@/shared/components/ui";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Lo que ve quien tiene la cuenta suspendida (24/10/2026).
 *
 * Pedido del cliente: «al ingresar ya le salga algún modal o pantalla de que
 * está suspendido». Llega aquí por dos caminos:
 *   · al intentar entrar: Supabase responde que la cuenta está bloqueada, y
 *     como sin sesión no se puede leer el motivo, se dice que va por correo;
 *   · si tenía la sesión abierta: la app lee `mi_suspension()` y enseña el
 *     motivo.
 * El contacto de soporte sale de los parámetros, si está puesto.
 */
export function CuentaSuspendidaScreen() {
  const suspension = useAuthStore((s) => s.suspension);
  const cerrarAvisoDeSuspension = useAuthStore((s) => s.cerrarAvisoDeSuspension);
  const parametros = useParametrosDeLaBase();
  const correoSoporte = parametros.listo ? parametros.texto("soporte_correo")?.trim() : "";

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="flex-grow justify-center p-6">
      <Card className="items-center gap-4 p-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="lock-closed-outline" size={32} color={theme.colors.danger} />
        </View>
        <Text className="text-center text-xl font-bold text-gray-900">Tu cuenta está suspendida</Text>

        {suspension?.motivo ? (
          <Text className="text-center text-sm text-gray-700">{`Motivo: ${suspension.motivo}`}</Text>
        ) : (
          <Text className="text-center text-sm text-gray-700">
            Mientras siga suspendida no puedes entrar en Veciyo. Te enviamos el motivo a tu correo.
          </Text>
        )}

        <Text className="text-center text-sm text-gray-500">
          {correoSoporte
            ? `Si crees que es un error, escríbenos a ${correoSoporte}.`
            : "Si crees que es un error, habla con la administración de tu edificio."}
        </Text>

        <Button fullWidth onPress={() => void cerrarAvisoDeSuspension()}>
          Entendido
        </Button>
      </Card>
    </ScrollView>
  );
}
