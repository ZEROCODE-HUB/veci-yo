import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import { crearInvitacion } from "@/shared/services/invitaciones";
import type { ResidenteDeUnidad } from "../services/residentes.repo";
import {
  crearRolSchema,
  type CrearRolFormData,
  type CrearRolFormEntrada,
} from "../schemas/crear-rol.schema";
import { registrarMenor } from "../services/invitacionesUnidad.repo";
import {
  cambiarVisibilidad,
  designarPrimario,
} from "../services/residentes.repo";
import type { Residente } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";

type RolUnidadDB = Database["public"]["Enums"]["rol_unidad"];

/**
 * Dar de alta a alguien en la vivienda.
 *
 * Escribía en `propietario.service.ts`, que era una imitación de red entera:
 * `setTimeout` de 180 ms y un store de Zustand. La persona aparecía en la
 * lista hasta recargar y no llegaba a ninguna tabla.
 *
 * Ahora es lo que ya existía y nadie llamaba desde aquí: una **invitación** si
 * la persona va a tener cuenta, y `registrar_menor()` si es un menor, que el
 * KT decide que figura en la vivienda sin acceso a la plataforma.
 *
 * Lo que este formulario **ya no pide**:
 *
 *   * el documento de identidad de la otra persona, porque quien invita no
 *     rellena el documento de nadie: eso es del perfil de cada quien, y la
 *     base no deja escribirlo sobre otro;
 *   * el monto del alquiler, la duración y los servicios incluidos, que son un
 *     contrato y tienen su propia pantalla desde que existe la tabla.
 */

const HACIA_ROL_DB: Record<string, RolUnidadDB> = {
  "Residente Inquilino Lider": "inquilino_lider",
  Coadministrador: "coadministrador",
  Residente: "residente",
  Corresidente: "corresidente",
};

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
  Partial<Pick<Residente, "correo" | "tipo" | "codigoArea">>;

export function usePropietarioRol(
  editData?: ResidenteAEditar,
  rolPreseleccionado?: string,
) {
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();

  const form = useForm<CrearRolFormEntrada, unknown, CrearRolFormData>({
    resolver: zodResolver(crearRolSchema),
    defaultValues: {
      rol: editData?.rol || rolPreseleccionado || "",
      nombre: editData?.nombre || "",
      correo: editData?.correo || "",
      tipo: editData?.tipo || "",
      ci: editData?.ci || "",
      codigoArea: editData?.codigoArea || "",
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

  /** El enlace de la invitación, mientras el envío de correo esté apagado. */
  const [enlace, setEnlace] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const alta = useMutation({
    mutationFn: async (valores: CrearRolFormData) => {
      if (!unidadId) throw new Error("No hay ninguna vivienda activa.");

      const contactoEmergencia = {
        nombre: valores.contactoNombre,
        codigo: valores.contactoCodigo,
        telefono: valores.contactoTelefono,
      };

      // Un menor figura en la vivienda **sin acceso**, así que no lleva correo
      // ni invitación: la invitación existe justamente para crear una cuenta.
      if (valores.menorEdad) {
        await registrarMenor({
          unidadId,
          nombre: valores.nombre,
          telefono: valores.telefono,
          contactoEmergencia,
        });
        return null;
      }

      if (!valores.correo?.trim()) {
        throw new Error("Hace falta el correo para poder invitar a la persona.");
      }

      const rol = HACIA_ROL_DB[valores.rol];
      if (!rol) {
        throw new Error(
          "Elegí un rol. Al propietario lo registra la administración del edificio.",
        );
      }

      const creada = await crearInvitacion({
        ambito: "unidad",
        condominioId,
        unidadId,
        rol,
        nombre: valores.nombre,
        correo: valores.correo.trim(),
        contactoEmergencia,
      });
      return creada.enlace;
    },
    onSuccess: (enlaceCreado) => {
      setEnlace(enlaceCreado);
      setShowSuccess(true);
      void client.invalidateQueries({
        queryKey: ["propietario", "residentes-unidad"],
      });
      void client.invalidateQueries({ queryKey: ["invitaciones-unidad"] });
    },
    onError: (error) =>
      addToast(
        error instanceof Error ? error.message : "No se pudo dar de alta",
        "error",
      ),
  });

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
        error instanceof Error ? error.message : "No se pudo guardar",
        "error",
      ),
  });

  const guardar = form.handleSubmit(async (valores) => {
    if (editData?.id) {
      await edicion.mutateAsync(valores);
    } else {
      await alta.mutateAsync(valores);
    }
  });

  return {
    ...form,
    showSuccess,
    setShowSuccess,
    guardar,
    guardando: alta.isPending || edicion.isPending,
    esEdicion: !!editData,
    /**
     * El enlace de la invitación. Se muestra porque el envío de correo está
     * apagado a propósito durante las pruebas: sin él no habría forma de
     * recorrer el alta.
     */
    enlace,
  };
}
