import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, EnlaceDeInvitacion, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { darAccesoALaApp } from "../../services/invitacionesUnidad.repo";

const ES_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  /** Quien vive en la vivienda sin la app. `null`: la ventana está cerrada. */
  persona: { id: string; nombre: string } | null;
  onClose: () => void;
}

/**
 * «Darle acceso a la app» a quien ya vive en la vivienda sin ella
 * (17/11/2026). Pide su correo y le manda la invitación de siempre; al
 * aceptarla queda unida a **la misma persona**, sin duplicarla (lo hace la
 * base). Se usa desde Invitar y desde Configuración.
 */
export function DarAccesoALaApp({ persona, onClose }: Props) {
  const [correo, setCorreo] = useState("");
  const [enlace, setEnlace] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const dar = useMutation({
    mutationFn: () =>
      darAccesoALaApp({ membresiaId: persona?.id ?? "", nombre: persona?.nombre ?? "", correo }),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["unidad"] });
      addToast(
        resultado.correoEnviado
          ? "Invitación enviada por correo"
          : "Invitación creada. Copia el enlace y pásaselo.",
        "success",
      );
      setEnlace(resultado.enlace);
      setCorreo("");
      onClose();
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo enviar la invitación"), "error"),
  });

  const correoValido = ES_CORREO.test(correo.trim());

  return (
    <>
      <Modal
        visible={Boolean(persona)}
        onClose={() => (dar.isPending ? undefined : onClose())}
        title="Darle acceso a la app"
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-500">
            {`Le mandamos a ${persona?.nombre ?? ""} una invitación a su correo. Cuando la acepte, entra a la app como residente de esta vivienda.`}
          </Text>
          <Input
            label="Su correo *"
            type="email"
            value={correo}
            onChangeText={setCorreo}
            placeholder="ana@correo.com"
            error={correo.trim() && !correoValido ? "El correo no parece válido" : undefined}
          />
          <Button
            variant="primary"
            loading={dar.isPending}
            disabled={!correoValido || dar.isPending}
            onPress={() => dar.mutate()}
          >
            Enviar invitación
          </Button>
        </View>
      </Modal>
      <EnlaceDeInvitacion enlace={enlace} nombre={persona?.nombre} onCerrar={() => setEnlace(null)} />
    </>
  );
}
