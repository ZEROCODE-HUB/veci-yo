import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reclamoSchema,
  type ReclamoFormularioValores,
} from "../schemas/reclamo.schema";

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
      medioContacto: "",
      ...defaultValues,
    },
  });
}
