import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useUnidadesDisponibles, useNavegacion } from "@/shared/hooks";
import { abrirChatConLaPorteria, abrirConversacionArea } from "../services/chat.repo";
import { mensajeDeError } from "@/shared/utils/error.util";
import { ChatNewForm, type DestinoChat } from "../components/chat/ChatNewForm";
import { ElegirAQuienEscribir } from "../components/chat/ElegirAQuienEscribir";
import { usePersonalDePorteria } from "../hooks/usePersonalDePorteria";

/**
 * El destino se codifica como `<area>:<unidadId>`, que es exactamente lo que
 * identifica una conversación de área.
 */
export function ChatNuevoScreen() {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const unidadesPropias = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { unidades } = useUnidadesDisponibles();

  const esPersonal = rolActivo === "guardia" || rolActivo === "administrador";
  const areaPropia = rolActivo === "administrador" ? "administracion" : "seguridad";

  // El personal escribe a una vivienda, siempre desde su propia área.
  const destinos = useMemo<DestinoChat[]>(
    () =>
      unidades.map((u) => ({
        valor: `${areaPropia}:${u.unidadId}`,
        etiqueta: `${u.torre} · Dpto ${u.codigo}`,
      })),
    [areaPropia, unidades],
  );
  const [destino, setDestino] = useState("");

  /*
    Un vecino elige a una persona de la portería --con su cargo-- o la
    administración (17/11/2026). Desde el 18/11/2026 cada persona de la
    portería tiene su propio chat con la vivienda, con su nombre arriba, y se
    le puede escribir aunque no esté de turno: el mensaje le espera y le llega
    el aviso. Antes se abría el hilo de la vivienda con toda la portería.
  */
  const { personal, cargando: cargandoPersonal } = usePersonalDePorteria(
    condominioId,
    !esPersonal,
  );
  const [viviendaElegida, setViviendaElegida] = useState("");
  const viviendaId = viviendaElegida || unidadesPropias[0]?.unidadId || "";
  const [elegido, setElegido] = useState("");

  const abrir = useMutation({
    mutationFn: async () => {
      if (esPersonal) {
        const [area, unidadId] = destino.split(":");
        return abrirConversacionArea({
          condominioId,
          unidadId,
          area: area as "seguridad" | "administracion",
          usuarioId,
        });
      }
      if (elegido.startsWith("porteria:")) {
        return abrirChatConLaPorteria({
          unidadId: viviendaId,
          membresiaId: elegido.slice("porteria:".length),
        });
      }
      return abrirConversacionArea({
        condominioId,
        unidadId: viviendaId,
        area: "administracion",
        usuarioId,
      });
    },
    onSuccess: (conversacionId) =>
      navigation.replace("ChatConversacion", { conversationId: conversacionId }),
    onError: (error: Error) =>
      addToast(mensajeDeError(error, "No se pudo abrir el chat"), "error"),
  });

  if (!esPersonal) {
    return (
      <ElegirAQuienEscribir
        viviendas={unidadesPropias.map((u) => ({
          unidadId: u.unidadId,
          etiqueta: `Dpto ${u.codigo}`,
        }))}
        viviendaId={viviendaId}
        onVivienda={setViviendaElegida}
        personal={personal}
        cargandoPersonal={cargandoPersonal}
        elegido={elegido}
        onElegir={setElegido}
        onStartChat={() => abrir.mutate()}
        abriendo={abrir.isPending}
      />
    );
  }

  return (
    <ChatNewForm
      titulo="¿Con qué vivienda?"
      destinos={destinos}
      destino={destino}
      onDestinoChange={setDestino}
      onStartChat={() => abrir.mutate()}
      abriendo={abrir.isPending}
      aviso="La conversación queda asociada a la vivienda: la atiende quien esté de turno."
    />
  );
}
