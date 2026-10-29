import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
import {
  enlaceDeLaInvitacionPendiente,
  invitacionPendiente,
} from "@/shared/services/invitacionPendiente";
import { datosParaRegistrarse } from "@/shared/services/invitaciones";
import { useDocumentosParaRegistrarse, useParametrosDeLaBase } from "@/shared/hooks";
import { opcionesDeDocumento } from "@/shared/services/documentos.repo";
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
  const documentos = useDocumentosParaRegistrarse();
  const esquema = useMemo(
    () =>
      parametros.listo && documentos.listo
        ? crearEsquemaRegistro({
            nombreMin: parametros.numero("nombre_largo_minimo"),
            nombreMax: parametros.numero("nombre_largo_maximo"),
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            contrasenaMin: parametros.numero("contrasena_largo_minimo"),
            documentos: documentos.reglas,
          })
        : null,
    [parametros, documentos.listo, documentos.reglas],
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
  /*
    Lo que escribió al registrarse, solo en memoria y solo mientras espera a
    confirmar el correo: al volver a la app se entra con eso, sin pedirle que
    lo escriba otra vez (QA 23/10/2026: «después de registrarse quiero que el
    usuario ya esté logueado»).
  */
  const credenciales = useRef<{ correo: string; password: string } | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const iniciarSesionReal = useAuthStore((s) => s.iniciarSesionReal);

  const entrarSiYaConfirmo = useCallback(
    async (avisarSiNo: boolean) => {
      const c = credenciales.current;
      if (!c) return;
      setComprobando(true);
      try {
        await iniciarSesionReal(c.correo, c.password);
        credenciales.current = null;
      } catch {
        if (avisarSiNo) {
          addToast("Todavía no vemos tu correo confirmado. Abre el mensaje y pulsa el enlace.", "info");
        }
      } finally {
        setComprobando(false);
      }
    },
    [iniciarSesionReal, addToast],
  );

  // Al volver a la app (después de abrir el correo), se intenta entrar.
  useEffect(() => {
    if (!correoPorConfirmar) return;
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void entrarSiYaConfirmo(false);
    });
    return () => suscripcion.remove();
  }, [correoPorConfirmar, entrarSiYaConfirmo]);

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
        // Ya es la clave de la base: el desplegable enseña el nombre.
        tipoDocumento: data.tipoDocumento,
        identificacion: data.identificacion.trim(),
        // Si venía de una invitación, el correo de confirmación vuelve a ella.
        volverA: await enlaceDeLaInvitacionPendiente(),
      });
      return { sesionAbierta, correo: data.correo.trim(), password: data.password };
    },
    onSuccess: ({ sesionAbierta, correo, password }) => {
      if (!sesionAbierta) {
        credenciales.current = { correo, password };
        setCorreoPorConfirmar(correo);
      }
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

  /*
    Si viene de una invitación, lo que ya dio --en su preregistro, o lo que
    escribió quien la invitó-- no se vuelve a pedir (hueco 58, 27/10/2026).
    Solo rellena lo que siga vacío: no pisa lo que haya empezado a escribir.
  */
  const { getValues, setValue } = form;
  useEffect(() => {
    const token = invitacionPendiente();
    if (!token) return;
    let vigente = true;
    datosParaRegistrarse(token)
      .then((datos) => {
        if (!vigente || !datos) return;
        const campos: [keyof RegistroFormData, string][] = [
          ["nombre", datos.nombre],
          ["apellido", datos.apellido],
          ["correo", datos.correo],
          ["telefono", datos.telefono],
          ["tipoDocumento", datos.tipoDocumento],
          ["identificacion", datos.documento],
        ];
        // El país va con su teléfono: solo si el teléfono también se rellena.
        if (datos.codigoPais && datos.telefono && !getValues("telefono")) {
          setValue("codigoPais", datos.codigoPais);
        }
        for (const [campo, valor] of campos) {
          if (valor && !getValues(campo)) setValue(campo, valor);
        }
      })
      // Sin los datos se escribe a mano, como siempre: no es un error que mostrar.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [getValues, setValue]);

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
    yaConfirme: () => void entrarSiYaConfirmo(true),
    comprobando,
    listo: esquema !== null,
    tiposDocumento: opcionesDeDocumento(documentos.reglas),
    // Para el texto del campo: decía «Mínimo 8» escrito a mano.
    contrasenaMin: parametros.listo ? parametros.numero("contrasena_largo_minimo") : null,
  };
}
