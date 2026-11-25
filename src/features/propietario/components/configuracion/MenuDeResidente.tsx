import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

interface Props {
  residente: ResidenteDeUnidad | null;
  puedeGestionar: boolean;
  /** Quien puede invitar a la vivienda puede darle la app a quien no la tiene. */
  puedeDarAcceso?: boolean;
  onClose: () => void;
  /** Ver su ficha, sin editar (25/11/2026: «Editar» pasó a «Ver»). */
  onVer: (r: ResidenteDeUnidad) => void;
  onDarDeBaja: (r: ResidenteDeUnidad) => void;
  onDenunciar: (r: ResidenteDeUnidad) => void;
  onDarAcceso?: (r: ResidenteDeUnidad) => void;
  /** «Editar privilegios» (18/11/2026): quien gestiona la vivienda. */
  onPrivilegios?: (r: ResidenteDeUnidad) => void;
  /**
   * Darle o quitarle la renta corta al inquilino líder (18/11/2026): solo el
   * propietario, y si el edificio permite la renta corta.
   */
  puedeDarRentaCorta?: boolean;
  onRentaCorta?: (r: ResidenteDeUnidad) => void;
  /** Quien mira, para no ofrecerle cambiarse sus propios privilegios. */
  usuarioId?: string;
}

/** El menú de los tres puntos de una persona de la vivienda. */
export function MenuDeResidente({
  residente,
  puedeGestionar,
  puedeDarAcceso = false,
  onClose,
  onVer,
  onDarDeBaja,
  onDenunciar,
  onDarAcceso,
  onPrivilegios,
  puedeDarRentaCorta = false,
  onRentaCorta,
  usuarioId,
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
  const rol = residente?.rolBase;
  const ofrecerPrivilegios =
    puedeGestionar &&
    Boolean(onPrivilegios) &&
    Boolean(residente) &&
    rol !== "propietario" &&
    rol !== "huesped_temporal" &&
    residente?.usuarioId !== usuarioId;
  const ofrecerRentaCorta = puedeDarRentaCorta && Boolean(onRentaCorta) && rol === "inquilino_lider";
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
      <BottomSheetOption label="Ver" onPress={y(onVer)} />
      {ofrecerPrivilegios && onPrivilegios ? (
        <BottomSheetOption label="Editar privilegios" onPress={y(onPrivilegios)} />
      ) : null}
      {ofrecerRentaCorta && onRentaCorta ? (
        <BottomSheetOption
          label={residente?.puedeRentaCorta ? "Quitarle la renta corta" : "Darle la renta corta"}
          onPress={y(onRentaCorta)}
        />
      ) : null}
      {puedeGestionar && (
        <BottomSheetOption label="Dar de baja" variant="danger" onPress={y(onDarDeBaja)} />
      )}
      <BottomSheetOption label="Denunciar / Reportar" variant="primary" onPress={y(onDenunciar)} />
    </BottomSheet>
  );
}
