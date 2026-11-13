import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores";
import { estadoDe, type EstadoDeLaCarga } from "@/shared/components";
import { guardarAlias, obtenerAlias } from "../services";

export function useAlias() {
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["perfil", "alias", usuarioId],
    queryFn: () => obtenerAlias(usuarioId),
    enabled: Boolean(usuarioId),
  });

  const [alias, setAlias] = useState("");
  const [usaEnCuadroHonor, setUsaEnCuadroHonor] = useState(false);
  const [cargado, setCargado] = useState(false);

  // El formulario arranca con lo guardado en cuanto llega.
  useEffect(() => {
    if (!query.data) return;
    setAlias(query.data.alias);
    setUsaEnCuadroHonor(query.data.usaEnCuadroHonor);
    setCargado(true);
  }, [query.data]);

  /*
    El alias arranca vacío hasta que llega el guardado, y «Guardar» funcionaba
    mientras tanto: se podía borrar el alias sin haberlo tocado (13/11/2026).
    Se cuenta como cargando hasta que el formulario tiene lo guardado.
  */
  const estadoConsulta = estadoDe(query);
  const carga: EstadoDeLaCarga = {
    ...estadoConsulta,
    cargando: estadoConsulta.cargando || (query.data !== undefined && !cargado),
  };

  const guardar = useMutation({
    mutationFn: () =>
      guardarAlias({
        usuarioId,
        datos: { alias, usaEnCuadroHonor },
      }),
    onSuccess: () => {
      addToast("Alias actualizado", "success");
      queryClient.invalidateQueries({ queryKey: ["perfil", "alias"] });
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    carga,
    /** Si ya tiene lo guardado: sin eso, guardar escribiría el alias vacío. */
    listo: cargado,
    alias,
    setAlias,
    usaEnCuadroHonor,
    setUsaEnCuadroHonor,
    guardar: () => {
      if (!cargado) return;
      guardar.mutate();
    },
    guardando: guardar.isPending,
  };
}
