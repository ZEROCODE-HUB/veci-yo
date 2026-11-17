import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore, useUbicacionStore } from "@/stores";
import { estadoDe } from "@/shared/components";
import { paisPorDefecto } from "@/shared/constants";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  agregarTrabajador,
  darDeBajaTrabajador,
  obtenerTrabajadores,
} from "../services/trabajadores.repo";
import { errorDelTrabajador, type FormularioTrabajador } from "../helpers/trabajadorPermanente";

function vacio(): FormularioTrabajador {
  return { nombre: "", oficio: "", codigoPais: paisPorDefecto(), telefono: "", conApp: false, correo: "" };
}

/**
 * Los trabajadores permanentes de la vivienda activa (17/11/2026): la lista,
 * agregar uno y darlo de baja. La vivienda es la misma que la de «Invitar a
 * alguien» (la ubicación activa).
 */
export function useTrabajadoresDeLaVivienda() {
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const unidadId = (ubicaciones.find((u) => u.favorito) ?? ubicaciones[0])?.unidadId ?? "";
  const clave = ["unidad", "trabajadores", unidadId];

  const lista = useQuery({
    queryKey: clave,
    queryFn: () => obtenerTrabajadores(unidadId),
    enabled: Boolean(unidadId),
  });

  const [form, setForm] = useState<FormularioTrabajador>(vacio);
  const error = useMemo(() => errorDelTrabajador(form), [form]);

  const refrescar = () => {
    void client.invalidateQueries({ queryKey: ["unidad", "trabajadores"] });
    // El directorio de la vivienda los enseña también.
    void client.invalidateQueries({ queryKey: ["directorio", "trabajadores"] });
  };

  const agregar = useMutation({
    mutationFn: () =>
      agregarTrabajador({
        unidadId,
        nombre: form.nombre.trim(),
        oficio: form.oficio.trim() || undefined,
        codigoPais: form.telefono.trim() ? form.codigoPais : undefined,
        telefono: form.telefono.trim() || undefined,
        conApp: form.conApp,
        correo: form.correo.trim().toLowerCase(),
      }),
    onSuccess: () => {
      const conApp = form.conApp;
      setForm(vacio());
      refrescar();
      addToast(
        conApp
          ? "Agregado. Al entrar a la app con ese correo verá la invitación"
          : "Agregado al directorio de la vivienda",
        "success",
      );
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo agregar"), "error"),
  });

  const darDeBaja = useMutation({
    mutationFn: darDeBajaTrabajador,
    onSuccess: () => {
      refrescar();
      addToast("Dado de baja", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo dar de baja"), "error"),
  });

  return {
    puede: Boolean(unidadId),
    trabajadores: lista.data ?? [],
    carga: estadoDe(lista),
    form,
    setForm,
    error,
    agregar: () => agregar.mutate(),
    agregando: agregar.isPending,
    darDeBaja: (id: string) => darDeBaja.mutate(id),
    dandoDeBajaId: darDeBaja.isPending ? darDeBaja.variables : undefined,
  };
}
