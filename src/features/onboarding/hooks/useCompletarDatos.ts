import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { paisPorDefecto } from "@/shared/constants";
import { useDocumentosParaRegistrarse, useParametrosDeLaBase } from "@/shared/hooks";
import { opcionesDeDocumento } from "@/shared/services/documentos.repo";
import { pistaDeDocumento } from "@/shared/utils/documento.util";
import { completarMisDatos } from "@/shared/services/sesion";
import { mensajeDeError } from "@/shared/utils/error.util";
import { crearEsquemaDatosPersonales, type DatosPersonalesFormData } from "../schemas";

/**
 * «Completa tus datos», para quien entró con Google (16/11/2026, cliente:
 * «quien entra con Google debe completar ese mismo formulario»). Los mismos
 * campos y las mismas reglas que el registro --vienen de la base--, sin correo
 * ni contraseña: el correo ya lo dio Google, verificado.
 */
export function useCompletarDatos() {
  const usuario = useAuthStore((s) => s.usuario);
  const sincronizarContexto = useAuthStore((s) => s.sincronizarContexto);
  const addToast = useUIStore((s) => s.addToast);
  const parametros = useParametrosDeLaBase();
  const documentos = useDocumentosParaRegistrarse();
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [terminosError, setTerminosError] = useState(false);

  const esquema = useMemo(
    () =>
      parametros.listo && documentos.listo
        ? crearEsquemaDatosPersonales({
            nombreMin: parametros.numero("nombre_largo_minimo"),
            nombreMax: parametros.numero("nombre_largo_maximo"),
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            documentos: documentos.reglas,
          })
        : null,
    [parametros, documentos.listo, documentos.reglas],
  );

  const form = useForm<DatosPersonalesFormData>({
    resolver: esquema ? zodResolver(esquema) : undefined,
    defaultValues: {
      nombre: usuario?.nombre ?? "",
      apellido: usuario?.apellido ?? "",
      codigoPais: paisPorDefecto(),
      telefono: usuario?.telefono ?? "",
      tipoDocumento: usuario?.tipoDocumento ?? "",
      identificacion: usuario?.identificacion ?? "",
    },
  });

  const guardar = useMutation({
    mutationFn: completarMisDatos,
    // Con el perfil completo, la navegación deja de pedir esta pantalla.
    onSuccess: () => sincronizarContexto(),
    onError: (e) => addToast(mensajeDeError(e, "No se pudieron guardar tus datos"), "error"),
  });

  const onSubmit = (datos: DatosPersonalesFormData) => {
    if (!terminosAceptados) {
      setTerminosError(true);
      return;
    }
    guardar.mutate(datos);
  };

  return {
    ...form,
    correo: usuario?.correo ?? "",
    listo: esquema !== null,
    tiposDocumento: opcionesDeDocumento(documentos.reglas),
    /** Lo que acepta el tipo elegido («Solo números, entre 5 y 12 cifras»). */
    pistaDelDocumento: (tipo: string) =>
      pistaDeDocumento(documentos.reglas.find((d) => d.tipo === tipo)),
    terminosAceptados,
    terminosError,
    setTerminosAceptados,
    setTerminosError,
    onSubmit,
    guardando: guardar.isPending,
  };
}
