import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";

interface Props {
  /** La visita cuyo menú está abierto, o `null`. */
  item: VisitaItem | null;
  puedeEliminar: boolean;
  esAdmin: boolean;
  onClose: () => void;
  onEditar: (item: VisitaItem) => void;
  onEliminar: (item: VisitaItem) => void;
  onDenunciar: (item: VisitaItem) => void;
}

/**
 * El menú de los tres puntos de una tarjeta del historial.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function MenuDeVisita({
  item,
  puedeEliminar,
  esAdmin,
  onClose,
  onEditar,
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
          <BottomSheetOption label="Editar" onPress={y(onEditar)} />
          {puedeEliminar && (
            <BottomSheetOption label="Eliminar" onPress={y(onEliminar)} variant="danger" />
          )}
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
