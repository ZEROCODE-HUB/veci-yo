import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

interface Props {
  residente: ResidenteDeUnidad | null;
  puedeGestionar: boolean;
  onClose: () => void;
  onEditar: (r: ResidenteDeUnidad) => void;
  onDarDeBaja: (r: ResidenteDeUnidad) => void;
  onDenunciar: (r: ResidenteDeUnidad) => void;
}

/** El menú de los tres puntos de una persona de la vivienda. */
export function MenuDeResidente({
  residente,
  puedeGestionar,
  onClose,
  onEditar,
  onDarDeBaja,
  onDenunciar,
}: Props) {
  // Cierra el menú y después actúa sobre la persona que estaba abierta.
  const y = (accion: (r: ResidenteDeUnidad) => void) => () => {
    const r = residente;
    onClose();
    if (r) accion(r);
  };
  return (
    <BottomSheet visible={!!residente} onClose={onClose}>
      {/*
        Solo quien gestiona la vivienda. A un residente cualquiera se le
        ofrecían las dos, y «Eliminar» le respondía «eliminado» sin eliminar a
        nadie: la base no le deja.
      */}
      {puedeGestionar && <BottomSheetOption label="Editar" onPress={y(onEditar)} />}
      {puedeGestionar && (
        <BottomSheetOption label="Dar de baja" variant="danger" onPress={y(onDarDeBaja)} />
      )}
      <BottomSheetOption label="Denunciar / Reportar" variant="primary" onPress={y(onDenunciar)} />
    </BottomSheet>
  );
}
