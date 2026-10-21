import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  crearEsquemaReclamo,
  type ReclamoFormularioValores,
} from "../schemas/reclamo.schema";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
import { useParametrosDeLaBase } from "@/shared/hooks";

export function useReclamoNuevo(
  defaultValues: Partial<ReclamoFormularioValores> = {},
) {
  /*
    Los largos del teléfono y del título son los de la base. Mientras no
    llegan no hay esquema, y la pantalla no pinta el formulario (`listo`).
  */
  const parametros = useParametrosDeLaBase();
  const esquema = useMemo(
    () =>
      parametros.listo
        ? crearEsquemaReclamo({
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            tituloMax: parametros.numero("pqrs_titulo_largo_maximo"),
          })
        : null,
    [parametros],
  );
  const form = useForm<ReclamoFormularioValores>({
    resolver: esquema ? zodResolver(esquema) : undefined,
    defaultValues: {
      titulo: "",
      descripcion: "",
      modelo: "",
      area: "",
      tipo: "",
      destinatario: "",
      correo: "",
      telefono: "",
      codigoPais: PAIS_POR_DEFECTO,
      medioContacto: "",
      ...defaultValues,
    },
  });
  return { ...form, listo: esquema !== null };
}
