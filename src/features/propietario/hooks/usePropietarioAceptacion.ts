import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  aceptacionSchema,
  type AceptacionFormData,
} from "../schemas/propietario.schema";

export function usePropietarioAceptacion() {
  return useForm<AceptacionFormData>({
    resolver: zodResolver(aceptacionSchema),
    defaultValues: {
      permiteRentaCorta: false,
      permiteMascotas: false,
      aptoNinos: false,
    },
  });
}
