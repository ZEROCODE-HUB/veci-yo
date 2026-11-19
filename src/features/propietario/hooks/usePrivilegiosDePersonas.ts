import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  cambiarPrivilegios,
  darRentaCortaAlInquilino,
  type ResidenteDeUnidad,
} from "../services/residentes.repo";
import { RESIDENTES_UNIDAD_KEY } from "./usePropietarioConfiguracion";

/**
 * «Editar privilegios» y «Darle la renta corta» de las personas de la
 * vivienda (18/11/2026, pedido del cliente). La base comprueba quién pide.
 */
export function usePrivilegiosDePersonas() {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [privilegiosDe, setPrivilegiosDe] = useState<ResidenteDeUnidad | null>(null);
  const refrescar = () => void cliente.invalidateQueries({ queryKey: RESIDENTES_UNIDAD_KEY });

  const guardarPrivilegios = useMutation({
    mutationFn: (p: { registraVisitas: boolean; reservaZonas: boolean }) =>
      cambiarPrivilegios(privilegiosDe?.id ?? "", p),
    onSuccess: () => {
      setPrivilegiosDe(null);
      refrescar();
      addToast("Privilegios guardados", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudieron guardar los privilegios"), "error"),
  });

  const rentaCorta = useMutation({
    mutationFn: (r: ResidenteDeUnidad) => darRentaCortaAlInquilino(r.id, !r.puedeRentaCorta),
    onSuccess: (_, r) => {
      refrescar();
      addToast(
        r.puedeRentaCorta
          ? `${r.nombre} ya no maneja la renta corta`
          : `${r.nombre} ya puede manejar la renta corta. Queda como no residente: mientras se alquila por noches, nadie vive en la vivienda.`,
        "success",
      );
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo cambiar la renta corta"), "error"),
  });

  return {
    privilegiosDe,
    abrirPrivilegios: setPrivilegiosDe,
    cerrarPrivilegios: () => setPrivilegiosDe(null),
    guardarPrivilegios: guardarPrivilegios.mutate,
    guardandoPrivilegios: guardarPrivilegios.isPending,
    cambiarRentaCorta: rentaCorta.mutate,
  };
}
