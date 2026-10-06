import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUnidadActiva } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
import {
  agregarServicioSchema,
  type AgregarServicioFormData,
} from "../schemas/agregar-servicio.schema";
import {
  agregarServicioDeVivienda,
  borrarServicioDeVivienda,
  obtenerServiciosDeVivienda,
} from "../services/serviciosDeVivienda.repo";

export const serviciosDeViviendaQueryKey = ["propietario", "servicios"] as const;

/**
 * Los servicios contratados de la vivienda.
 *
 * Esto llamaba a `simularAgregarServicio`, que esperaba 180 ms y devolvía lo
 * que le dieras: el último servicio que fingía en todo el proyecto. La
 * pantalla estaba terminada desde el prototipo y lo que faltaba era la tabla.
 *
 * Los días de aviso viajan como **texto** en el formulario —son un `Input`— y
 * se convierten a número aquí, que es la frontera. Un «15» escrito es un
 * `string`; la columna es `smallint`.
 */
export function usePropietarioServicio() {
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const lista = useQuery({
    queryKey: [...serviciosDeViviendaQueryKey, unidadId],
    queryFn: () => obtenerServiciosDeVivienda(unidadId),
    enabled: Boolean(unidadId),
  });

  const form = useForm<AgregarServicioFormData>({
    resolver: zodResolver(agregarServicioSchema),
    defaultValues: {
      nombreServicio: "",
      nombreEmpresa: "",
      numeroCliente: "",
      numeroMedidor: "",
      primerAviso: "",
      segundoAviso: "",
      correoFactura: "",
      codigoPais: PAIS_POR_DEFECTO,
      numeroTelefono: "",
    },
  });

  /** `"15"` → `15`; `""` o cualquier cosa rara → `null`, que es «no se dijo». */
  const aDia = (texto: string | undefined): number | null => {
    const n = Number.parseInt((texto ?? "").trim(), 10);
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
  };

  const invalidar = () =>
    client.invalidateQueries({ queryKey: serviciosDeViviendaQueryKey });

  const agregar = useMutation({
    mutationFn: (datos: AgregarServicioFormData) =>
      agregarServicioDeVivienda({
        unidadId,
        nombre: datos.nombreServicio,
        empresa: datos.nombreEmpresa,
        numeroCliente: datos.numeroCliente,
        numeroMedidor: datos.numeroMedidor,
        diaPrimerAviso: aDia(datos.primerAviso),
        diaSegundoAviso: aDia(datos.segundoAviso),
        correoFactura: datos.correoFactura,
        telefono: datos.numeroTelefono,
        codigoPais: datos.codigoPais,
      }),
    onSuccess: invalidar,
    /*
      El motivo, no un texto genérico. Lo que devuelve Supabase es un objeto
      plano —no hereda de `Error`— así que un `e instanceof Error` lo tiraría,
      y aquí hay motivos que quien lo lee puede arreglar: «Falta el nombre del
      servicio», «El día debe estar entre 1 y 31».
    */
    onError: (e) =>
      addToast(mensajeDeError(e, "No pudimos guardar el servicio"), "error"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => borrarServicioDeVivienda(id),
    onSuccess: () => {
      invalidar();
      addToast("Servicio eliminado", "success");
    },
    onError: (e) =>
      addToast(mensajeDeError(e, "No pudimos eliminar el servicio"), "error"),
  });

  return {
    ...form,
    agregar,
    borrar,
    servicios: lista.data ?? [],
    cargando: lista.isLoading,
    /** Sin vivienda activa no hay dónde guardar, y la pantalla lo dice. */
    hayVivienda: Boolean(unidadId),
  };
}
