import { theme } from "@/config";
import {
  Button,
  BottomSheet,
  BottomSheetOption,
  Modal,
} from "@/shared/components";
import { Text, View } from "react-native";
import type { CorrespondenciaItem } from "@/shared/types";
import { CorrespondenciaDetalleModal } from "./CorrespondenciaDetalleModal";
import { CorrespondenciaEstadoBadge } from "./CorrespondenciaEstadoBadge";
import { FormularioDeEntrega } from "./FormularioDeEntrega";
import {
  opcionesDeCorrespondencia,
  type AccionDeCorrespondencia,
} from "../helpers/lista";

interface CorrespondenciaActionOverlaysProps {
  menuItem: CorrespondenciaItem | null;
  onCloseMenu: () => void;
  onAccion: (accion: AccionDeCorrespondencia) => void;
  deleteItem: CorrespondenciaItem | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  entregaItem: CorrespondenciaItem | null;
  onCloseEntrega: () => void;
  entregaNombre: string;
  onNombreChange: (value: string) => void;
  onConfirmEntrega: () => void;
  detailItem: CorrespondenciaItem | null;
  onCloseDetail: () => void;
  /** Si quien mira puede cambiar el estado: entonces el detalle trae las acciones. */
  puedeModificarEstado: boolean;
  /** Una acción pulsada desde el detalle, sobre ese envío. */
  onAccionDesdeDetalle: (accion: AccionDeCorrespondencia, item: CorrespondenciaItem) => void;
  showDeleteSuccess: boolean;
  onCloseDeleteSuccess: () => void;
  /** Mientras se borra o se entrega, el botón espera y no se pulsa dos veces. */
  eliminando?: boolean;
  entregando?: boolean;
  /** La acción del menú o del detalle que se está guardando. */
  accionEnCurso?: AccionDeCorrespondencia | null;
}

export function CorrespondenciaActionOverlays(
  props: CorrespondenciaActionOverlaysProps,
) {
  const {
    menuItem,
    onCloseMenu,
    onAccion,
    deleteItem,
    onCloseDelete,
    onConfirmDelete,
    entregaItem,
    onCloseEntrega,
    entregaNombre,
    onNombreChange,
    onConfirmEntrega,
    detailItem,
    onCloseDetail,
    puedeModificarEstado,
    onAccionDesdeDetalle,
    showDeleteSuccess,
    onCloseDeleteSuccess,
    eliminando = false,
    entregando = false,
    accionEnCurso = null,
  } = props;
  return (
    <>
      {/*
        Lo que se ofrece depende de dónde está el envío. Salían siempre
        «Estado: Portería» y «Estado: Entregado», también el estado que ya
        tenía, y no decían qué iban a hacer.
      */}
      <BottomSheet visible={!!menuItem} onClose={onCloseMenu}>
        {menuItem
          ? opcionesDeCorrespondencia(menuItem.estado, Boolean(menuItem.fechaNotificado)).map((opcion) => (
              <BottomSheetOption
                key={opcion.accion}
                label={
                  accionEnCurso === opcion.accion ? "Guardando…" : opcion.etiqueta
                }
                variant={opcion.peligrosa ? "danger" : undefined}
                disabled={accionEnCurso !== null}
                onPress={() => onAccion(opcion.accion)}
              />
            ))
          : null}
      </BottomSheet>
      {/*
        Con el detalle abierto, la confirmación va dentro de él: cerrar una
        ventana y abrir otra encima tardaba en Android (17/11/2026).
      */}
      <Modal
        visible={!!deleteItem && !detailItem}
        onClose={onCloseDelete}
        title="Eliminar Correspondencia"
      >
        <View className="gap-4">
          <Text className="text-lg text-gray-900 text-center">
            ¿Seguro que quieres eliminarlo?
          </Text>
          {deleteItem && (
            <View
              className="rounded-xl p-3.5 gap-1"
              style={{ borderWidth: 1.5, borderColor: theme.colors.primary }}
            >
              <Text className="text-base font-semibold">
                {deleteItem.empresa}: {deleteItem.unidad}
              </Text>
              {deleteItem.nombre ? (
                <Text className="text-base font-bold">{deleteItem.nombre}</Text>
              ) : null}
              {deleteItem.ci ? (
                <Text className="text-sm text-gray-500">
                  CI: {deleteItem.ci}
                </Text>
              ) : null}
              <View className="flex-row justify-between mt-1.5">
                <CorrespondenciaEstadoBadge estado={deleteItem.estado} />
                <Text className="text-sm text-gray-500">
                  {deleteItem.fecha}
                </Text>
              </View>
            </View>
          )}
          <Button
            variant="primary"
            fullWidth
            loading={eliminando}
            onPress={onConfirmDelete}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!entregaItem && !detailItem}
        onClose={onCloseEntrega}
        /*
          Ya no es solo la entrega a puerta: tambien cuando el vecino baja a
          recogerlo al mostrador, que es donde nace el «yo nunca recibi ese
          paquete» (R-14).
        */
        title={
          entregaItem?.entregaEnPuerta
            ? "Entrega en Puerta"
            : "Entrega en Portería"
        }
      >
        <FormularioDeEntrega
          nombre={entregaNombre}
          onNombreChange={onNombreChange}
          onConfirmar={onConfirmEntrega}
          entregando={entregando}
        />
      </Modal>
      <Modal
        visible={!!detailItem}
        onClose={onCloseDetail}
        title="Detalle de Correspondencia"
      >
        {detailItem && <CorrespondenciaDetalleModal item={detailItem} />}
        {/*
          Las mismas acciones de los tres puntos, al final del detalle (Para
          Claude 167, 29/10/2026). Desde el 17/11/2026 el detalle no se cierra
          al usarlas: se queda con el progreso al día, y lo ya hecho deja de
          ofrecerse. Entregar y eliminar se confirman aquí mismo.
        */}
        {detailItem && puedeModificarEstado && entregaItem ? (
          <View className="gap-3 mt-4">
            <Text className="text-base font-bold text-gray-900">
              {entregaItem.entregaEnPuerta ? "Entrega en puerta" : "Entrega en portería"}
            </Text>
            <FormularioDeEntrega
              nombre={entregaNombre}
              onNombreChange={onNombreChange}
              onConfirmar={onConfirmEntrega}
              entregando={entregando}
              onCancelar={onCloseEntrega}
            />
          </View>
        ) : null}
        {detailItem && puedeModificarEstado && !entregaItem && deleteItem ? (
          <View className="gap-2 mt-4">
            <Text className="text-base text-gray-900 text-center">
              ¿Seguro que quieres eliminar este registro?
            </Text>
            <Button variant="danger" fullWidth loading={eliminando} onPress={onConfirmDelete}>
              Sí, eliminar
            </Button>
            <Button variant="secondary" fullWidth disabled={eliminando} onPress={onCloseDelete}>
              Cancelar
            </Button>
          </View>
        ) : null}
        {detailItem && puedeModificarEstado && !entregaItem && !deleteItem ? (
          <View className="gap-2 mt-4">
            {opcionesDeCorrespondencia(
              detailItem.estado,
              Boolean(detailItem.fechaNotificado),
            ).map((opcion) => (
              <Button
                key={opcion.accion}
                variant={opcion.peligrosa ? "danger" : "secondary"}
                fullWidth
                loading={accionEnCurso === opcion.accion}
                disabled={accionEnCurso !== null}
                onPress={() => onAccionDesdeDetalle(opcion.accion, detailItem)}
              >
                {opcion.etiqueta}
              </Button>
            ))}
          </View>
        ) : null}
      </Modal>
      <Modal visible={showDeleteSuccess} onClose={onCloseDeleteSuccess}>
        <View className="items-center gap-3 py-2">
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text className="text-base font-semibold text-gray-900">
            Correspondencia eliminada con éxito
          </Text>
        </View>
      </Modal>
    </>
  );
}
