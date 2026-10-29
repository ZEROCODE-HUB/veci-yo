import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { obtenerVerificacionDeDocumento } from "@/features/administrador/services/condominio.repo";
import { adjuntarFotosVisita, diasOcupados } from "../services/visitas.repo";
import { obtenerSuscripcion } from "@/features/propietario/services/suscripcion.repo";
import { suscripcionVigente } from "@/features/propietario/services/suscripcionVigente";
import { useDocumentosDelEdificio } from "@/shared/hooks";
import { useLista } from "@/shared/hooks/useLista";
import type { Database } from "@/shared/types/database.types";
import { opcionesDeDocumento, type ReglaDeDocumento } from "@/shared/services/documentos.repo";
import {
  useAuthStore,
  useUbicacionStore,
  useUIStore,
} from "@/stores";
import {
  useUnidadesDisponibles,
  useNavegacion,
  useParametros,
  useParametrosDeLaBase,
  useCondominioActivo,
  useUnidadActiva,
} from "@/shared/hooks";
import { formatDate, formatDateInput, formatDateIso, formatTime } from "@/shared/utils";
import type { PlataformaReserva, VisitaItem } from "@/shared/types";
import { tipoHaciaBase } from "../services/visitas.repo";
import {
  errorDeCorreo,
  errorDeDocumento,
  errorDeTelefono,
  errorDeVehiculos,
  yaPaso,
} from "../helpers/validarVisita";
import { TIPOS_VISITA } from "../constants";
import { useVisitas } from "./useVisitas";
import { useVisitaNuevo } from "./useVisitaNuevo";
import { useEstacionamientosVisita } from "./useEstacionamientosVisita";
import { entraAlRegistrar } from "../helpers/entraAlRegistrar";
import { useOficios } from "./useOficios";

/**
 * Estado y reglas del alta de visitas.
 *
 * La pantalla tenia 1271 lineas: treinta `useState`, siete `useEffect` y un
 * `handleGuardar` de 170, todo mezclado con el JSX. Aqui queda la logica y
 * alli solo la composicion, como pide la regla 12.
 *
 * Los datos personales del visitante venian precargados con los de una persona
 * inventada ("Mariano Lazarto", con cedula, correo y telefono): quien
 * registraba una visita partia de esos valores y, si no los borraba, quedaban
 * guardados como los del invitado real.
 */
export function useVisitasNuevo() {
  const navigation = useNavegacion();
  const parametros = useParametros("VisitasNuevo");
  const { crearVisita, creando } = useVisitas();
  const {
    resolver: resolverUnidad,
    torres: torresReales,
    codigosDe,
    cargando: cargandoUnidades,
  } = useUnidadesDisponibles();
  /*
    La vivienda de quien registra, **desde la sesion**.

    `resolverUnidad` busca en todas las del edificio por el texto de los dos
    desplegables, y para un residente eso era un rodeo con dos agujeros: la
    lista llega por red --mientras no ha llegado esta vacia, `find` devuelve
    `undefined` y la pantalla acusaba de no elegir torre y departamento a quien
    no tiene esos dos desplegables-- y la comparacion es letra por letra, asi
    que una vivienda sin torre daba «Torre » contra «Torre 0» y tampoco casaba.

    Es la regla 8 otra vez: las viviendas de las que alguien **es miembro**
    vienen en la sesion, y ya estan aqui cuando se pinta la pantalla.
  */
  const unidadDeLaSesion = useUnidadActiva();

  /*
    Si esta vivienda tiene la renta corta al dia.

    El cartel «Huesped Temporal — Requiere suscripcion» estaba **escrito a
    fuego**: salia siempre que el tipo fuera una estancia, con suscripcion y
    sin ella. O sea que un anfitrion que paga abria la pantalla y leia que
    tiene que activar algo que ya tiene, con un camino a Configuracion que no
    le hace ninguna falta.

    Es la familia de «una prop escrita a fuego es una casilla decorativa con
    otra forma», y la respuesta ya existia dos pantallas mas alla:
    `VisitasHistorialScreen` pinta el mismo cartel detras de `huespedDisponible`,
    que si pregunta. Aqui se pregunta lo mismo.
  */
  const { data: suscripcion } = useQuery({
    queryKey: ["suscripcion", unidadDeLaSesion?.unidadId ?? ""],
    queryFn: () => obtenerSuscripcion(unidadDeLaSesion?.unidadId ?? ""),
    enabled: Boolean(unidadDeLaSesion?.unidadId),
  });
  const tieneSuscripcion = suscripcionVigente(suscripcion ?? null);

  const { validar } = useVisitaNuevo();
  const { addToast } = useUIStore();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const { cupos: cuposDeVisita, asignar: asignarCupo } =
    useEstacionamientosVisita();

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esHuesped = rolActivo === "huesped-temporal";
  const esGuardiaOAdmin = esGuardia || esAdmin;

  const tiposDisponibles = TIPOS_VISITA.filter((t) => {
    if (esGuardia) return t === "amigos" || t === "temporal";
    if (esHuesped) return t === "amigos" || t === "temporal";
    return true;
  });

  const tipoPreseleccionado = parametros?.tipoPreseleccionado;
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(
    tipoPreseleccionado && tiposDisponibles.includes(tipoPreseleccionado)
      ? tipoPreseleccionado
      : null,
  );

  /** Se mira en varios sitios; el de dentro de `handleGuardar` es el mismo. */
  const esHuespedTemporalElegido = tipoSeleccionado === "huesped-temporal";
  /*
    Los dias que esta vivienda ya tiene reservados, para tacharlos en el
    calendario. La base rechaza una estancia solapada desde el 09/10/2026, y
    sin esto el anfitrion elige unas fechas y se entera al guardar.
  */
  const { data: ocupados } = useQuery({
    queryKey: ["dias-ocupados", unidadDeLaSesion?.unidadId ?? ""],
    queryFn: () => diasOcupados(unidadDeLaSesion?.unidadId ?? ""),
    enabled: Boolean(unidadDeLaSesion?.unidadId) && esHuespedTemporalElegido,
  });

  const [torre, setTorre] = useState("");
  const [depto, setDepto] = useState("");
  // Una visita de una persona es el caso normal; "5" venia del mock.
  const [personas, setPersonas] = useState("1");
  const [cantidadMenores, setCantidadMenores] = useState(0);
  /*
    En una estancia, cuántos vienen es **opcional** (15/10/2026): si el
    anfitrión no lo sabe, lo dice el huésped en su preregistro —personas,
    menores y vehículos— y el único tope es el aforo del alojamiento. Viene
    así de entrada; el anfitrión puede fijar el número si lo sabe.
  */
  const [fijarCuantos, setFijarCuantos] = useState(false);
  // De dónde viene una estancia creada a mano (16/10/2026).
  const [plataforma, setPlataforma] = useState<PlataformaReserva>("directo");
  const [selectedDate, setSelectedDate] = useState(new Date());

  /**
   * El día en que el huésped se va.
   *
   * Antes no existía: el formulario tenía un solo calendario y esto escribía
   * `fechaDesde` y `fechaHasta` con el mismo valor, así que **toda estancia
   * medía cero noches**. Un huésped del 1 al 5 de octubre quedaba registrado
   * entrando y saliendo el día 1, y como `cerrar_precheckin` construye su
   * membresía con esas fechas --y la caduca en `fecha_hasta + 1`-- al día
   * siguiente perdía la aplicación, el libro y la clave de la puerta.
   *
   * Solo lo pide la renta corta. Un amigo o un profesional vienen y se van el
   * mismo día, y para ellos las dos fechas siguen coincidiendo. Punto 67 de
   * `REVISAR-A-OJO.md`.
   */
  const [fechaSalida, setFechaSalida] = useState("");
  /**
   * Si quien reserva ya eligió la llegada de la estancia (24/10/2026). El
   * calendario arrancaba con hoy puesto como llegada, y el cliente no sabía
   * si estaba elegido o no («automáticamente se selecciona la fecha de hoy o
   * no sé, es confuso»). Ahora nace sin nada marcado.
   */
  const [llegadaElegida, setLlegadaElegida] = useState(false);

  /*
    Si la porteria compara el documento del invitado lo decide **el edificio**,
    no el tipo de visita. Antes esto era `tipo === "amigos" ? "no_verificar" :
    "verificar"`, escrito a fuego, mientras la pantalla le pedia el documento a
    quien invitaba y le decia que su invitado lo presentara en porteria: una
    comprobacion prometida que nadie hacia. Punto 66 de `REVISAR-A-OJO.md`.
  */
  const condominioId = useCondominioActivo() ?? "";
  // Los documentos que se piden en el país del edificio.
  const documentos = useDocumentosDelEdificio(condominioId);
  const { data: verificarDocumento = true } = useQuery({
    queryKey: ["condominio", "verificar-documento", condominioId],
    queryFn: () => obtenerVerificacionDeDocumento(condominioId),
    enabled: Boolean(condominioId),
  });
  const [nombre, setNombre] = useState("");
  // Sin preseleccion: "Cédula" era ambiguo entre ciudadania y extranjeria.
  const [tipoId, setTipoId] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [horaInicio, setHoraInicio] = useState(() => {
    if (!esGuardia) return "";
    const now = new Date();
    return formatTime(now);
  });
  /*
    Los días en que viene un profesional permanente. De entrada, los del
    parámetro `profesional_dias_por_defecto` del edificio (hoy de lunes a
    viernes); quien registra los cambia. `null` es «nadie los ha tocado».
  */
  const parametrosDeLaBase = useParametrosDeLaBase();
  const [diasElegidos, setDiasTrabajo] = useState<number[] | null>(null);
  const diasTrabajo =
    diasElegidos ??
    (parametrosDeLaBase.listo
      ? parametrosDeLaBase.lista<number>("profesional_dias_por_defecto")
      : []);
  const [profesion, setProfesion] = useState("");
  const [profesionOtro, setProfesionOtro] = useState("");
  const { oficios, esOtro } = useOficios(tipoSeleccionado);
  const pideOtraProfesion = esOtro(profesion);
  const [tieneVehiculo, setTieneVehiculo] = useState(false);
  const [cantidadVehiculos, setCantidadVehiculos] = useState(1);
  /** El huésped trae mascota (QA 23/10/2026): su preregistro la pide. */
  const [traeMascota, setTraeMascota] = useState(false);
  /*
    El tipo de cada vehiculo se guarda como **codigo** del enum: el nombre lo
    pone el selector con la lista `tipos_de_vehiculo`, que el administrador
    renombra y ordena. Antes viajaba el nombre y se traducia al guardar, y un
    nombre cambiado dejaba el vehiculo sin tipo (28/10/2026).
  */
  const tiposDeVehiculo = useLista("tipos_de_vehiculo");
  const primerTipoDeVehiculo = tiposDeVehiculo.opciones[0]?.codigo ?? "";
  const [vehiculos, setVehiculos] = useState<{ placa: string; tipo: string; marca?: string; color?: string }[]>(
    [],
  );
  const [acompanantes, setAcompanantes] = useState<
    {
      nombre: string;
      ci: string;
      esMenor: boolean;
      /**
       * Con quién viene, si es menor (hueco 36): -1 el titular, o la posición
       * del acompañante adulto en esta lista.
       */
      conQuien?: number;
      /** Qué es del menor ese adulto: la base lo pide con él. */
      parentesco?: "padre" | "madre" | "tutor_legal" | "otro";
    }[]
  >([]);
  const [aviso, setAviso] = useState<
    "solo_notificar" | "notificar_y_anunciar"
  >("notificar_y_anunciar");
  const [aprobadoPor, setAprobadoPor] = useState("");
  const [anotacionesGuardia, setAnotacionesGuardia] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  /** La estancia recién creada: su enlace va en el mensaje para el huésped. */
  const [visitaCreadaId, setVisitaCreadaId] = useState<string | null>(null);
  const [esParaAdministracion, setEsParaAdministracion] = useState(false);
  const [showAvisoMenores, setShowAvisoMenores] = useState(false);
  const [fotosIngreso, setFotosIngreso] = useState<string[]>([]);
  const [estacionamientosSel, setEstacionamientosSel] = useState<string[]>([]);
  /*
    Un profesional temporal puede venir sin torre ni departamento (Para Claude
    150, 29/10/2026): es trabajo del edificio, como una visita a la
    administración.
  */
  const torreYDeptoOpcionales = esGuardiaOAdmin && tipoSeleccionado === "temporal";

  const esProfesional =
    tipoSeleccionado === "temporal" || tipoSeleccionado === "permanente";

  /*
    La salida se guarda como `yyyy-MM-dd` --asi se compara y asi viaja-- y el
    calendario trabaja con `Date`. Se parte la cadena en vez de construir un
    `Date` con ella: `new Date("2026-10-12")` se lee como UTC y al oeste de
    Greenwich pinta el dia anterior, que es el defecto que ya documenta
    `formatDateIso`.
  */
  const salidaComoFecha = (() => {
    if (!fechaSalida) return null;
    const [anio, mes, dia] = fechaSalida.split("-").map(Number);
    return anio && mes && dia ? new Date(anio, mes - 1, dia) : null;
  })();

  /*
    `personas` se guarda como texto porque nacio de un campo de texto. Lo que
    la pantalla necesita es el numero, y lo necesita en tres sitios --el
    contador, su tope y el de menores--, asi que se convierte una sola vez.
  */
  const cuantasPersonas = Math.max(1, parseInt(personas) || 1);

  /** Los dos extremos del rango, desde el unico calendario de la estancia. */
  const alElegirRango = (desde: Date, hasta: Date | null) => {
    setSelectedDate(desde);
    setLlegadaElegida(true);
    setFechaSalida(hasta ? formatDateInput(hasta) : "");
  };

  /** «Cambiar las fechas»: vuelve a empezar, sin nada marcado. */
  const borrarFechas = () => {
    setLlegadaElegida(false);
    setFechaSalida("");
  };

  /** Las noches que acepta el anfitrión (su configuración de renta corta). */
  const nochesMinimas = suscripcion?.estanciaMinimaNoches ?? 1;
  const nochesMaximas = suscripcion?.estanciaMaximaNoches ?? null;
  // Para avisar si el huésped trae más vehículos (hueco 17).
  const estacionamientosHuesped = suscripcion?.estacionamientosHuesped ?? null;
  // Cuántas personas caben en el alojamiento (hueco 28); nulo = sin fijar.
  const aforoDelAlojamiento = suscripcion?.maxHuespedes ?? null;

  useEffect(() => {
    if (!esGuardiaOAdmin && ubicacionActiva) {
      setTorre(`Torre ${ubicacionActiva.torreNumero || ""}`);
      setDepto(ubicacionActiva.codigo || "");
    }
  }, [esGuardiaOAdmin, ubicacionActiva]);

  useEffect(() => {
    if (esGuardia) setAviso("notificar_y_anunciar");
  }, [esGuardia]);

  useEffect(() => {
    if (esHuespedTemporalElegido && !fijarCuantos) {
      setPersonas("1");
      setCantidadMenores(0);
    }
  }, [esHuespedTemporalElegido, fijarCuantos]);

  useEffect(() => {
    if (tipoSeleccionado === "permanente") {
      setPersonas("1");
      setCantidadMenores(0);
    }
  }, [tipoSeleccionado]);

  useEffect(() => {
    const target = tieneVehiculo ? cantidadVehiculos : 0;
    setVehiculos((prev) => {
      const updated = [...prev];
      while (updated.length < target) updated.push({ placa: "", tipo: primerTipoDeVehiculo });
      while (updated.length > target) updated.pop();
      return updated;
    });
  }, [cantidadVehiculos, tieneVehiculo, primerTipoDeVehiculo]);

  useEffect(() => {
    const num = parseInt(personas) || 1;
    const compCount = Math.max(0, num - 1);
    setAcompanantes((prev) => {
      const updated = [...prev];
      while (updated.length < compCount)
        updated.push({ nombre: "", ci: "", esMenor: false });
      while (updated.length > compCount) updated.pop();
      return updated;
    });
  }, [personas]);

  useEffect(() => {
    /*
      Quien es menor lo decide **el contador de arriba**, y nada mas.

      Hasta el 09/10/2026 cada acompañante llevaba ademas su propio interruptor
      «Menor de edad», que decia lo contrario que el contador en cuanto se
      tocaba: se pedian dos personas y un menor, y abajo salia una ficha
      preguntando otra vez lo mismo. El cliente lo dijo asi: «si selecciono 2
      personas y 1 es menor de edad, directo dime que rellene el nombre del
      adulto y abajo del menor». Dos sitios para un dato es un sitio de mas.

      **Los menores van al final**, que es el orden en que se leen las fichas:
      primero los adultos, luego los menores. Antes se marcaban los primeros,
      asi que con tres personas y un menor la ficha del menor salia arriba.

      El tope se calcula **dentro** del updater, con `prev`. Se calculaba con
      `acompanantes` de fuera, que es el valor del render en que se creo el
      efecto: al cambiar el numero de personas --que lo hace el efecto de
      arriba, en la misma tanda-- se marcaba segun una lista que ya no era la
      que habia. Por eso mismo depende tambien de cuantas personas hay: al
      añadir una, la fila nueva nace al final y el reparto cambia.
    */
    setAcompanantes((prev) => {
      const n = Math.max(0, Math.min(cantidadMenores, prev.length));
      return prev.map((a, i) => ({ ...a, esMenor: i >= prev.length - n }));
    });
  }, [cantidadMenores, cuantasPersonas]);

  /*
    El aviso legal de menores lo disparaba el interruptor de cada acompañante.
    Al quitarlo, esa ventana se quedaba **sin nadie que la abriera** --que es
    el defecto de `AdministradorZonasScreen` y el de «Agregar Residente», los
    dos ya documentados-- asi que lo dispara quien ahora toma la decision: el
    contador, la primera vez que pasa de cero.

    Solo en el salto de 0 a 1: subir de uno a dos menores no es una decision
    nueva, y una ventana modal que vuelve a salir en cada pulsacion del «+»
    se convierte en algo que se cierra sin leer.
  */
  const habiaMenores = useRef(false);
  useEffect(() => {
    if (cantidadMenores > 0 && !habiaMenores.current) setShowAvisoMenores(true);
    habiaMenores.current = cantidadMenores > 0;
  }, [cantidadMenores]);

  /*
    Un segundo clic mientras se crea no crea otra visita (Para Claude,
    21/10/2026: «se pueden hacer varios clics y crear varias»). `creando` llega
    un render tarde --dos clics seguidos caben antes--, así que además hay un
    cerrojo que se suelta cuando la creación termina.
  */
  const enviando = useRef(false);
  useEffect(() => {
    if (!creando) enviando.current = false;
  }, [creando]);

  const handleGuardar = () => {
    if (creando || enviando.current) return;
    if (!tipoSeleccionado) {
      addToast("Selecciona un tipo de visita", "error");
      return;
    }
    const esHuespedTemporal = tipoSeleccionado === "huesped-temporal";
    /*
      El nombre es obligatorio salvo para una estancia de huesped.

      Decision del cliente del 02/10/2026: al reservar, el anfitrion solo pone
      **cuantas personas, si hay niños y vehiculos**; el resto lo rellena el
      huesped en su preregistro, que es quien lo sabe. Muchas reservas entran
      ademas por el calendario de Airbnb, que no manda el nombre.

      Lo que no cambia es que la estancia nazca con su titular: `crearVisita` lo
      exige, y el dia que falto, el preregistro entero fallo con un 409.
    */
    if (!esHuespedTemporal && !nombre.trim()) {
      addToast("El nombre es obligatorio", "error");
      return;
    }
    if (esProfesional && !identificacion.trim()) {
      addToast("La identificación es obligatoria", "error");
      return;
    }
    /*
      Lo que sigue salió de recorrer las visitas corrientes el 12/10/2026: la
      pantalla aceptaba todo esto y decía «Visita creada».
    */
    const profesionEscrita =
      pideOtraProfesion
        ? profesionOtro.trim()
        : profesion;
    if (esProfesional && !profesionEscrita) {
      addToast("Indica la profesión", "error");
      return;
    }
    const errorDeDatos =
      errorDeDocumento(identificacion, documentos.reglaDe(tipoId)) ||
      acompanantes.map((a) => errorDeDocumento(a.ci)).find(Boolean) ||
      errorDeCorreo(email) ||
      errorDeTelefono(telefono, {
        minimo: parametrosDeLaBase.numero("telefono_largo_minimo"),
        maximo: parametrosDeLaBase.numero("telefono_largo_maximo"),
      }) ||
      (tieneVehiculo
        ? errorDeVehiculos(vehiculos.map((v) => v.placa), {
            minimo: parametrosDeLaBase.numero("placa_largo_minimo"),
            maximo: parametrosDeLaBase.numero("placa_largo_maximo"),
          })
        : "");
    if (errorDeDatos) {
      addToast(errorDeDatos, "error");
      return;
    }
    /*
      La portería y la administración eligen la vivienda. Sin elegirla,
      `resolverUnidad("", "")` devolvía **la primera del edificio**: la visita
      quedaba anotada a la 101 y el aviso le llegaba a quien no esperaba a
      nadie.
    */
    const sinVivienda = esParaAdministracion || (torreYDeptoOpcionales && !depto);
    if (esGuardiaOAdmin && !sinVivienda && !depto) {
      addToast("Elige la torre y el departamento de la visita", "error");
      return;
    }
    /*
      Con vehículo y cupos libres, la portería elige dónde aparca (Para Claude
      148, 29/10/2026): era opcional y se quedaban sin anotar.
    */
    if (
      esGuardia &&
      tieneVehiculo &&
      cuposDeVisita.some((c) => !c.ocupado) &&
      estacionamientosSel.length === 0
    ) {
      addToast("Elige el estacionamiento de la visita", "error");
      return;
    }
    /*
      Un vecino anuncia a quien va a venir. La portería sí anota lo que ya
      pasó, y su formulario fija el día de hoy.
    */
    if (
      !esGuardiaOAdmin &&
      yaPaso(formatDateInput(selectedDate), formatDateInput(new Date()))
    ) {
      addToast("Ese día ya pasó. Elige hoy o un día posterior.", "error");
      return;
    }
    if (
      tipoSeleccionado === "temporal" &&
      acompanantes.some((a) => !a.ci.trim())
    ) {
      addToast(
        "La identificación es obligatoria para todos los acompañantes",
        "error",
      );
      return;
    }
    if (esGuardia && !horaInicio) {
      addToast("La hora de ingreso es obligatoria", "error");
      return;
    }
    if (esGuardia && !aprobadoPor.trim()) {
      addToast("Indica quién aprobó el ingreso", "error");
      return;
    }
    if (esGuardia && tipoSeleccionado === "temporal" && !telefono.trim()) {
      addToast("El teléfono es obligatorio para profesional temporal", "error");
      return;
    }
    const fechaStr = formatDate(selectedDate);

    /*
      La estancia de un huésped tiene dos extremos. Para los demás tipos la
      salida es el mismo día, que es lo que ya pasaba con todos.
    */
    const esEstancia = esHuespedTemporal;
    if (esEstancia && !llegadaElegida) {
      addToast("Elige en el calendario el día en que llega el huésped", "error");
      return;
    }
    if (esEstancia && !fechaSalida) {
      addToast("Indica el día en que el huésped se va", "error");
      return;
    }
    /*
      Al menos una noche. Se comparan en ISO, que ordena como texto sin pasar
      por `Date`.

      Antes solo se rechazaba la salida **anterior** a la llegada, asi que
      entrar y salir el mismo dia pasaba. Y eso no es una estancia: alojarse
      es dormir ahi, y el modelo entero lo da por hecho --la membresia del
      huesped caduca en `fecha_hasta + 1`, las credenciales se abren el dia de
      llegada--.

      Peor todavia en la base: `daterange(17, 17, '[)')` es un rango **vacio**,
      y un rango vacio no se solapa con nada, asi que una estancia de cero
      noches no chocaba ni consigo misma ni ocupaba ningun dia en el
      calendario. El cliente lo vio el 09/10/2026 reservando dos veces el 17.
    */
    if (esEstancia && fechaSalida <= formatDateInput(selectedDate)) {
      addToast(
        "La salida tiene que ser al menos el día siguiente a la llegada",
        "error",
      );
      return;
    }
    if (esEstancia && salidaComoFecha) {
      const noches = Math.round(
        (new Date(salidaComoFecha).setHours(0, 0, 0, 0) - new Date(selectedDate).setHours(0, 0, 0, 0)) / 86400000,
      );
      if (noches < nochesMinimas || (nochesMaximas != null && noches > nochesMaximas)) {
        addToast(
          nochesMaximas != null
            ? `La estancia tiene que ser de ${nochesMinimas} a ${nochesMaximas} noches (lo configuraste en Huéspedes temporales)`
            : `La estancia tiene que ser de al menos ${nochesMinimas} noches (lo configuraste en Huéspedes temporales)`,
          "error",
        );
        return;
      }
    }
    const fechaHastaStr = esEstancia ? formatDateIso(fechaSalida) : fechaStr;

    const visita = {
      id: Date.now(),
      tipo: tipoSeleccionado as VisitaItem["tipo"],
      nombre: nombre.trim(),
      ci: identificacion.trim(),
      estado: nacenDentro ? "Ingresado" : "Programada",
      instruccionDocumento: verificarDocumento
        ? ("verificar" as const)
        : ("no_verificar" as const),
      aviso,
      tieneVehiculo: tieneVehiculo && vehiculos.some((v) => v.placa.trim()),
      fechaDesde: fechaStr,
      fechaHasta: fechaHastaStr,
      esEvento: false,
      invitados: [
        {
          nombre: nombre.trim(),
          ci: identificacion.trim(),
          esMenor: false,
          llego: esGuardia,
          aprobado: "pendiente",
          horaIngreso: esGuardia ? horaInicio || "00:00" : "",
          horaSalida: "",
        },
        ...acompanantes
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre,
            ci: a.ci,
            esMenor: a.esMenor,
            llego: esGuardia,
            aprobado: "pendiente",
            horaIngreso: esGuardia ? horaInicio || "00:00" : "",
            horaSalida: "",
          })),
      ],
      vehiculos: tieneVehiculo ? vehiculos.filter((v) => v.placa.trim()) : [],
      torre,
      depto,
      personas: parseInt(personas) || 1,
      /*
        Solo la del guardia, que es la hora **real** del ingreso. La franja
        estimada que tecleaba el residente se retiro el 02/10/2026: ademas de
        no pedirla el cliente, nunca llegaba a `crearVisita` --se tecleaba y se
        tiraba--.
      */
      horaEstimadaLlegada: esGuardia ? horaInicio : undefined,
      horaIngreso: esGuardia ? horaInicio : undefined,
      registradoPor: esAdmin
        ? useAuthStore.getState().usuario?.nombre || "Administrador"
        : undefined,
      autorizadoPor: esGuardia ? aprobadoPor : undefined,
      autorizadoPorRol: esGuardia ? "guardia" : undefined,
      anotacionesIngreso: esGuardia ? anotacionesGuardia : "",
      profesion: esProfesional ? profesion : undefined,
      profesionOtro:
        esProfesional && pideOtraProfesion
          ? profesionOtro
          : undefined,
      telefonoResidente: !esGuardia ? telefono : undefined,
      esParaAdministracion,
    };

    const validacion = validar(visita);
    if (!validacion.success) {
      addToast(
        validacion.error.issues[0]?.message ||
          "Completa los datos de la visita",
        "error",
      );
      return;
    }

    /*
      La visita se ata a una unidad real por FK. El guardia y la administracion
      eligen cualquiera del edificio --y para eso hace falta la lista, que
      llega por red--; el residente registra para la suya, que ya viene en la
      sesion. Lo que esto puede o no hacer lo garantiza RLS, no la interfaz.
    */
    if (esGuardiaOAdmin && cargandoUnidades) {
      addToast("Estamos cargando las viviendas. Prueba en un momento.", "error");
      return;
    }

    const unidadDestino = esGuardiaOAdmin
      ? resolverUnidad(torre, depto)
      : unidadDeLaSesion
        ? {
            unidadId: unidadDeLaSesion.unidadId,
            condominioId: unidadDeLaSesion.condominioId,
          }
        : undefined;

    // Hueco 36: de cada menor se dice con quién viene y qué es de él.
    if (
      tipoSeleccionado !== "huesped-temporal" &&
      acompanantes.some((a) => a.esMenor && a.nombre.trim() && !a.parentesco)
    ) {
      addToast("Di qué es del menor el adulto con quien viene (padre, madre…).", "error");
      return;
    }

    if (tipoSeleccionado === "permanente" && !diasTrabajo.length) {
      addToast("Elige al menos un día en que viene.", "error");
      return;
    }

    if (!unidadDestino && !sinVivienda) {
      addToast(
        esGuardiaOAdmin
          ? "No pudimos identificar la unidad de la visita. Elige torre y departamento."
          : "No pudimos identificar tu vivienda. Vuelve a entrar a la aplicación.",
        "error",
      );
      return;
    }

    /*
      La posición del adulto con quien viene un menor, contada como la cuenta
      `crearVisita`: el titular es el 0 y los acompañantes sin nombre no se
      guardan. Si el elegido se quedó sin nombre, responde el titular.
    */
    const conNombre = acompanantes.flatMap((a, i) => (a.nombre.trim() ? [i] : []));
    const ordenDelAdulto = (conQuien?: number) => {
      const posicion = conQuien === undefined ? -1 : conNombre.indexOf(conQuien);
      return posicion === -1 ? 0 : posicion + 1;
    };

    enviando.current = true;
    crearVisita({
      condominioId: unidadDestino?.condominioId ?? "",
      unidadId: sinVivienda ? null : (unidadDestino?.unidadId ?? null),
      tipo: tipoHaciaBase(tipoSeleccionado as VisitaItem["tipo"]),
      estado: nacenDentro ? "ingresada" : "programada",
      paraAdministracion: sinVivienda,
      fechaDesde: fechaStr,
      /*
        Un profesional permanente no tiene día de salida. Se le ponía el mismo
        día de la entrada, y la base --que deja a la portería ver «hoy, mañana
        y la permanente, que no caduca»-- lo daba por caducado al día
        siguiente: la empleada de la casa desaparecía de la lista del guardia.
      */
      fechaHasta:
        tipoSeleccionado === "permanente" ? undefined : fechaHastaStr,
      /*
        Lo que el anfitrion dijo en el contador, que hasta el 09/10/2026 se
        tiraba aqui mismo: viajaban los `invitados` --uno por acompañante con
        nombre-- y el total no. Solo para una estancia: en una visita normal
        no hay preregistro que limitar.
      */
      huespedesPrevistos:
        esHuespedTemporal && fijarCuantos ? cuantasPersonas : undefined,
      plataforma: esHuespedTemporal ? plataforma : undefined,
      /*
        Y cuantos de ellos son menores, que se perdia por el mismo sitio: la
        ficha de un menor sin nombre no se crea, asi que de «1 menor» no
        quedaba nada. El cliente lo eligio asi el 09/10/2026, frente a crear
        fichas vacias ya marcadas.
      */
      menoresPrevistos:
        esHuespedTemporal && fijarCuantos ? cantidadMenores : undefined,
      traeMascota: esHuespedTemporal ? traeMascota : undefined,
      /*
        En una estancia, los vehículos que dijo el anfitrión son el tope del
        preregistro; las placas las pone el huésped.
      */
      vehiculosPrevistos:
        esHuespedTemporal && tieneVehiculo ? cantidadVehiculos : undefined,
      horaEstimadaLlegada: esGuardia ? horaInicio : undefined,
      instruccionDocumento: verificarDocumento ? "verificar" : "no_verificar",
      aviso:
        aviso === "notificar_y_anunciar"
          ? "notificar_y_anunciar"
          : "solo_notificar",
      // «Otros» abre un campo para escribirla, y lo escrito se tiraba.
      profesion: esProfesional ? profesionEscrita : undefined,
      diasTrabajo:
        tipoSeleccionado === "permanente" ? diasTrabajo : undefined,
      autorizadaPorNombre: esGuardia ? aprobadoPor : undefined,
      anotacionesIngreso: esGuardia ? anotacionesGuardia : undefined,
      invitados: [
        {
          /*
            Si el anfitrion no escribio nombre --en una estancia ya no es
            obligatorio-- el titular nace «por confirmar» y lo rellena el
            huesped al abrir su preregistro. Es el mismo nombre que pone la
            importacion del calendario de Airbnb, que tampoco lo recibe.

            Lo que no puede faltar es la fila: `crearVisita` rechaza una
            estancia sin invitados, y el dia que falto el titular el preregistro
            entero fallo con un 409.
          */
          nombre: nombre.trim() || "Huésped por confirmar",
          documentoNumero: identificacion.trim(),
          /*
            El tipo de documento se elegia en el formulario y **no se guardaba**:
            `tipoId` no salia de la pantalla. Asi que el invitado quedaba con el
            numero y sin decir de que documento es, y la pantalla de detalle
            ensenaba «No especificado» por mucho que el guardia lo hubiera puesto.

            El selector ya guarda la clave de la base, con las opciones del
            país del edificio (`documento_del_pais`, 25/10/2026).
          */
          tipoDocumento: (tipoId || undefined) as ReglaDeDocumento["tipo"] | undefined,
          // Se pedían en el formulario y no viajaban a ningún sitio.
          correo: email.trim() || undefined,
          telefono: telefono.trim() || undefined,
        },
        ...acompanantes
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre.trim(),
            documentoNumero: a.ci,
            esMenor: a.esMenor,
            responsableOrden: a.esMenor ? ordenDelAdulto(a.conQuien) : undefined,
            parentesco: a.esMenor ? a.parentesco : undefined,
          })),
      ],
      vehiculos: tieneVehiculo
        ? vehiculos
            .filter((v) => v.placa.trim())
            .map((v) => ({
              placa: v.placa.trim(),
              // Sin elegir --la lista aun no habia llegado al añadirlo--, el
              // primero que ofrece. Los codigos de la lista son los del enum.
              tipo: (v.tipo || primerTipoDeVehiculo || undefined) as
                | Database["public"]["Enums"]["tipo_vehiculo"]
                | undefined,
              // Como en el preregistro (hueco 27): opcionales.
              marca: v.marca?.trim() || undefined,
              color: v.color?.trim() || undefined,
            }))
        : [],
    }, {
      // La pantalla de exito solo aparece si la visita quedo guardada. Antes se
      // mostraba de inmediato y, si el guardado fallaba, el usuario veia el
      // mensaje de exito y el error a la vez.
      /*
        Los cupos elegidos se asignan aqui, con la visita ya creada: hasta el
        12/10/2026 se elegian sobre casillas inventadas y no se guardaban en
        ningun sitio.
      */
      onSuccess: (visitaId) => {
        estacionamientosSel.forEach((cupo) => asignarCupo(cupo, visitaId));
        /*
          Las fotos del ingreso se suben con la visita ya creada: la ruta del
          archivo empieza por su id. Hasta el 14/10/2026 el boton de la camara
          solo añadia un texto «foto_123» y no subia nada.
        */
        if (fotosIngreso.length > 0) {
          adjuntarFotosVisita(visitaId, fotosIngreso, "ingreso").catch(() =>
            addToast("La visita quedó guardada, pero no se pudieron subir las fotos", "error"),
          );
        }
        setVisitaCreadaId(visitaId);
        setShowSuccess(true);
      },
    });
  };

  // Si lo que registra la portería nace ya dentro o por llegar (T-025).
  const nacenDentro = entraAlRegistrar({
    esGuardia,
    esEstancia: tipoSeleccionado === "huesped-temporal",
    exigeDocumento: verificarDocumento,
    documentos: [identificacion, ...acompanantes.map((a) => a.ci)],
  });

  return {
    nacenDentro,
    // Contexto
    esGuardia,
    esAdmin,
    esHuesped,
    esGuardiaOAdmin,
    esProfesional,
    creando,
    tiposDisponibles,
    torresReales,
    codigosDe,
    cuposDeVisita,
    navigation,

    // Estado del formulario
    diasTrabajo, setDiasTrabajo,
    tipoSeleccionado, setTipoSeleccionado,
    torre, setTorre,
    depto, setDepto,
    personas, setPersonas,
    cantidadMenores, setCantidadMenores,
    fijarCuantos, setFijarCuantos,
    plataforma, setPlataforma,
    selectedDate, setSelectedDate,
    fechaSalida, setFechaSalida,
    nombre, setNombre,
    tipoId, setTipoId,
    tiposDocumento: opcionesDeDocumento(documentos.reglas),
    identificacion, setIdentificacion,
    email, setEmail,
    telefono, setTelefono,
    horaInicio, setHoraInicio,
    profesion, setProfesion, oficios, pideOtraProfesion,
    profesionOtro, setProfesionOtro,
    tieneVehiculo, setTieneVehiculo,
    cantidadVehiculos, setCantidadVehiculos,
    vehiculos, setVehiculos,
    acompanantes, setAcompanantes,
    aviso, setAviso,
    aprobadoPor, setAprobadoPor,
    anotacionesGuardia, setAnotacionesGuardia,
    traeMascota,
    setTraeMascota,
    visitaCreadaId,
    showSuccess,
    esParaAdministracion, setEsParaAdministracion,
    showAvisoMenores, setShowAvisoMenores,
    fotosIngreso, setFotosIngreso,
    estacionamientosSel, setEstacionamientosSel,
    torreYDeptoOpcionales,

    handleGuardar,
    tipoPreseleccionado,
    salidaComoFecha,
    alElegirRango,
    llegadaElegida,
    borrarFechas,
    nochesMinimas,
    aforoDelAlojamiento,
    nochesMaximas,
    estacionamientosHuesped,
    diasOcupados: ocupados,
    cuantasPersonas,
    tieneSuscripcion,
  };
}
