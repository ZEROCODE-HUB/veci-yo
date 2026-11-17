import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useUnidadesDisponibles, useNavegacion } from "@/shared/hooks";
import { abrirConversacionArea } from "../services/chat.repo";
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
    Un vecino elige a una persona de la portería --con su cargo y solo si
    está de turno-- o la administración (17/11/2026). La conversación sigue
    siendo la de su vivienda con la portería: la leen todos los que tienen el
    chat habilitado, así que si quien la atiende termina su turno, la sigue
    quien entre.
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
        const persona = personal.find((p) => `porteria:${p.membresiaId}` === elegido);
        // La lista se refresca cada minuto: quien terminó su turno ya no vale.
        if (!persona?.deTurno) {
          throw new Error("Esa persona ya no está de turno. Elige a quien esté ahora.");
        }
      }
      return abrirConversacionArea({
        condominioId,
        unidadId: viviendaId,
        area: elegido === "administracion" ? "administracion" : "seguridad",
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
