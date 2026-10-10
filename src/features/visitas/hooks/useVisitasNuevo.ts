import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { obtenerVerificacionDeDocumento } from "@/features/administrador/services/condominio.repo";
import { diasOcupados } from "../services/visitas.repo";
import { obtenerSuscripcion } from "@/features/propietario/services/suscripcion.repo";
import { suscripcionVigente } from "@/features/propietario/services/suscripcionVigente";
import { TIPO_DOCUMENTO, TIPO_VEHICULO, claveDeEtiqueta } from "@/shared/constants";
import {
  useAdminStore,
  useAuthStore,
  useUbicacionStore,
  useUIStore,
} from "@/stores";
import {
  useUnidadesDisponibles,
  useNavegacion,
  useParametros,
  useCondominioActivo,
  useUnidadActiva,
} from "@/shared/hooks";
import { formatDate, formatDateInput, formatDateIso, formatTime } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import { tipoHaciaBase } from "../services/visitas.repo";
import { vehiculoHaciaBase } from "../helpers/vehiculos";
import { TIPOS_VISITA } from "../constants";
import { useVisitas } from "./useVisitas";
import { useVisitaNuevo } from "./useVisitaNuevo";

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
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  const estacionamientosAsignados = useAdminStore(
    (s) => s.estacionamientosAsignados,
  );

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

  /*
    Si la porteria compara el documento del invitado lo decide **el edificio**,
    no el tipo de visita. Antes esto era `tipo === "amigos" ? "no_verificar" :
    "verificar"`, escrito a fuego, mientras la pantalla le pedia el documento a
    quien invitaba y le decia que su invitado lo presentara en porteria: una
    comprobacion prometida que nadie hacia. Punto 66 de `REVISAR-A-OJO.md`.
  */
  const condominioId = useCondominioActivo() ?? "";
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
  const [profesion, setProfesion] = useState("");
  const [profesionOtro, setProfesionOtro] = useState("");
  const [tieneVehiculo, setTieneVehiculo] = useState(false);
  const [cantidadVehiculos, setCantidadVehiculos] = useState(1);
  const [vehiculos, setVehiculos] = useState<{ placa: string; tipo: string }[]>(
    [],
  );
  const [acompanantes, setAcompanantes] = useState<
    { nombre: string; ci: string; esMenor: boolean }[]
  >([]);
  const [aviso, setAviso] = useState<
    "solo_notificar" | "notificar_y_anunciar"
  >("notificar_y_anunciar");
  const [aprobadoPor, setAprobadoPor] = useState("");
  const [anotacionesGuardia, setAnotacionesGuardia] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [esParaAdministracion, setEsParaAdministracion] = useState(false);
  const [showAvisoMenores, setShowAvisoMenores] = useState(false);
  const [fotosIngreso, setFotosIngreso] = useState<string[]>([]);
  const [estacionamientosSel, setEstacionamientosSel] = useState<string[]>([]);

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
    setFechaSalida(hasta ? formatDateInput(hasta) : "");
  };

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
    if (tipoSeleccionado === "permanente") {
      setPersonas("1");
      setCantidadMenores(0);
    }
  }, [tipoSeleccionado]);

  useEffect(() => {
    const target = tieneVehiculo ? cantidadVehiculos : 0;
    setVehiculos((prev) => {
      const updated = [...prev];
      while (updated.length < target) updated.push({ placa: "", tipo: TIPO_VEHICULO.auto });
      while (updated.length > target) updated.pop();
      return updated;
    });
  }, [cantidadVehiculos, tieneVehiculo]);

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

  const handleGuardar = () => {
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
      addToast("Debe indicar quién aprobó el ingreso", "error");
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
    const fechaHastaStr = esEstancia ? formatDateIso(fechaSalida) : fechaStr;

    const visita = {
      id: Date.now(),
      tipo: tipoSeleccionado as VisitaItem["tipo"],
      nombre: nombre.trim(),
      ci: identificacion.trim(),
      estado: esGuardia ? "Ingresado" : "Programada",
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
        esProfesional && (profesion === "Otros" || profesion === "otros")
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
      addToast("Estamos cargando las viviendas. Probá en un momento.", "error");
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

    if (!unidadDestino && !esParaAdministracion) {
      addToast(
        esGuardiaOAdmin
          ? "No pudimos identificar la unidad de la visita. Elegí torre y departamento."
          : "No pudimos identificar tu vivienda. Volvé a entrar a la aplicación.",
        "error",
      );
      return;
    }

    crearVisita({
      condominioId: unidadDestino?.condominioId ?? "",
      unidadId: esParaAdministracion ? null : (unidadDestino?.unidadId ?? null),
      tipo: tipoHaciaBase(tipoSeleccionado as VisitaItem["tipo"]),
      estado: esGuardia ? "ingresada" : "programada",
      paraAdministracion: esParaAdministracion,
      fechaDesde: fechaStr,
      fechaHasta: fechaHastaStr,
      /*
        Lo que el anfitrion dijo en el contador, que hasta el 09/10/2026 se
        tiraba aqui mismo: viajaban los `invitados` --uno por acompañante con
        nombre-- y el total no. Solo para una estancia: en una visita normal
        no hay preregistro que limitar.
      */
      huespedesPrevistos: esHuespedTemporal ? cuantasPersonas : undefined,
      /*
        Y cuantos de ellos son menores, que se perdia por el mismo sitio: la
        ficha de un menor sin nombre no se crea, asi que de «1 menor» no
        quedaba nada. El cliente lo eligio asi el 09/10/2026, frente a crear
        fichas vacias ya marcadas.
      */
      menoresPrevistos: esHuespedTemporal ? cantidadMenores : undefined,
      horaEstimadaLlegada: esGuardia ? horaInicio : undefined,
      instruccionDocumento: verificarDocumento ? "verificar" : "no_verificar",
      aviso:
        aviso === "notificar_y_anunciar"
          ? "notificar_y_anunciar"
          : "solo_notificar",
      profesion: esProfesional ? profesion : undefined,
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

            El selector ofrece las etiquetas --«Cedula de ciudadania»-- y la
            columna es un enum, asi que hay que traducir: `claveDeEtiqueta`
            devuelve `null` si no cuadra, y entonces no se manda nada en vez de
            colar una cadena que Postgres rechazaria.
          */
          tipoDocumento:
            claveDeEtiqueta(TIPO_DOCUMENTO, tipoId) ?? undefined,
        },
        ...acompanantes
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre.trim(),
            documentoNumero: a.ci,
            esMenor: a.esMenor,
          })),
      ],
      vehiculos: tieneVehiculo
        ? vehiculos
            .filter((v) => v.placa.trim())
            .map((v) => ({ placa: v.placa.trim(), tipo: vehiculoHaciaBase(v.tipo) }))
        : [],
    }, {
      // La pantalla de exito solo aparece si la visita quedo guardada. Antes se
      // mostraba de inmediato y, si el guardado fallaba, el usuario veia el
      // mensaje de exito y el error a la vez.
      onSuccess: () => setShowSuccess(true),
    });
  };

  return {
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
    estacionamientos,
    estacionamientosAsignados,
    navigation,

    // Estado del formulario
    tipoSeleccionado, setTipoSeleccionado,
    torre, setTorre,
    depto, setDepto,
    personas, setPersonas,
    cantidadMenores, setCantidadMenores,
    selectedDate, setSelectedDate,
    fechaSalida, setFechaSalida,
    nombre, setNombre,
    tipoId, setTipoId,
    identificacion, setIdentificacion,
    email, setEmail,
    telefono, setTelefono,
    horaInicio, setHoraInicio,
    profesion, setProfesion,
    profesionOtro, setProfesionOtro,
    tieneVehiculo, setTieneVehiculo,
    cantidadVehiculos, setCantidadVehiculos,
    vehiculos, setVehiculos,
    acompanantes, setAcompanantes,
    aviso, setAviso,
    aprobadoPor, setAprobadoPor,
    anotacionesGuardia, setAnotacionesGuardia,
    showSuccess,
    esParaAdministracion, setEsParaAdministracion,
    showAvisoMenores, setShowAvisoMenores,
    fotosIngreso, setFotosIngreso,
    estacionamientosSel, setEstacionamientosSel,

    handleGuardar,
    tipoPreseleccionado,
    salidaComoFecha,
    alElegirRango,
    diasOcupados: ocupados,
    cuantasPersonas,
    tieneSuscripcion,
  };
}
