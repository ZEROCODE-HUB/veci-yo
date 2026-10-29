import React from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
import { useReclamos } from "@/features/perfil/hooks/useReclamos";
import type { DetalleDeZona } from "./tipos";

/**
 * La portería registra un comentario o una incidencia sobre una reserva.
 *
 * Esto solo vaciaba el formulario: la portería escribía, pulsaba, la ventana se
 * cerraba y no quedaba nada en ningún sitio (13/10/2026). Ahora abre una PQRS, y
 * la ventana se cierra cuando se guardó: si falla, lo escrito sigue ahí.
 */
export function IncidenciaDeReserva({ zona: z, nombreDeLaZona }: { zona: DetalleDeZona; nombreDeLaZona: string }) {
  const { crear: crearPqrs } = useReclamos();
  const addToast = useUIStore((s) => s.addToast);
  const item = z.incidenciaItem;
  const cerrar = () => {
    z.setIncidenciaItem(null);
    z.setIncidenciaTexto("");
  };

  const enviar = () => {
    if (!item) return;
    crearPqrs
      .mutateAsync({
        datos: {
          titulo: `Incidencia en ${nombreDeLaZona} · reserva N° ${item.reservaNum}`,
          descripcion: [
            z.incidenciaTexto.trim(),
            "",
            `Reserva N° ${item.reservaNum} · ${item.depto} · ${item.horario}`,
          ].join("\n"),
          // Códigos de `areas_de_pqrs` y `tipos_de_pqrs`.
          area: "condominio",
          tipo: "reclamo",
          destinatario: "",
          correo: "",
          telefono: "",
          // No lleva teléfono; el país es el del edificio.
          codigoPais: PAIS_POR_DEFECTO,
          medioContacto: "",
          modelo: "",
        },
      })
      .then((creada) => {
        cerrar();
        addToast(
          creada?.numero
            ? `PQRS N° ${creada.numero} enviada a la administración`
            : "PQRS enviada a la administración",
          "success",
        );
      })
      .catch((fallo) => addToast(mensajeDeError(fallo, "No se pudo enviar la incidencia"), "error"));
  };

  return (
    <Modal visible={!!item} onClose={cerrar} title="Registrar comentario o incidencia">
      {item && (
        <View className="gap-4">
          <View className="rounded-2xl border-[1.5px] border-primary p-3.5 gap-1.5">
            <Text className="text-base font-bold text-gray-900">{item.depto}</Text>
            <Text className="text-sm text-gray-500">
              Reserva N°:{item.reservaNum} · {item.horario}
            </Text>
          </View>
          <Input
            value={z.incidenciaTexto}
            onChangeText={z.setIncidenciaTexto}
            placeholder="Describe el comentario o la incidencia…"
            multiline
            rows={5}
            showEditIcon={false}
          />
          <Button
            fullWidth
            disabled={!z.incidenciaTexto.trim()}
            loading={crearPqrs.isPending}
            onPress={enviar}
          >
            Enviar a PQRs
          </Button>
        </View>
      )}
    </Modal>
  );
}
