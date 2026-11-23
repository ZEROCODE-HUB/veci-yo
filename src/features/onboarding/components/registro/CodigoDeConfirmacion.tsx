import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { olvidarCorreoPorConfirmar } from "@/shared/services/correoPorConfirmar";
import { reenviarCodigoDeConfirmacion } from "@/shared/services/sesion";
import { mensajeDeError } from "@/shared/utils/error.util";

/** Las cifras del código: lo fija el proyecto (`mailer_otp_length`). */
const CIFRAS = 6;
/** Entre un reenvío y otro: el servidor de correo también tiene su cupo. */
const ESPERA_REENVIO = 60;

/**
 * «Revisa tu correo» con el código (17/11/2026, cliente: «cuando le sale esa
 * pantalla de Confirma tu correo, el usuario no está logueado… lo adecuado
 * sería que sí esté»).
 *
 * El correo de confirmación trae un código de 6 cifras: se escribe aquí y la
 * sesión queda abierta en ese momento. Antes era un enlace que sacaba a la
 * persona de la app, y si el celular cerraba Veciyo mientras tanto, volvía sin
 * sesión. El correo se recuerda en el dispositivo (`correoPorConfirmar`), así
 * que si la app se cierra, al volver aparece esta misma pantalla.
 */
export function CodigoDeConfirmacion({
  correo,
  onCambiarDeCorreo,
}: {
  correo: string;
  onCambiarDeCorreo: () => void;
}) {
  const confirmarCorreoReal = useAuthStore((s) => s.confirmarCorreoReal);
  const addToast = useUIStore((s) => s.addToast);
  const [codigo, setCodigo] = useState("");
  const [espera, setEspera] = useState(ESPERA_REENVIO);

  useEffect(() => {
    if (espera <= 0) return;
    const reloj = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(reloj);
  }, [espera]);

  const confirmar = useMutation({
    mutationFn: () => confirmarCorreoReal(correo, codigo),
    onSuccess: () => void olvidarCorreoPorConfirmar(),
    onError: (e) => {
      const motivo = mensajeDeError(e, "");
      addToast(
        /expired|invalid|token/i.test(motivo)
          ? "Ese código no sirve o ya caducó. Revísalo, o pide otro."
          : mensajeDeError(e, "No pudimos confirmar tu correo"),
        "error",
      );
    },
  });

  const reenviar = useMutation({
    mutationFn: () => reenviarCodigoDeConfirmacion(correo),
    onSuccess: () => {
      setEspera(ESPERA_REENVIO);
      addToast("Te enviamos otro código", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No pudimos enviar otro código"), "error"),
  });

  const completo = codigo.replace(/\D/g, "").length === CIFRAS;

  return (
    <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: theme.colors.successLight }}>
      <Text className="text-base font-bold text-gray-900">Revisa tu correo</Text>
      <Text className="text-sm text-gray-700">
        {`Te enviamos un código de ${CIFRAS} cifras a ${correo}. Escríbelo aquí para entrar.`}
      </Text>
      <Input
        label="Código *"
        value={codigo}
        onChangeText={(texto) => setCodigo(texto.replace(/\D/g, "").slice(0, CIFRAS))}
        placeholder="123456"
        soloCifras
        returnKeyType="done"
        onSubmitEditing={() => {
          if (completo) confirmar.mutate();
        }}
        showEditIcon={false}
      />
      <Button
        fullWidth
        disabled={!completo || reenviar.isPending}
        loading={confirmar.isPending}
        onPress={() => confirmar.mutate()}
      >
        Entrar
      </Button>
      <Button
        variant="secondary"
        fullWidth
        disabled={espera > 0 || confirmar.isPending}
        loading={reenviar.isPending}
        onPress={() => reenviar.mutate()}
      >
        {espera > 0 ? `Reenviar el código (${espera} s)` : "Reenviar el código"}
      </Button>
      <Text className="text-xs text-gray-500">
        Si no llega en unos minutos, mira en la carpeta de correo no deseado.
      </Text>
      <Button variant="ghost" fullWidth disabled={confirmar.isPending} onPress={onCambiarDeCorreo}>
        Usar otro correo
      </Button>
    </View>
  );
}
