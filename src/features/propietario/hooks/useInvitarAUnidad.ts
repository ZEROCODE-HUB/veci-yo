import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useUIStore, useUbicacionStore, useAdminStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { ENVIO_CORREO_ACTIVO } from "@/shared/services/invitaciones";
import type { Database } from "@/shared/types/database.types";
import {
  invitarAUnidad,
  obtenerInvitacionesPendientes,
  obtenerPersonasDeUnidad,
  registrarMenor,
  revocarInvitacion,
} from "../services/invitacionesUnidad.repo";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];

/** Las etiquetas que ve la gente; el enum vive en la base. */
export const ETIQUETA_ROL: Record<RolUnidad, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  corresidente: "Corresidente",
  coadministrador: "Coadministrador",
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
 * El huésped temporal deberia crearse por el precheckin —que se autoregistra
 * con su documento y su selfie—, y ese flujo todavia no existe. Hasta que
 * exista se ofrece aqui a quien administra el edificio, porque quitarlo
 * dejaria sin ninguna forma de dar de alta un huesped. Esta anotado.
 */
const ROLES_DE_LA_VIVIENDA: RolUnidad[] = [
  "inquilino_lider",
  "coadministrador",
  "residente",
  "corresidente",
];

const ROLES_SOLO_ADMINISTRACION: RolUnidad[] = [
  "propietario",
  "huesped_temporal",
];

export interface FormularioInvitacion {
  nombre: string;
  correo: string;
  rol: RolUnidad;
  vigenteDesde: string;
  vigenteHasta: string;
}

const VACIO: FormularioInvitacion = {
  nombre: "",
  correo: "",
  rol: "residente",
  vigenteDesde: "",
  vigenteHasta: "",
};

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

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
  const rolesInvitables = useMemo(
    () =>
      [
        ...ROLES_DE_LA_VIVIENDA,
        ...(esAdministracion ? ROLES_SOLO_ADMINISTRACION : []),
      ].map((value) => ({ value, label: ETIQUETA_ROL[value] })),
    [esAdministracion],
  );

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

  /**
   * La validación vive aquí para poder decir qué falta antes de llamar a la
   * base. La base la repite de todos modos: es el límite, no el formulario.
   */
  const error = useMemo(() => {
    if (!form.nombre.trim()) return "Falta el nombre de la persona";
    if (!form.correo.includes("@")) return "El correo no parece válido";
    if (esHuesped) {
      if (!ES_FECHA.test(form.vigenteHasta))
        return "Un huésped temporal necesita la fecha de fin de la estancia";
      if (form.vigenteDesde && !ES_FECHA.test(form.vigenteDesde))
        return "La fecha de inicio tiene que ser aaaa-mm-dd";
      if (form.vigenteDesde && form.vigenteDesde > form.vigenteHasta)
        return "La estancia termina antes de empezar";
      const hoy = new Date().toISOString().slice(0, 10);
      if (form.vigenteHasta < hoy) return "Esa estancia ya terminó";
    }
    return null;
  }, [form, esHuesped]);

  const invitar = useMutation({
    mutationFn: async () => {
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
   * Un menor no se invita: se registra. El KT (flujo 4.3 paso 3) decide que
   * figura en la vivienda **sin acceso a la plataforma**, y una invitacion
   * existe justamente para crear una cuenta. Hasta ahora no habia forma de
   * darlo de alta: el unico camino exigia un correo.
   */
  const [menor, setMenor] = useState({ nombre: "", telefono: "" });

  const registrar = useMutation({
    mutationFn: () =>
      registrarMenor({
        unidadId,
        nombre: menor.nombre.trim(),
        telefono: menor.telefono.trim() || undefined,
      }),
    onSuccess: () => {
      setMenor({ nombre: "", telefono: "" });
      queryClient.invalidateQueries({ queryKey: ["unidad", "personas"] });
      addToast("Residente menor registrado", "success");
    },
    onError: (e: Error) =>
      addToast(e?.message ?? "No se pudo registrar", "error"),
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
    cargando: personas.isLoading || pendientes.isLoading,
    form,
    setForm,
    esHuesped,
    error,
    enlace,
    cerrarEnlace: () => setEnlace(null),
    envioCorreoActivo: ENVIO_CORREO_ACTIVO,
    invitar: () => invitar.mutate(),
    invitando: invitar.isPending,
    menor,
    setMenor,
    errorMenor: menor.nombre.trim() ? null : "Falta el nombre",
    registrarMenor: () => registrar.mutate(),
    registrandoMenor: registrar.isPending,
    revocar: (id: string) => revocar.mutate(id),
  };
}
