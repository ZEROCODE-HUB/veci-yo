import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reclamoSchema,
  type ReclamoFormularioValores,
} from "../schemas/reclamo.schema";
import { PAIS_POR_DEFECTO } from "@/shared/constants";

export function useReclamoNuevo(
  defaultValues: Partial<ReclamoFormularioValores> = {},
) {
  return useForm<ReclamoFormularioValores>({
    resolver: zodResolver(reclamoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      modelo: "",
      area: "",
      tipo: "",
      destinatario: "",
      correo: "",
      telefono: "",
      codigoPais: PAIS_POR_DEFECTO,
      medioContacto: "",
      ...defaultValues,
    },
  });
}
