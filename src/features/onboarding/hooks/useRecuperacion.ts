import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { recuperacionSchema } from "../schemas";
import { solicitarRecuperacionRequest } from "../services";
import { mensajeDeError } from "@/shared/utils/error.util";

export function useRecuperacion() {
  const [visible, setVisible] = useState(false);
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const mutation = useMutation({
    mutationFn: solicitarRecuperacionRequest,
    onSuccess: () => setEnviado(true),
    /*
      Si el envío falla, se dice. El proyecto usa el servidor de correo
      compartido de Supabase --dos por hora-- así que fallar es algo que va a
      pasar, y «te enviamos instrucciones» sobre un correo que no salió deja a
      alguien esperando sin saber que no llega.
    */
    onError: (e: unknown) =>
      setError(
        mensajeDeError(
          e,
          "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.",
        ),
      ),
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
