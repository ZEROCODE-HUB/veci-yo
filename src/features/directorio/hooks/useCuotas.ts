import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import {
  cambiarImporteDeCuota,
  obtenerEstadoDeCuotas,
  registrarAbono,
  registrarAbonosMasivos,
  crearCuotaDelMes,
  guardarCuotaDeUnidad,
  marcarPago,
  marcarPagosMasivo,
  obtenerComite,
  obtenerConfiguracionCuotas,
  obtenerCuotasPorUnidad,
  obtenerPagos,
  obtenerPeriodos,
  ponerEnComite,
} from "../services/cuotas.repo";

/**
 * El registro de pagos de la cuota de administración (KT flujo 4.6).
 *
 * Las dos vías que pide el KT —la casilla por vivienda y la carga masiva—
 * escriben ahora en `pago_cuota`. Antes la primera guardaba en un store de
 * Zustand y la segunda era un `delay(200)`.
 *
 * El periodo importa y antes no existía: marcar "pagado" sin decir de qué mes
 * no significa nada, y el Cuadro de Honor cuenta por periodo.
 *
 * Desde el 13/10/2026 también crea el mes, lleva el importe propio de una
 * vivienda y el comité de propietarios, que vivía en memoria.
 */
export function useCuotas() {
  const condominioId = useCondominioActivo() ?? "";
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [cuotaId, setCuotaId] = useState("");

  const periodos = useQuery({
    queryKey: ["cuotas", "periodos", condominioId],
    queryFn: () => obtenerPeriodos(condominioId),
    enabled: Boolean(condominioId),
  });

  // El más reciente, mientras no se elija otro.
  useEffect(() => {
    if (!cuotaId && periodos.data?.length) setCuotaId(periodos.data[0].id);
  }, [cuotaId, periodos.data]);

  const pagos = useQuery({
    queryKey: ["cuotas", "pagos", cuotaId],
    queryFn: () => obtenerPagos(cuotaId),
    enabled: Boolean(cuotaId),
  });

  // Mensual, variables, total, pagado y saldo de cada vivienda (187 y 188).
  const estado = useQuery({
    queryKey: ["cuotas", "pagos", "estado", cuotaId],
    queryFn: () => obtenerEstadoDeCuotas(cuotaId),
    enabled: Boolean(cuotaId),
  });

  const configuracion = useQuery({
    queryKey: ["cuotas", "configuracion", condominioId],
    queryFn: () => obtenerConfiguracionCuotas(condominioId),
    enabled: Boolean(condominioId),
  });

  const importes = useQuery({
    queryKey: ["cuotas", "importes", condominioId],
    queryFn: () => obtenerCuotasPorUnidad(condominioId),
    enabled: Boolean(condominioId),
  });

  const comite = useQuery({
    queryKey: ["cuotas", "comite", condominioId],
    queryFn: () => obtenerComite(condominioId),
    enabled: Boolean(condominioId),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["cuotas", "pagos"] });
    // El Cuadro de Honor cuenta a partir de estos pagos.
    void queryClient.invalidateQueries({ queryKey: ["cuadro-honor"] });
  };

  /*
    El motivo, que la base sabe decir. Las cuatro tiraban el error y dejaban
    «No se pudo registrar el pago», sin distinguir un permiso que falta de una
    red caída.
  */
  const avisar = (porDefecto: string) => (fallo: unknown) =>
    addToast(mensajeDeError(fallo, porDefecto), "error");

  const marcar = useMutation({
    mutationFn: (datos: { unidadId: string; pagado: boolean }) =>
      marcarPago({ cuotaId, ...datos }),
    onSuccess: invalidar,
    onError: avisar("No se pudo registrar el pago"),
  });

  const masivo = useMutation({
    mutationFn: (codigos: string[]) => marcarPagosMasivo({ cuotaId, codigos }),
    onSuccess: (resultado) => {
      invalidar();
      // Se dice lo que se registró, no lo que traía el archivo.
      addToast(
        resultado.noEncontradas.length === 0
          ? `${resultado.marcadas} vivienda(s) marcadas como pagadas`
          : `${resultado.marcadas} marcadas. No se encontraron: ${resultado.noEncontradas.join(", ")}`,
        resultado.noEncontradas.length === 0 ? "success" : "info",
      );
    },
    onError: avisar("No se pudo cargar el archivo"),
  });

  const importeDelMes = useMutation({
    mutationFn: (datos: { unidadId: string; mensual: number | null; variables: number[] }) =>
      cambiarImporteDeCuota({ cuotaId, ...datos }),
    onSuccess: () => {
      invalidar();
      void queryClient.invalidateQueries({ queryKey: ["cuotas", "importes"] });
      addToast("Importe guardado", "success");
    },
    onError: avisar("No se pudo guardar el importe"),
  });

  const abonar = useMutation({
    mutationFn: (datos: { unidadId: string; monto: number }) => registrarAbono({ cuotaId, ...datos }),
    onSuccess: () => {
      invalidar();
      addToast("Pago registrado", "success");
    },
    onError: avisar("No se pudo registrar el pago"),
  });

  const abonosMasivos = useMutation({
    mutationFn: (filas: { codigo: string; monto: string }[]) => registrarAbonosMasivos(cuotaId, filas),
    onSuccess: (resultado) => {
      invalidar();
      const bien = resultado.filter((f) => f.registrado).length;
      const mal = resultado.filter((f) => !f.registrado);
      addToast(
        mal.length === 0
          ? `${bien} pago(s) registrados`
          : `${bien} registrados. Sin registrar: ${mal.map((f) => `${f.codigo} (${f.mensaje ?? "error"})`).join("; ")}`,
        mal.length === 0 ? "success" : "info",
      );
    },
    onError: avisar("No se pudo cargar el archivo"),
  });

  const crearMes = useMutation({
    mutationFn: () => crearCuotaDelMes(condominioId),
    onSuccess: (id) => {
      setCuotaId(id);
      void queryClient.invalidateQueries({ queryKey: ["cuotas", "periodos"] });
      addToast("Mes de cuota listo", "success");
    },
    onError: avisar("No se pudo crear el mes"),
  });

  const importeDeUnidad = useMutation({
    mutationFn: (datos: { unidadId: string; monto: number | null }) =>
      guardarCuotaDeUnidad(datos.unidadId, datos.monto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cuotas", "importes"] });
      addToast("Importe guardado", "success");
    },
    onError: avisar("No se pudo guardar el importe"),
  });

  const cambiarComite = useMutation({
    mutationFn: (datos: { unidadId: string; enComite: boolean }) =>
      ponerEnComite(datos.unidadId, datos.enComite),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["cuotas", "comite"] }),
    onError: avisar("No se pudo cambiar el comité"),
  });

  const pagadas = new Set(
    (pagos.data ?? []).filter((p) => p.pagado).map((p) => p.unidadId),
  );
  const periodo = (periodos.data ?? []).find((p) => p.id === cuotaId) ?? null;

  return {
    estadoDe: (unidadId: string) => (estado.data ?? []).find((e) => e.unidadId === unidadId) ?? null,
    estados: estado.data ?? [],
    guardarImporteDelMes: (unidadId: string, mensual: number | null, variables: number[]) =>
      importeDelMes.mutateAsync({ unidadId, mensual, variables }),
    guardandoImporteDelMes: importeDelMes.isPending,
    abonar: (unidadId: string, monto: number) => abonar.mutateAsync({ unidadId, monto }),
    abonando: abonar.isPending ? (abonar.variables?.unidadId ?? null) : null,
    registrarDesdePlantilla: (filas: { codigo: string; monto: string }[]) => abonosMasivos.mutate(filas),
    cargandoPlantilla: abonosMasivos.isPending,
    periodos: periodos.data ?? [],
    /** Se sabe ya si hay meses o no: para no ofrecer «crear» mientras carga. */
    periodosLeidos: periodos.isSuccess,
    periodo,
    cuotaId,
    setCuotaId,
    configuracion: configuracion.data ?? null,
    /** Los uuid de las viviendas al día en el periodo elegido. */
    pagadas,
    estaPagada: (unidadId: string) => pagadas.has(unidadId),
    marcar: (unidadId: string, pagado: boolean) =>
      marcar.mutate({ unidadId, pagado }),
    marcarMasivo: (codigos: string[]) => masivo.mutate(codigos),
    /** La vivienda cuya casilla se está guardando ahora mismo. */
    marcando: marcar.isPending ? (marcar.variables?.unidadId ?? null) : null,
    cargandoArchivo: masivo.isPending,

    crearMes: () => crearMes.mutate(),
    creandoMes: crearMes.isPending,

    /** El importe propio de la vivienda, o `null` si paga el general. */
    importePropio: (unidadId: string) => importes.data?.[unidadId] ?? null,
    guardarImporte: (unidadId: string, monto: number | null) =>
      importeDeUnidad.mutateAsync({ unidadId, monto }),
    guardandoImporte: importeDeUnidad.isPending,

    comiteDe: (unidadId: string) =>
      comite.data?.[unidadId] ?? { tieneCuenta: false, enComite: false },
    cambiarComite: (unidadId: string, enComite: boolean) =>
      cambiarComite.mutate({ unidadId, enComite }),
    cambiandoComite: cambiarComite.isPending
      ? (cambiarComite.variables?.unidadId ?? null)
      : null,
  };
}
