import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerNombreUsuario,
  obtenerTurnoActual,
} from "../helpers/perfil.helpers";
import {
  MI_PUESTO,
  obtenerMiPuestoDeGuardia,
  terminarMiTurno,
} from "../services/miTurno.repo";
import type { GuardiaPerfil } from "../types/perfil";

export function usePerfil() {
  const { usuario, rolActivo, modo } = useAuthStore();
  const condominioId = useCondominioActivo() ?? "";
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const esGuardia = rolActivo === "guardia";

  /*
    El puesto se pide por la cuenta, no por el nombre de pila en un almacén en
    memoria con «Roberto Hornado» de respaldo (13/10/2026).
  */
  const puesto = useQuery({
    queryKey: [...MI_PUESTO, condominioId],
    queryFn: () => obtenerMiPuestoDeGuardia(condominioId),
    enabled: esGuardia && Boolean(condominioId),
  });

  const guardiaActual: GuardiaPerfil | null =
    esGuardia && puesto.data ? puesto.data : null;

  const terminar = useMutation({
    mutationFn: () => terminarMiTurno(condominioId),
    onSuccess: (hora) => {
      void cliente.invalidateQueries({ queryKey: MI_PUESTO });
      // Sin prometer lo que no pasa: decía «tus privilegios de seguridad se
      // han deshabilitado», y no se deshabilitaba nada.
      addToast(`Turno terminado a las ${hora}.`, "success");
    },
    onError: (fallo) =>
      addToast(mensajeDeError(fallo, "No se pudo terminar el turno"), "error"),
  });

  return {
    usuario,
    rolActivo,
    modo,
    nombre: obtenerNombreUsuario(usuario),
    esGuardia,
    esHuespedTemporal: rolActivo === "huesped-temporal",
    guardiaActual,
    turnoActual: obtenerTurnoActual(guardiaActual),
    terminarTurno: terminar.mutate,
    terminandoTurno: terminar.isPending,
  };
}
