import React, { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useUnidadesDisponibles } from "@/shared/hooks";
import { abrirConversacionArea } from "../services/chat.repo";
import { ChatNewForm, type DestinoChat } from "../components/chat/ChatNewForm";

/**
 * El destino se codifica como `<area>:<unidadId>`, que es exactamente lo que
 * identifica una conversación de área.
 */
export function ChatNuevoScreen() {
  const navigation = useNavigation<any>();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const unidadesPropias = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { unidades } = useUnidadesDisponibles();

  const esPersonal = rolActivo === "guardia" || rolActivo === "administrador";
  const areaPropia = rolActivo === "administrador" ? "administracion" : "seguridad";

  const destinos = useMemo<DestinoChat[]>(() => {
    if (esPersonal) {
      // El personal escribe a una vivienda, siempre desde su propia área.
      return unidades.map((u) => ({
        valor: `${areaPropia}:${u.unidadId}`,
        etiqueta: `${u.torre} · Dpto ${u.codigo}`,
      }));
    }

    // Un residente escribe a la portería o a la administración, desde una de
    // sus viviendas.
    return unidadesPropias.flatMap((u) => [
      {
        valor: `seguridad:${u.unidadId}`,
        etiqueta:
          unidadesPropias.length > 1
            ? `Seguridad · Dpto ${u.codigo}`
            : "Seguridad",
      },
      {
        valor: `administracion:${u.unidadId}`,
        etiqueta:
          unidadesPropias.length > 1
            ? `Administración · Dpto ${u.codigo}`
            : "Administración",
      },
    ]);
  }, [esPersonal, areaPropia, unidades, unidadesPropias]);

  const [destino, setDestino] = useState("");

  const abrir = useMutation({
    mutationFn: async () => {
      const [area, unidadId] = destino.split(":");
      return abrirConversacionArea({
        condominioId,
        unidadId,
        area: area as "seguridad" | "administracion",
        usuarioId,
      });
    },
    onSuccess: (conversacionId) =>
      navigation.replace("ChatConversacion", { conversationId: conversacionId }),
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return (
    <ChatNewForm
      titulo={esPersonal ? "¿Con qué vivienda?" : "¿Con quién querés hablar?"}
      destinos={destinos}
      destino={destino}
      onDestinoChange={setDestino}
      onStartChat={() => abrir.mutate()}
      abriendo={abrir.isPending}
      aviso={
        esPersonal
          ? "La conversación queda asociada a la vivienda: la atiende quien esté de turno."
          : "Te responde quien esté de turno, no una persona en particular."
      }
    />
  );
}
