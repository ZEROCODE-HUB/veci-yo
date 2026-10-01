import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import {
  agregarUbicacionRequest,
  actualizarUbicacionRequest,
  eliminarUbicacionRequest,
  obtenerUbicacionesRequest,
} from "../services";
import type { UbicacionFormulario } from "../types";
import type { Ubicacion } from "@/shared/types";

export const CAMPOS_VACIOS: UbicacionFormulario = {
  distrito: "",
  urbanizacion: "",
  condominio: "",
  correoAdm: "",
  imagen: null,
};

type UbicacionExtendida = Ubicacion & {
  distrito?: string;
  urbanizacion?: string;
  correoAdm?: string;
};

export function useAdministracionUbicacion() {
  const queryClient = useQueryClient();
  const modo = useAuthStore((state) => state.modo);
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const toggleFavoritoUbicacion = useUbicacionStore(
    (state) => state.toggleFavoritoUbicacion,
  );
  const addToast = useUIStore((state) => state.addToast);
  const [showAgregar, setShowAgregar] = useState(false);
  const [deleteUbicacion, setDeleteUbicacion] = useState<Ubicacion | null>(null);
  const [editUbicacion, setEditUbicacion] = useState<Ubicacion | null>(null);
  const [formValues, setFormValues] = useState<UbicacionFormulario>(CAMPOS_VACIOS);

  useQuery({
    queryKey: ["inquilino-lider", "ubicaciones"],
    queryFn: obtenerUbicacionesRequest,
  });

  const invalidarUbicaciones = () =>
    queryClient.invalidateQueries({
      queryKey: ["inquilino-lider", "ubicaciones"],
    });

  const agregarMutation = useMutation({
    mutationFn: agregarUbicacionRequest,
    onSuccess: () => {
      addToast("Ubicación agregada", "success");
      invalidarUbicaciones();
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: actualizarUbicacionRequest,
    onSuccess: () => {
      addToast("Ubicación actualizada", "success");
      invalidarUbicaciones();
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarUbicacionRequest,
    onSuccess: () => {
      addToast("Ubicación eliminada", "success");
      invalidarUbicaciones();
    },
  });

  const abrirAgregar = () => {
    if (modo === "incognito") return;

    setFormValues(CAMPOS_VACIOS);
    setShowAgregar(true);
  };

  const abrirEditar = (ubicacion: Ubicacion) => {
    const item = ubicacion as UbicacionExtendida;
    setFormValues({
      distrito: item.distrito || "",
      urbanizacion: item.urbanizacion || "",
      condominio: item.alias || "",
      correoAdm: item.correoAdm || "",
      imagen: item.imagen || null,
    });
    setEditUbicacion(ubicacion);
  };

  return {
    esIncognito: modo === "incognito",
    rolActivo,
    ubicaciones,
    formValues,
    showAgregar,
    deleteUbicacion,
    editUbicacion,
    isSaving: agregarMutation.isPending || actualizarMutation.isPending,
    abrirAgregar,
    abrirEditar,
    setFormValues,
    cerrarAgregar: () => setShowAgregar(false),
    cerrarEditar: () => setEditUbicacion(null),
    cerrarEliminar: () => setDeleteUbicacion(null),
    setDeleteUbicacion,
    toggleFavoritoUbicacion,
    confirmarAgregar: (values: UbicacionFormulario) => {
      setShowAgregar(false);
      agregarMutation.mutate(values);
    },
    confirmarEditar: (values: UbicacionFormulario) => {
      if (editUbicacion) {
        setEditUbicacion(null);
        actualizarMutation.mutate({ id: editUbicacion.id, datos: values });
      }
    },
    confirmarEliminar: () => {
      if (deleteUbicacion) {
        setDeleteUbicacion(null);
        eliminarMutation.mutate(deleteUbicacion.id);
      }
    },
  };
}
