import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  agregarServicioSchema,
  type AgregarServicioFormData,
} from "../schemas/agregar-servicio.schema";
import { simularAgregarServicio } from "../services/propietario.service";

export function usePropietarioServicio() {
  const form = useForm<AgregarServicioFormData>({
    resolver: zodResolver(agregarServicioSchema),
    defaultValues: {
      nombreServicio: "",
      nombreEmpresa: "",
      numeroCliente: "",
      numeroMedidor: "",
      primerAviso: "",
      segundoAviso: "",
      correoFactura: "",
      codigoArea: "",
      numeroTelefono: "",
    },
  });
  const agregar = useMutation({
    mutationFn: (datos: AgregarServicioFormData) =>
      simularAgregarServicio(datos),
  });
  return { ...form, agregar };
}
