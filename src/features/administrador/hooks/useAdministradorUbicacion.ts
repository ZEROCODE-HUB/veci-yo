import { useMutation } from "@tanstack/react-query";
import { saveUbicacionRequest } from "../services/administradorUbicacion.service";

export function useAdministradorUbicacion() {
  return useMutation({ mutationFn: saveUbicacionRequest });
}
