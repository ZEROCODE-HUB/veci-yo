import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { alCambiarElPaisPorDefecto, paisPorDefecto } from "@/shared/constants";
import {
  enlaceDeLaInvitacionPendiente,
  invitacionPendiente,
} from "@/shared/services/invitacionPendiente";
import { datosParaRegistrarse } from "@/shared/services/invitaciones";
import { olvidarCorreoPorConfirmar, recordarCorreoPorConfirmar } from "@/shared/services/correoPorConfirmar";
import { useDocumentosParaRegistrarse, useParametrosDeLaBase } from "@/shared/hooks";
import { opcionesDeDocumento } from "@/shared/services/documentos.repo";
import { pistaDeDocumento } from "@/shared/utils/documento.util";
import { crearEsquemaRegistro, type RegistroFormData } from "../schemas";

// Una función: el país es el ajuste `pais_por_defecto`, que llega al abrir la
// app; una constante lo fijaría antes, al cargar el código (29/10/2026).
const valoresInicialesDelRegistro = (): RegistroFormData => ({
  nombre: "",
  apellido: "",
  correo: "",
  codigoPais: paisPorDefecto(),
  telefono: "",
  tipoDocumento: "",
  identificacion: "",
  password: "",
  confirmPassword: "",
});


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
    Hasta el 17/11/2026 la contraseña se guardaba en memoria para entrar sola
    al volver de pulsar el enlace del correo, y si el celular cerraba la app
    mientras tanto se perdía. Ahora el correo trae un código que se escribe en
    esta misma pantalla (`CodigoDeConfirmacion`), y al confirmarlo la sesión
    queda abierta: no hace falta recordar nada más que el correo.
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
        // Ya es la clave de la base: el desplegable enseña el nombre.
        tipoDocumento: data.tipoDocumento,
        identificacion: data.identificacion.trim(),
        // Si venía de una invitación, el correo de confirmación vuelve a ella.
        volverA: await enlaceDeLaInvitacionPendiente(),
      });
      return { sesionAbierta, correo: data.correo.trim() };
    },
    onSuccess: ({ sesionAbierta, correo }) => {
      if (!sesionAbierta) {
        // Por si el celular cierra la app mientras va al correo (16/11/2026).
        void recordarCorreoPorConfirmar(correo);
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
    defaultValues: valoresInicialesDelRegistro(),
  });

  /*
    Si viene de una invitación, lo que ya dio --en su preregistro, o lo que
    escribió quien la invitó-- no se vuelve a pedir (hueco 58, 27/10/2026).
    Solo rellena lo que siga vacío: no pisa lo que haya empezado a escribir.
  */
  const { getValues, setValue } = form;

  /*
    El registro se puede abrir antes de que llegue el ajuste del país: si
    llega después y la persona no lo ha cambiado a mano, se pone al día.
  */
  const pais = useSyncExternalStore(alCambiarElPaisPorDefecto, paisPorDefecto);
  useEffect(() => {
    if (!form.getFieldState("codigoPais").isDirty) setValue("codigoPais", pais);
  }, [pais, form, setValue]);
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
    /** «Usar otro correo»: vuelve al formulario. */
    cambiarDeCorreo: () => {
      setCorreoPorConfirmar(null);
      void olvidarCorreoPorConfirmar();
    },
    listo: esquema !== null,
    tiposDocumento: opcionesDeDocumento(documentos.reglas),
    /** Lo que acepta el tipo elegido («Solo números, entre 5 y 12 cifras»). */
    pistaDelDocumento: (tipo: string) =>
      pistaDeDocumento(documentos.reglas.find((d) => d.tipo === tipo)),
    // Para el texto del campo: decía «Mínimo 8» escrito a mano.
    contrasenaMin: parametros.listo ? parametros.numero("contrasena_largo_minimo") : null,
  };
}
