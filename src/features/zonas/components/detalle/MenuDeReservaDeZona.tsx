import React from "react";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
import { elegirDocumento } from "@/shared/services/elegir-archivo";
import type { DetalleDeZona } from "./tipos";

/**
 * El menú de una reserva de la grilla.
 *
 * La portería edita las personas, añade una incidencia o cancela (el cliente,
 * 15/10/2026). Un vecino, con **su** reserva: manda el comprobante si espera
 * aprobación y la cancela. Aprobar y rechazar vivían aquí, en la pantalla del
 * residente, y se fueron a la de la administración (R-37, 02/10/2026).
 */
export function MenuDeReservaDeZona({ zona: z }: { zona: DetalleDeZona }) {
  const addToast = useUIStore((s) => s.addToast);
  const item = z.menuItem;
  const cerrar = () => z.setMenuItem(null);

  return (
    <BottomSheet visible={!!item} onClose={cerrar}>
      {z.esGuardia ? (
        <>
          <BottomSheetOption
            label="Editar personas en la reserva"
            onPress={() => {
              if (item) z.openPeople(item);
              cerrar();
            }}
          />
          <BottomSheetOption
            label="Añadir incidencia"
            onPress={() => {
              z.setIncidenciaItem(item);
              z.setIncidenciaTexto("");
              cerrar();
            }}
          />
          {/* No sale en una ya cancelada. */}
          {item?.estado !== "Cancelado" ? (
            <BottomSheetOption
              label="Cancelar reserva"
              variant="danger"
              onPress={() => {
                z.setDeleteItem(item);
                cerrar();
              }}
            />
          ) : null}
        </>
      ) : (
        item && (
          <>
            {/*
              El comprobante de una reserva que espera aprobación (hueco 10). El
              KT dice que va «por el chat», pero el chat no deja adjuntar y la
              administración ya tenía dónde verlo, en su pantalla de reservas.
            */}
            {item.estado === "Pendiente" && item.uuid ? (
              <BottomSheetOption
                label={item.comprobante ? "Cambiar el comprobante de pago" : "Enviar comprobante de pago"}
                onPress={() => {
                  const reservaUuid = item.uuid!;
                  cerrar();
                  void elegirDocumento()
                    .then((archivo) => {
                      if (archivo) z.enviarComprobante({ reservaUuid, archivo });
                    })
                    .catch((e: unknown) =>
                      addToast(mensajeDeError(e, "No se pudo abrir el archivo"), "error"),
                    );
                }}
              />
            ) : null}
            <BottomSheetOption
              /*
                Decia «Eliminar» y no elimina: la reserva queda `cancelada`, que
                es lo correcto --una reserva cancelada es una constancia, y la
                franja se libera igual--.
              */
              label="Cancelar reserva"
              variant="danger"
              onPress={() => {
                z.setDeleteItem(item);
                cerrar();
              }}
            />
          </>
        )
      )}
    </BottomSheet>
  );
}
