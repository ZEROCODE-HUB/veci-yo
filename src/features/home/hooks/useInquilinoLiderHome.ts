import { useIsFetching, useQueryClient, useQuery } from "@tanstack/react-query";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import {
  obtenerAgendaHoy,
  obtenerIngresosSalidas,
  obtenerReputacion,
} from "../services/home.repo";
import { diasParaDarReconocimiento } from "@/features/inquilino-lider/services";
import { useMemo, useState } from "react";
import {
  useAdminStore,
  useAuthStore,
} from "@/stores";
import { calcularTrafico, COLOR_FAMILIARES, COLOR_TEMPORAL, HORAS_TURNO } from "../helpers/home.helpers";
import { useVisitas } from "@/features/visitas/hooks";
import { obtenerTraficoDePorteria } from "@/features/visitas/services/porteria.repo";
import { esNoResidente } from "../helpers/noResidente";
import { ahora, formatDateInput } from "@/shared/utils";
import { estadoDe } from "@/shared/components";

/**
 * La barra del grafico de trafico que se ha pulsado.
 *
 * Estaba como `any`, asi que el detalle que se pinta --«Total ingresos»,
 * «X con vehiculo»-- no lo comprobaba nadie: un campo mal escrito en el sitio
 * que lo pone salia como `undefined` en pantalla, sin un solo error.
 */
export interface BarraDelGrafico {
  /** La hora de la franja, `HH:MM`. */
  hora: string;
  total: number;
  familiar: number;
  temporal: number;
  vehiculos: number;
  tipo: "ingresos" | "salidas";
}

export function useInquilinoLiderHome() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const usuario = useAuthStore((state) => state.usuario);
  /*
    Salía de `propietario-store.residentesDeclarados`, un mapa
    `correo -> boolean` en memoria: se perdía al recargar y usaba el correo
    como clave de identidad, que la regla 3 prohíbe. `es_residente` ya venía
    cargado en la sesión desde `membresia_unidad` y no lo miraba nadie.
  */
  const unidadActiva = useUnidadActiva();
  const estacionamientos = useAdminStore((state) => state.estacionamientosVisitantes);
  const { items: visitas } = useVisitas();
  const condominioId = useCondominioActivo() ?? "";
  /*
    El contador de estacionamientos sale del almacén, que llena
    `useDatosCondominio` al llegar la arquitectura del edificio. Mientras no
    ha llegado nunca, el almacén dice «0 de 0» y eso se leía como un edificio
    sin estacionamientos (13/11/2026).
  */
  const clienteDeConsultas = useQueryClient();
  const pidiendoArquitectura = useIsFetching({ queryKey: ["condominio", "arquitectura", condominioId] }) > 0;
  const cargandoEstacionamientos =
    clienteDeConsultas.getQueryData(["condominio", "arquitectura", condominioId]) === undefined &&
    (pidiendoArquitectura || !condominioId);
  const usuarioId = useAuthStore((state) => state.usuarioId ?? "");
  const unidades = useAuthStore((state) => state.unidades);

  const { data: agendaHoy = [] } = useQuery({
    queryKey: ["home", "agenda", unidades.map((u) => u.unidadId).join(",")],
    queryFn: () => obtenerAgendaHoy(unidades.map((u) => u.unidadId)),
    enabled: unidades.length > 0,
  });

  /*
    Días que le faltan para poder dar otro reconocimiento (0: ya puede).

    Sin valor por defecto: con `= 0`, mientras cargaba --y para siempre si la
    consulta fallaba-- la tarjeta latía «Puedes dar tu reconocimiento» a quien
    ya lo había dado (13/11/2026). `undefined` es «todavía no se sabe».
  */
  const consultaGratitud = useQuery({
    queryKey: ["home", "regalos", condominioId, usuarioId],
    queryFn: () => diasParaDarReconocimiento(condominioId),
    enabled: Boolean(condominioId && usuarioId),
  });
  const diasParaGratitud: number | undefined = consultaGratitud.data;

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  /*
    Un propietario, con o sin la coletilla del rol.

    Se pedia `rolActivo === "propietario"` a secas, y a quien **de verdad** no
    reside la sesion le da `propietario-no-residente`: la comprobacion fallaba
    justo con la persona para la que estaba escrita, asi que `noResidente` no
    podia ser cierto nunca y la restriccion --ocultarle correspondencia, visitas
    y zonas comunes, que son de quien vive alli-- no se aplicaba a nadie.

    Salio recorriendo la aplicacion con Guillermo puesto como no residente: el
    menu le salia entero. Es la decima cosa decorativa del proyecto, y de las
    mas escondidas, porque el codigo que la implementa **existe y es correcto**;
    lo que no llega es la condicion.

    `noResidente` mira las dos cosas: el rol --quien solo tiene viviendas donde
    no vive-- y la vivienda activa --quien tiene dos y esta mirando aquella
    donde no vive--.
  */
  const esPropietario =
    rolActivo === "propietario" || rolActivo === "propietario-no-residente";
  // Sin vivienda no se es residente de nada: ni reputación ni gratitud.
  const sinPropiedades = rolActivo === "propietario-sin-propiedades";
  const esResidente = esPropietario
    ? (unidadActiva?.esResidente ?? true)
    : !esGuardia && !esAdmin && !sinPropiedades && !!rolActivo;
  const noResidente = esNoResidente(rolActivo, esResidente);
  const puedeVerTrafico = esGuardia || esAdmin;

  const [planDia, setPlanDia] = useState("Hoy");
  const [modoIngreso, setModoIngreso] = useState(true);
  const [barraPopup, setBarraPopup] = useState<BarraDelGrafico | null>(null);
  const [parkingOpen, setParkingOpen] = useState(false);
  // El dia que pide la pantalla, en el formato que espera la base.
  const diaConsultado = useMemo(() => {
    const d = ahora();
    if (planDia === "Mañana") d.setDate(d.getDate() + 1);
    if (planDia === "Ayer") d.setDate(d.getDate() - 1);
    return formatDateInput(d);
  }, [planDia]);

  const consultaIngresos = useQuery({
    queryKey: ["home", "ingresos-salidas", diaConsultado],
    queryFn: () => obtenerIngresosSalidas(diaConsultado),
  });
  const sourceData = consultaIngresos.data ?? [];

  const consultaInsignias = useQuery({
    queryKey: ["home", "reputacion", usuarioId, condominioId],
    queryFn: () => obtenerReputacion(usuarioId, condominioId),
    enabled: Boolean(usuarioId && condominioId),
  });
  const reputacionInsignias = consultaInsignias.data ?? [];
  /*
    El grafico pide **numeros**, no la lista: la porteria solo puede listar
    hoy, mañana y a quien esta dentro, y el grafico tambien mira ayer. Solo se
    pide con un rol que lo vaya a pintar; la base lo niega a quien no es
    personal del edificio.
  */
  const consultaTrafico = useQuery({
    queryKey: ["home", "trafico", condominioId, diaConsultado],
    queryFn: () => obtenerTraficoDePorteria(condominioId, diaConsultado),
    enabled: Boolean(condominioId) && puedeVerTrafico,
  });
  const franjas = useMemo(() => consultaTrafico.data ?? [], [consultaTrafico.data]);
  const trafico = useMemo(
    () => calcularTrafico(franjas, modoIngreso),
    [franjas, modoIngreso],
  );

  return {
    agendaHoy,
    estacionamientos,
    cargandoEstacionamientos,
    esAdmin,
    esGuardia,
    esResidente,
    sinPropiedades,
    noResidente,
    puedeVerTrafico,
    nombre: usuario?.nombre ?? "",
    planDia,
    modoIngreso,
    barraPopup,
    parkingOpen,
    sourceData,
    diasParaGratitud,
    /*
      Cómo va cada consulta (13/11/2026). Sin esto, mientras cargaban se leía
      «Hoy no hay ingresos…», el gráfico salía plano y la fila de insignias
      vacía, como si de verdad no hubiera nada.
    */
    cargaIngresos: estadoDe(consultaIngresos),
    cargaTrafico: estadoDe(consultaTrafico),
    cargaGratitud: estadoDe(consultaGratitud),
    cargaInsignias: estadoDe(consultaInsignias),
    esHuesped: rolActivo === "huesped-temporal",
    reputacionInsignias,
    visitas,
    HORAS_TURNO,
    COLOR_FAMILIARES,
    COLOR_TEMPORAL,
    ...trafico,
    setPlanDia,
    setModoIngreso,
    setBarraPopup,
    setParkingOpen,
  };
}

