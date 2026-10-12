import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
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

/** El desplegable enseña el nombre; la base guarda su clave. */
const TIPO_EN_LA_BASE: Record<string, string> = {
  Cédula: "cedula_ciudadania",
  Pasaporte: "pasaporte",
  DNI: "dni",
};

export function useRegistro() {
  const registrarReal = useAuthStore((s) => s.registrarReal);
  /*
    El correo al que hay que ir a confirmar, cuando la cuenta se creó pero la
    sesión no quedó abierta. Mientras esté puesto, la pantalla lo dice en vez
    de dar a la persona por dentro.
  */
  const [correoPorConfirmar, setCorreoPorConfirmar] = useState<string | null>(
    null,
  );
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [terminosError, setTerminosError] = useState(false);
  /*
    Esto era `await esperar(); return data` y un `set({ autenticado: true })`:
    **no creaba ninguna cuenta**. La persona veía la aplicación por dentro
    hasta la primera cosa que tocaba la base, y al recargar estaba fuera. Lo
    destapó aceptar una invitación recién «registrado»: «Se requiere una
    sesión iniciada» (12/10/2026). El alta de verdad estaba escrita en
    `registrarReal` y no la llamaba nadie.
  */
  const mutation = useMutation({
    mutationFn: async (data: RegistroFormData) => {
      const sesionAbierta = await registrarReal({
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        correo: data.correo.trim(),
        password: data.password,
        telefono: `${data.codArea.trim()} ${data.telefono.trim()}`.trim(),
        tipoDocumento: TIPO_EN_LA_BASE[data.tipoDocumento],
        identificacion: data.identificacion.trim(),
      });
      return { sesionAbierta, correo: data.correo.trim() };
    },
    onSuccess: ({ sesionAbierta, correo }) => {
      if (!sesionAbierta) setCorreoPorConfirmar(correo);
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
    registrando: mutation.isPending,
    correoPorConfirmar,
  };
}
