import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  crearRolSchema,
  type CrearRolFormData,
} from "../schemas/crear-rol.schema";
import { usePropietarioResidentes } from "./usePropietarioResidentes";
import type { Residente } from "@/shared/types";

const SERVICIOS_INIT = {
  luz: false,
  agua: false,
  gas: false,
  internet: false,
  mantenimiento: false,
  alquiler: false,
};

export function usePropietarioRol(
  editData?: Partial<Residente> & Record<string, any>,
  rolPreseleccionado?: string,
) {
  const residentes = usePropietarioResidentes();
  const form = useForm<CrearRolFormData>({
    resolver: zodResolver(crearRolSchema) as any,
    defaultValues: {
      rol: editData?.rol || rolPreseleccionado || "",
      nombre: editData?.nombre || "",
      correo: editData?.correo || "",
      tipo: editData?.tipo || "",
      ci: editData?.ci || "",
      codigoArea: editData?.codigoArea || "",
      telefono: editData?.telefono || "",
      menorEdad: editData?.menorEdad || false,
      contactoNombre: editData?.contactoNombre || "",
      contactoCodigo: editData?.contactoCodigo || "",
      contactoTelefono: editData?.contactoTelefono || "",
      fechaInicio: editData?.fechaInicio || "",
      duracion: editData?.duracion || "",
      montoAlquiler: editData?.montoAlquiler || "",
      monitoreoPago: editData?.monitoreoPago || false,
      esAnfitrionPrimario: editData?.esAnfitrionPrimario || false,
      esAdministradorPrimario: editData?.esAdministradorPrimario || false,
      datosVisibles: editData?.datosVisibles ?? true,
      contactableChat: editData?.contactableChat ?? true,
      contactableWhatsapp: editData?.contactableWhatsapp ?? true,
    },
  });
  const [servicios, setServicios] = useState<Record<string, boolean>>({
    ...SERVICIOS_INIT,
    ...((editData?.servicios as Record<string, boolean>) || {}),
  });
  const [showServicios, setShowServicios] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const toggleServicio = (key: string) =>
    setServicios((prev) => ({ ...prev, [key]: !prev[key] }));
  const guardar = form.handleSubmit(async (values) => {
    const datos = {
      ...values,
      servicios,
      fecha: editData?.fecha || new Date().toLocaleDateString("es-AR"),
    };
    if (editData?.id)
      await residentes.actualizar.mutateAsync({
        ...editData,
        ...datos,
        id: editData.id,
      });
    else
      await residentes.crear.mutateAsync({
        ...datos,
        servicios: {},
        serviciosConfigurados: servicios,
      } as unknown as Omit<Residente, "id"> & Record<string, unknown>);
    setShowSuccess(true);
  });
  return {
    ...form,
    servicios,
    showServicios,
    setShowServicios,
    showSuccess,
    setShowSuccess,
    toggleServicio,
    guardar,
    esEdicion: !!editData,
  };
}
