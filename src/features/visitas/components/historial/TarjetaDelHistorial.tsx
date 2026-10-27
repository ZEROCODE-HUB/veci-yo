import React from "react";
import type { VisitaItem } from "@/shared/types";
import { ReservaHuespedCard } from "../ReservaHuespedCard";
import { VisitaCard } from "../VisitaCard";

interface Props {
  item: VisitaItem;
  esGuardia: boolean;
  esAdmin: boolean;
  /** Los cupos de estacionamiento que ocupa, ya juntos para enseñar. */
  cupos?: string;
  onEstacionamiento: () => void;
  onMenu: () => void;
  /** Abre la estancia entera (una reserva, o una visita de varios en la portería). */
  onAbrirEstancia: () => void;
  /** Abre la lista de personas de una visita de varios. */
  onAbrirPersonas: () => void;
  /** Abre la ficha de la visita, de una persona si se da su posición. */
  onAbrirFicha: (persona: number | null) => void;
}

/**
 * Una fila del historial de visitas.
 *
 * La tarjeta la decide el elemento, no la pestaña. Antes iban atadas, así que
 * una lista mezclada era imposible: en «Todos» una reserva de huésped se habría
 * pintado como una visita corriente.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function TarjetaDelHistorial({
  item,
  esGuardia,
  esAdmin,
  cupos,
  onEstacionamiento,
  onMenu,
  onAbrirEstancia,
  onAbrirPersonas,
  onAbrirFicha,
}: Props) {
  if (item.tipo === "huesped-temporal") {
    return (
      <ReservaHuespedCard
        item={item}
        showParkingAction={esAdmin}
        isGuardia={esGuardia}
        showMenu={!esGuardia}
        showDepartment={esAdmin || esGuardia}
        assignedParking={cupos || undefined}
        onParkingPress={onEstacionamiento}
        onPress={onAbrirEstancia}
        onMenuPress={onMenu}
      />
    );
  }

  const variasPersonas = (item.invitados?.length ?? 0) > 1;
  return (
    <VisitaCard
      item={item}
      ocultarDocumento={esGuardia}
      showParkingAction={esGuardia || esAdmin}
      onParkingPress={onEstacionamiento}
      onPress={() => {
        // La portería abre una visita de varios entera; los demás, su lista.
        if (variasPersonas) {
          if (esGuardia) onAbrirEstancia();
          else onAbrirPersonas();
          return;
        }
        onAbrirFicha(esGuardia && item.invitados?.length === 1 ? 0 : null);
      }}
      onMenuPress={onMenu}
    />
  );
}
