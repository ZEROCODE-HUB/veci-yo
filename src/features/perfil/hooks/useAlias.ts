import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores";
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
  const [usaEnZonas, setUsaEnZonas] = useState(false);

  // El formulario arranca con lo guardado en cuanto llega.
  useEffect(() => {
    if (!query.data) return;
    setAlias(query.data.alias);
    setUsaEnCuadroHonor(query.data.usaEnCuadroHonor);
    setUsaEnZonas(query.data.usaEnZonas);
  }, [query.data]);

  const guardar = useMutation({
    mutationFn: () =>
      guardarAlias({
        usuarioId,
        datos: { alias, usaEnCuadroHonor, usaEnZonas },
      }),
    onSuccess: () => {
      addToast("Alias actualizado", "success");
      queryClient.invalidateQueries({ queryKey: ["perfil", "alias"] });
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    alias,
    setAlias,
    usaEnCuadroHonor,
    setUsaEnCuadroHonor,
    usaEnZonas,
    setUsaEnZonas,
    guardar: () => guardar.mutate(),
    guardando: guardar.isPending,
  };
}
