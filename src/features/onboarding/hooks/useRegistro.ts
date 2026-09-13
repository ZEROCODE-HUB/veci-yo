import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { registrarUsuarioRequest } from "../services";
import { registroSchema, type RegistroFormData } from "../schemas";

const REGISTRO_DEFAULT_VALUES: RegistroFormData = {
  nombre: "",
  apellido: "",
  correo: "",
  codArea: "",
  telefono: "",
  tipoDocumento: "",
  identificacion: "",
  fechaUltimoIngreso: "",
  motivoAlojamiento: "",
  password: "",
  confirmPassword: "",
};

export function useRegistro() {
  const { registrarUsuario } = useAuthStore();
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [terminosError, setTerminosError] = useState(false);
  const mutation = useMutation({
    mutationFn: registrarUsuarioRequest,
    onSuccess: (data) => {
      registrarUsuario({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        correo: data.correo.trim(),
        telefono: `${data.codArea.trim()} ${data.telefono.trim()}`,
        tipoDocumento: data.tipoDocumento,
        identificacion: data.identificacion.trim(),
      });
    },
  });
  const form = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
    defaultValues: REGISTRO_DEFAULT_VALUES,
  });

  const onSubmit = (data: RegistroFormData) => {
    if (!terminosAceptados) {
      setTerminosError(true);
      return;
    }
    mutation.mutate(data);
  };

  return {
    ...form,
    terminosAceptados,
    terminosError,
    setTerminosAceptados,
    setTerminosError,
    onSubmit,
  };
}
