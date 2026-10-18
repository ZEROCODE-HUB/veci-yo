import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
import { enlaceDeLaInvitacionPendiente } from "@/shared/services/invitacionPendiente";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { crearEsquemaRegistro, type RegistroFormData } from "../schemas";

const REGISTRO_DEFAULT_VALUES: RegistroFormData = {
  nombre: "",
  apellido: "",
  correo: "",
  codigoPais: PAIS_POR_DEFECTO,
  telefono: "",
  tipoDocumento: "",
  identificacion: "",
  password: "",
  confirmPassword: "",
};

/** El desplegable enseña el nombre; la base guarda su clave. */
const TIPO_EN_LA_BASE: Record<string, string> = {
  Cédula: "cedula_ciudadania",
  Pasaporte: "pasaporte",
  DNI: "dni",
};

/**
 * Lo que responde el proveedor al registrar, dicho para quien lo lee.
 *
 * `contrasenaMin` es el mínimo de la base, el mismo que pide el formulario.
 */
function mensajeDeRegistro(fallo: unknown, contrasenaMin: number): string {
  const crudo =
    fallo && typeof fallo === "object" && "message" in fallo
      ? String((fallo as { message?: unknown }).message ?? "")
      : "";
  if (/ya hay una cuenta/i.test(crudo)) return crudo;
  if (/already registered|already been registered/i.test(crudo)) {
    return "Ya hay una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  }
  if (/rate limit/i.test(crudo)) {
    return "Se enviaron demasiados correos seguidos. Inténtalo dentro de unos minutos.";
  }
  if (/password/i.test(crudo)) {
    return `La contraseña no sirve: usa al menos ${contrasenaMin} caracteres.`;
  }
  if (/invalid/i.test(crudo) && /email/i.test(crudo)) {
    return "Ese correo no es válido.";
  }
  return "No se pudo crear la cuenta. Inténtalo de nuevo en unos minutos.";
}

export function useRegistro() {
  const registrarReal = useAuthStore((s) => s.registrarReal);
  const addToast = useUIStore((s) => s.addToast);
  /*
    Los largos del formulario son los de la base. Mientras no llegan no hay
    esquema, y la pantalla no pinta el formulario (`listo`).
  */
  const parametros = useParametrosDeLaBase();
  const esquema = useMemo(
    () =>
      parametros.listo
        ? crearEsquemaRegistro({
            nombreMin: parametros.numero("nombre_largo_minimo"),
            nombreMax: parametros.numero("nombre_largo_maximo"),
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            contrasenaMin: parametros.numero("contrasena_largo_minimo"),
          })
        : null,
    [parametros],
  );
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
        // Solo cifras y su país: el prefijo no se guarda, sale del catálogo.
        telefono: data.telefono.replace(/\D/g, ""),
        codigoPais: data.codigoPais,
        tipoDocumento: TIPO_EN_LA_BASE[data.tipoDocumento],
        identificacion: data.identificacion.trim(),
        // Si venía de una invitación, el correo de confirmación vuelve a ella.
        volverA: enlaceDeLaInvitacionPendiente(),
      });
      return { sesionAbierta, correo: data.correo.trim() };
    },
    onSuccess: ({ sesionAbierta, correo }) => {
      if (!sesionAbierta) setCorreoPorConfirmar(correo);
    },
    /*
      El fallo se dice aquí, y en castellano. Sin esto caía en el aviso
      central --«No se pudo guardar: User already registered»--: un «guardar»
      en una pantalla de alta, y la frase del proveedor en inglés.
    */
    onError: (fallo) =>
      addToast(
        mensajeDeRegistro(fallo, parametros.numero("contrasena_largo_minimo")),
        "error",
      ),
  });
  const form = useForm<RegistroFormData>({
    resolver: esquema ? zodResolver(esquema) : undefined,
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
    listo: esquema !== null,
  };
}
