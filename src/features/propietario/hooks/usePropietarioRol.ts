import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import type { ResidenteDeUnidad } from "../services/residentes.repo";
import {
  crearRolSchema,
  type CrearRolFormData,
  type CrearRolFormEntrada,
} from "../schemas/crear-rol.schema";
import {
  cambiarVisibilidad,
  designarPrimario,
} from "../services/residentes.repo";
import type { Residente } from "@/shared/types";
import { mensajeDeError } from "@/shared/utils/error.util";

/**
 * Editar a alguien que ya está en la vivienda.
 *
 * Hasta el 09/10/2026 este hook también **daba de alta**, y era el segundo
 * camino para lo mismo: la pantalla «Invitar a la vivienda» ya invitaba y
 * registraba menores. Los dos se separaron en silencio. Este, además, emitía
 * la invitación y **no enseñaba el enlace** —con el correo apagado, la persona
 * no se enteraba nunca— y al terminar decía «Alquiler tradicional configurado
 * con éxito», fuera lo que fuera.
 *
 * El alta se queda en un solo sitio, Invitar. Aquí queda lo que solo aquí se
 * hacía: cambiar qué se ve de una persona y designarla primaria.
 */

/**
 * Lo que llega al editar un residente.
 *
 * Es `ResidenteDeUnidad` --lo que trae la consulta-- mas dos campos que el
 * formulario lee y la consulta no puede dar: `correo`, que no vive en `perfil`
 * --la regla 3: la identidad es `auth.users.id` y el correo es un atributo que
 * cambia-- y `tipo`, el tipo de documento, que nadie guarda todavia.
 *
 * Eran once. Los tres del contacto de emergencia ya se traen (29/09/2026), y
 * los cuatro del contrato --`fechaInicio`, `duracion`, `montoAlquiler`,
 * `monitoreoPago`-- se quitaron porque ningun formulario los pintaba. Punto 49
 * de `REVISAR-A-OJO.md`.
 *
 * Se declara asi, y no con `Record<string, any>`, para que se vea cual falta.
 * No vale `Partial<Residente>` a secas porque su `id` es un numero y el de la
 * consulta una cadena --el rastro de los ids inventados en el prototipo--.
 */
export type ResidenteAEditar = ResidenteDeUnidad &
  Partial<Pick<Residente, "correo">>;

export function usePropietarioRol(editData?: ResidenteAEditar) {
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();

  const form = useForm<CrearRolFormEntrada, unknown, CrearRolFormData>({
    resolver: zodResolver(crearRolSchema),
    defaultValues: {
      rol: editData?.rol || "",
      nombre: editData?.nombre || "",
      correo: editData?.correo || "",
      telefono: editData?.telefono || "",
      menorEdad: editData?.esMenor ?? false,
      contactoNombre: editData?.contactoNombre || "",
      contactoCodigo: editData?.contactoCodigo || "",
      contactoTelefono: editData?.contactoTelefono || "",
      esAnfitrionPrimario: editData?.esAnfitrionPrimario || false,
      esAdministradorPrimario: editData?.esAdministradorPrimario || false,
      datosVisibles: editData?.datosVisibles ?? true,
      contactableChat: editData?.contactableChat ?? true,
      contactableWhatsapp: editData?.contactableWhatsapp ?? true,
    },
  });

  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * La edición toca lo que es de la membresía y nada más.
   *
   * El nombre y el teléfono de alguien con cuenta son de su perfil, no de
   * quien la invitó, así que aquí solo se cambian las banderas.
   */
  const edicion = useMutation({
    mutationFn: async (valores: CrearRolFormData) => {
      const membresiaId = String(editData?.id ?? "");
      if (!membresiaId) throw new Error("No se sabe a quién editar.");

      await cambiarVisibilidad(membresiaId, {
        datosVisibles: valores.datosVisibles,
        contactableChat: valores.contactableChat,
        contactableWhatsapp: valores.contactableWhatsapp,
      });

      if (valores.esAnfitrionPrimario && !editData?.esAnfitrionPrimario) {
        await designarPrimario(membresiaId, "anfitrion");
      }
      if (valores.esAdministradorPrimario && !editData?.esAdministradorPrimario) {
        await designarPrimario(membresiaId, "administrador");
      }
      return null;
    },
    onSuccess: () => {
      setShowSuccess(true);
      void client.invalidateQueries({
        queryKey: ["propietario", "residentes-unidad"],
      });
    },
    onError: (error) =>
      addToast(
        mensajeDeError(error, "No se pudo guardar"),
        "error",
      ),
  });

  const guardar = form.handleSubmit(async (valores) => {
    await edicion.mutateAsync(valores);
  });

  return {
    ...form,
    showSuccess,
    setShowSuccess,
    guardar,
    guardando: edicion.isPending,
    esEdicion: !!editData,
  };
}
