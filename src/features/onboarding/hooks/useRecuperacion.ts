import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { recuperacionSchema } from "../schemas";
import { solicitarRecuperacionRequest } from "../services";

export function useRecuperacion() {
  const [visible, setVisible] = useState(false);
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const mutation = useMutation({
    mutationFn: solicitarRecuperacionRequest,
    onSuccess: () => setEnviado(true),
  });

  const enviar = () => {
    const resultado = recuperacionSchema.safeParse({ correo: correo.trim() });
    if (!resultado.success) {
      setError("Ingresa un correo válido");
      return;
    }
    setError("");
    mutation.mutate(resultado.data.correo);
  };

  const cerrar = () => {
    setVisible(false);
    setTimeout(() => {
      setCorreo("");
      setEnviado(false);
      setError("");
    }, 200);
  };

  return {
    visible,
    correo,
    error,
    enviado,
    setVisible,
    setCorreo,
    setError,
    enviar,
    cerrar,
  };
}
