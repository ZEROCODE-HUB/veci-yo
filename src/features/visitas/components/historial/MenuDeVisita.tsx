import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";

interface Props {
  /** La visita cuyo menú está abierto, o `null`. */
  item: VisitaItem | null;
  puedeEliminar: boolean;
  esAdmin: boolean;
  onClose: () => void;
  /** La ficha de la reserva, donde se corrigen fechas, huéspedes y clave. */
  onAbrirReserva: (item: VisitaItem) => void;
  /** Terminar una estancia en la que ya entró alguien. */
  onTerminar: (item: VisitaItem) => void;
  onEliminar: (item: VisitaItem) => void;
  onDenunciar: (item: VisitaItem) => void;
}

/**
 * El menú de los tres puntos de una tarjeta del historial.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 *
 * Una reserva de huésped (10/11/2026, decidido con el cliente): «Editar» abría
 * el detalle de solo lectura y no se podía editar nada; ahora es «Abrir la
 * reserva», la ficha donde sí se corrige. «Eliminar» solo mientras no ha
 * entrado nadie; con gente dentro, «Terminar estancia»; terminada, nada: queda
 * como constancia. La base lo sujeta igual.
 */
function yaEntroAlguien(item: VisitaItem): boolean {
  return item.estado !== "Programada" || (item.invitados ?? []).some((i) => i.llego);
}
export function MenuDeVisita({
  item,
  puedeEliminar,
  esAdmin,
  onClose,
  onAbrirReserva,
  onTerminar,
  onEliminar,
  onDenunciar,
}: Props) {
  // Cierra el menú y después actúa sobre la visita que estaba abierta.
  const y = (accion: (v: VisitaItem) => void) => () => {
    const v = item;
    onClose();
    if (v) accion(v);
  };

  return (
    <BottomSheet visible={!!item} onClose={onClose}>
      {item?.tipo === "huesped-temporal" ? (
        <>
          <BottomSheetOption label="Abrir la reserva" onPress={y(onAbrirReserva)} />
          {puedeEliminar && item.estado === "Ingresado" ? (
            <BottomSheetOption label="Terminar estancia" onPress={y(onTerminar)} />
          ) : null}
          {puedeEliminar && !yaEntroAlguien(item) ? (
            <BottomSheetOption label="Eliminar" onPress={y(onEliminar)} variant="danger" />
          ) : null}
        </>
      ) : (
        <>
          <BottomSheetOption
            label="Denunciar / Reportar"
            variant="primary"
            onPress={y(onDenunciar)}
          />
          {/*
            Una visita que ya entró es constancia de quién estuvo en el
            edificio: el vecino no la borra desde aquí (12/10/2026).
          */}
          {puedeEliminar && (esAdmin || item?.estado === "Programada") && (
            <BottomSheetOption label="Eliminar" onPress={y(onEliminar)} variant="danger" />
          )}
        </>
      )}
    </BottomSheet>
  );
}
