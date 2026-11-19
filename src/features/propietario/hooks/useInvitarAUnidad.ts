import { useMemo, useState } from "react";
import { ahora, formatDateInput } from "@/shared/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opcionesDeDocumento } from "@/shared/services/documentos.repo";
import { RESIDENTES_UNIDAD_KEY } from "./usePropietarioConfiguracion";
import { useAuthStore, useUIStore, useUbicacionStore, useAdminStore } from "@/stores";
import { useCondominioActivo, useDocumentosDelEdificio, useUnidadActiva } from "@/shared/hooks";
import { estadoDe } from "@/shared/components";
import type { Database } from "@/shared/types/database.types";
import {
  agregarPersonaSinApp,
  invitarAUnidad,
  obtenerInvitacionesPendientes,
  obtenerPersonasDeUnidad,
  revocarInvitacion,
} from "../services/invitacionesUnidad.repo";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];
type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

/** Las etiquetas que ve la gente; el enum vive en la base. */
export const ETIQUETA_ROL: Record<RolUnidad, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  /*
    Desde el 17/11/2026 ya no hay corresidentes: los que había pasaron a
    residente. El valor sigue en la base para las versiones viejas.
  */
  corresidente: "Residente",
  /*
    El `coadministrador` de una vivienda se llama «Anfitrión» (17/11/2026,
    plan aprobado por el cliente): atiende la renta corta por el dueño. En la
    base el valor no cambia.
  */
  coadministrador: "Anfitrión",
  huesped_temporal: "Huésped temporal",
};

/**
 * Quién puede dar de alta a quién. Es una decisión del KT (flujo 4.3):
 *
 *   "Solo puede crear 3 tipos: Inquilino Líder, Coadministrador, Residente.
 *    No puede crear Huésped Temporal (va por otro flujo) ni Propietario (lo
 *    crea el Administrador del edificio)." [DECIDIDO]
 *
 * El propietario gestiona a su gente; quién es el dueño de una vivienda lo
 * registra la administración, que es la que responde por esa verdad.
 *
 * El huésped temporal se crea por la renta corta y su preregistro (el
 * preregistro web; la selfie la descartó el cliente el 05/11/2026), así que
 * aquí ya no se ofrece: ver el bloque de abajo.
 */
/*
  Sin «Coadministrador» ni «Huésped temporal» desde el 30/10/2026 (Para
  Claude 180): el huésped llega por la renta corta y su preregistro, y la
  administración del edificio se nombra en otra parte. Y el propietario que
  se añade aquí es un **copropietario**: el primero lo registra la
  administración al crear la vivienda.
*/
/*
  17/11/2026: sale «Corresidente» --era lo mismo que un residente-- y vuelve
  el coadministrador con su nombre de verdad, «Anfitrión».
*/
const ROLES_DE_LA_VIVIENDA: RolUnidad[] = [
  "inquilino_lider",
  "residente",
  "coadministrador",
];

/*
  El anfitrión lo pone el dueño: atiende **su** renta corta. Y el inquilino
  líder también (18/11/2026, pedido del cliente): el inquilino líder solo
  invita residentes. La base lo sujeta en `crear_invitacion`.
*/
const ROLES_SOLO_DEL_DUENO: RolUnidad[] = ["coadministrador", "inquilino_lider"];

/** Una línea bajo el desplegable que dice qué es el rol elegido. */
export const AYUDA_DEL_ROL: Partial<Record<RolUnidad, string>> = {
  coadministrador:
    "Quien atiende la renta corta por ti, por ejemplo una empresa de Airbnb o un familiar. Puede haber varios.",
  propietario: "Otro dueño de esta vivienda: verá y gestionará lo mismo que tú.",
};

/*
  El copropietario: desde el 18/11/2026 lo invita también el propietario
  (pedido del cliente; antes solo la administración, KT 4.3).
*/
const ROLES_DEL_DUENO_Y_LA_ADMINISTRACION: RolUnidad[] = ["propietario"];

/** Cómo se llama cada rol en este desplegable. */
const ETIQUETA_EN_LA_INVITACION: Partial<Record<RolUnidad, string>> = {
  propietario: "Copropietario",
};

/** Las opciones del desplegable «Rol en la vivienda» para quien invita. */
export function rolesQuePuedeInvitar(quien: { esDueno: boolean; esAdministracion: boolean }) {
  return [
    ...ROLES_DE_LA_VIVIENDA.filter(
      (rol) => quien.esDueno || quien.esAdministracion || !ROLES_SOLO_DEL_DUENO.includes(rol),
    ),
    ...(quien.esAdministracion || quien.esDueno ? ROLES_DEL_DUENO_Y_LA_ADMINISTRACION : []),
  ].map((value) => ({
    value,
    label: ETIQUETA_EN_LA_INVITACION[value] ?? ETIQUETA_ROL[value],
  }));
}

export interface FormularioInvitacion {
  nombre: string;
  correo: string;
  rol: RolUnidad;
  vigenteDesde: string;
  vigenteHasta: string;
  /**
   * Solo cuenta para un residente (17/11/2026): si no va a usar la app --un
   * niño, un abuelo-- se anota sin correo.
   */
  usaApp: boolean;
  tipoDocumento: string;
  documento: string;
  esMenor: boolean;
}

const VACIO: FormularioInvitacion = {
  nombre: "",
  correo: "",
  rol: "residente",
  vigenteDesde: "",
  vigenteHasta: "",
  usaApp: true,
  tipoDocumento: "",
  documento: "",
  esMenor: false,
};

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Si la persona se anota en la vivienda sin cuenta, en vez de invitarla
 * (17/11/2026). Solo un residente: si no usará la app (un abuelo) o si es
 * menor de edad. A un menor no se le crea cuenta --ni correo, ni invitación,
 * ni app--, lo diga o no la pestaña «¿Usará la app?», y no se le pide fecha
 * de nacimiento: basta con marcar «Es menor de edad» (decisión del cliente).
 * La base lo sujeta igual (`membresia_unidad_menor_sin_acceso`,
 * `invitacion_no_es_para_un_menor`).
 */
export function seAnotaSinApp(form: Pick<FormularioInvitacion, "rol" | "usaApp" | "esMenor">): boolean {
  return form.rol === "residente" && (form.esMenor || !form.usaApp);
}

export function useInvitarAUnidad() {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const unidades = useAdminStore((state) => state.unidades);

  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const unidad = unidades.find(
    (item) => item.codigo === ubicacionActiva?.codigo,
  );
  const unidadId = unidad?.uuid ?? "";
  const condominioId = useCondominioActivo() ?? "";

  const condominios = useAuthStore((state) => state.condominios);
  const esAdministracion = condominios.some(
    (c) => c.rol === "administrador" || c.rol === "coadministrador",
  );
  const esDueno = useUnidadActiva()?.rol === "propietario";
  const rolesInvitables = useMemo(
    () => rolesQuePuedeInvitar({ esDueno, esAdministracion }),
    [esAdministracion, esDueno],
  );

  /** Los documentos del país del edificio, como en los demás formularios. */
  const documentos = useDocumentosDelEdificio(condominioId);

  const [form, setForm] = useState<FormularioInvitacion>(VACIO);
  const [enlace, setEnlace] = useState<string | null>(null);

  const personas = useQuery({
    queryKey: ["unidad", "personas", unidadId],
    queryFn: () => obtenerPersonasDeUnidad(unidadId),
    enabled: Boolean(unidadId),
  });

  const pendientes = useQuery({
    queryKey: ["unidad", "invitaciones", unidadId],
    queryFn: () => obtenerInvitacionesPendientes(unidadId),
    enabled: Boolean(unidadId),
  });

  const esHuesped = form.rol === "huesped_temporal";
  /** Un residente que no usará la app: se anota, no se invita (17/11/2026). */
  const sinApp = seAnotaSinApp(form);
  const documentosOfrecidos = useMemo(
    () => opcionesDeDocumento(documentos.reglas, form.esMenor ? "menores" : "adultos"),
    [documentos.reglas, form.esMenor],
  );

  /**
   * La validación vive aquí para poder decir qué falta antes de llamar a la
   * base. La base la repite de todos modos: es el límite, no el formulario.
   */
  const error = useMemo(() => {
    if (!form.nombre.trim()) return "Falta el nombre de la persona";
    if (sinApp) {
      const numero = form.documento.trim();
      if (!numero) return null;
      if (!form.tipoDocumento) return "Elige el tipo de documento";
      const regla = documentos.reglaDe(form.tipoDocumento);
      if (regla?.soloCifras && !/^\d+$/.test(numero))
        return "El número de documento lleva solo cifras";
      if (regla && (numero.length < regla.largoMinimo || numero.length > regla.largoMaximo))
        return `El documento tiene entre ${regla.largoMinimo} y ${regla.largoMaximo} caracteres`;
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.correo.trim()))
      return "El correo no parece válido";
    if (esHuesped) {
      if (!ES_FECHA.test(form.vigenteHasta))
        return "Un huésped temporal necesita la fecha de fin de la estancia";
      if (form.vigenteDesde && !ES_FECHA.test(form.vigenteDesde))
        return "La fecha de inicio tiene que ser aaaa-mm-dd";
      if (form.vigenteDesde && form.vigenteDesde > form.vigenteHasta)
        return "La estancia termina antes de empezar";
      const hoy = formatDateInput(ahora());
      if (form.vigenteHasta < hoy) return "Esa estancia ya terminó";
    }
    return null;
  }, [form, esHuesped, sinApp, documentos]);

  const invitar = useMutation({
    mutationFn: async () => {
      // Un menor nunca recibe invitación: se anota sin cuenta (17/11/2026).
      if (form.esMenor) throw new Error("Un menor de edad no puede tener cuenta en la app");
      return invitarAUnidad({
        condominioId,
        unidadId,
        rol: form.rol,
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        // Solo se mandan si son de un huésped: para los demás roles no
        // significan nada y una fecha suelta ahí sería ruido en la tabla.
        vigenteDesde: esHuesped ? form.vigenteDesde || undefined : undefined,
        vigenteHasta: esHuesped ? form.vigenteHasta || undefined : undefined,
      });
    },
    onSuccess: (resultado) => {
      // Mientras el envío de correo esté apagado, el enlace se muestra para
      // poder pasarlo a mano. Con el envío encendido no vuelve.
      setEnlace(resultado.enlace);
      setForm(VACIO);
      queryClient.invalidateQueries({ queryKey: ["unidad", "invitaciones"] });
      addToast(
        resultado.correoEnviado
          ? "Invitación enviada por correo"
          : "Invitación creada. Copia el enlace y pásaselo.",
        "success",
      );
    },
    onError: (e: Error) => addToast(e?.message ?? "No se pudo invitar", "error"),
  });

  /**
   * Quien vive en la vivienda y no usará la app (17/11/2026): un niño, un
   * abuelo. Reemplaza al «Registrar a un menor» de antes, que solo servía
   * para menores: el KT (flujo 4.3 paso 3) decide que figuran en la vivienda
   * sin acceso a la plataforma, y ahora también puede ser un adulto.
   */
  const agregar = useMutation({
    mutationFn: () =>
      agregarPersonaSinApp({
        unidadId,
        nombre: form.nombre.trim(),
        tipoDocumento: (form.tipoDocumento || undefined) as TipoDocumento | undefined,
        documento: form.documento.trim() || undefined,
        esMenor: form.esMenor,
      }),
    onSuccess: () => {
      setForm(VACIO);
      queryClient.invalidateQueries({ queryKey: ["unidad", "personas"] });
      queryClient.invalidateQueries({ queryKey: RESIDENTES_UNIDAD_KEY });
      addToast("Agregado a la vivienda", "success");
    },
    onError: (e: Error) => addToast(e?.message ?? "No se pudo agregar", "error"),
  });

  const revocar = useMutation({
    mutationFn: revocarInvitacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidad", "invitaciones"] });
      addToast("Invitación revocada", "success");
    },
    onError: (e: Error) => addToast(e?.message ?? "No se pudo revocar", "error"),
  });

  return {
    rolesInvitables,
    ubicacionActiva,
    puedeInvitar: Boolean(unidadId && condominioId),
    personas: personas.data ?? [],
    pendientes: pendientes.data ?? [],
    /*
      Sin esto, «Todavía no hay nadie dado de alta» salía mientras cargaba y
      también si la carga fallaba (13/11/2026).
    */
    cargaDePersonas: estadoDe(personas),
    cargaDePendientes: estadoDe(pendientes),
    /** La invitación que se está revocando: solo esa gira. */
    revocandoId: revocar.isPending ? revocar.variables : undefined,
    cargando: personas.isLoading || pendientes.isLoading,
    form,
    setForm,
    esHuesped,
    error,
    enlace,
    cerrarEnlace: () => setEnlace(null),
    sinApp,
    documentosOfrecidos,
    /** «Enviar invitación» o, sin app, «Agregar a la vivienda». */
    invitar: () => (sinApp ? agregar.mutate() : invitar.mutate()),
    invitando: invitar.isPending || agregar.isPending,
    revocar: (id: string) => revocar.mutate(id),
  };
}
