import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  crearEsquemaReclamo,
  type ReclamoFormularioValores,
} from "../schemas/reclamo.schema";
import { paisPorDefecto } from "@/shared/constants";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useLista } from "@/shared/hooks/useLista";
import { tiposDelArea } from "../helpers/tiposDePqrs";

export function useReclamoNuevo(
  defaultValues: Partial<ReclamoFormularioValores> = {},
) {
  /*
    Los largos del teléfono y del título son los de la base. Mientras no
    llegan no hay esquema, y la pantalla no pinta el formulario (`listo`).
  */
  const parametros = useParametrosDeLaBase();
  // Y qué áreas piden tipo, que son las listas de la base: sin ellas el
  // esquema no sabría si «Subcategoría» es obligatoria.
  const areas = useLista("areas_de_pqrs");
  const tipos = useLista("tipos_de_pqrs");
  const esquema = useMemo(
    () =>
      parametros.listo && areas.cargada && tipos.cargada
        ? crearEsquemaReclamo({
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            tituloMax: parametros.numero("pqrs_titulo_largo_maximo"),
            areaPideTipo: (area) => tiposDelArea(areas.opcion(area), tipos.opciones).length > 0,
          })
        : null,
    [parametros, areas, tipos],
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
      codigoPais: paisPorDefecto(),
      medioContacto: "",
      ...defaultValues,
    },
  });
  return { ...form, listo: esquema !== null };
}
