import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

interface Props {
  residente: ResidenteDeUnidad | null;
  puedeGestionar: boolean;
  /** Quien puede invitar a la vivienda puede darle la app a quien no la tiene. */
  puedeDarAcceso?: boolean;
  onClose: () => void;
  onEditar: (r: ResidenteDeUnidad) => void;
  onDarDeBaja: (r: ResidenteDeUnidad) => void;
  onDenunciar: (r: ResidenteDeUnidad) => void;
  onDarAcceso?: (r: ResidenteDeUnidad) => void;
}

/** El menú de los tres puntos de una persona de la vivienda. */
export function MenuDeResidente({
  residente,
  puedeGestionar,
  puedeDarAcceso = false,
  onClose,
  onEditar,
  onDarDeBaja,
  onDenunciar,
  onDarAcceso,
}: Props) {
  // Cierra el menú y después actúa sobre la persona que estaba abierta.
  const y = (accion: (r: ResidenteDeUnidad) => void) => () => {
    const r = residente;
    onClose();
    if (r) accion(r);
  };
  /*
    Vive aquí sin la app y es mayor de edad (17/11/2026): se le puede mandar
    la invitación, que al aceptarla se une a esta misma persona.
  */
  const ofrecerAcceso =
    puedeDarAcceso && Boolean(onDarAcceso) && Boolean(residente) && !residente?.usuarioId && !residente?.esMenor;
  return (
    <BottomSheet visible={!!residente} onClose={onClose}>
      {ofrecerAcceso && onDarAcceso ? (
        <BottomSheetOption label="Darle acceso a la app" variant="primary" onPress={y(onDarAcceso)} />
      ) : null}
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
