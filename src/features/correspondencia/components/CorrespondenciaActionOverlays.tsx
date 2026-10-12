import { theme } from "@/config";
import {
  Button,
  BottomSheet,
  BottomSheetOption,
  Input,
  Modal,
} from "@/shared/components";
import { Text, View } from "react-native";
import type { CorrespondenciaItem } from "@/shared/types";
import { CorrespondenciaDetalleModal } from "./CorrespondenciaDetalleModal";
import { CorrespondenciaEstadoBadge } from "./CorrespondenciaEstadoBadge";
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
  showDeleteSuccess: boolean;
  onCloseDeleteSuccess: () => void;
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
    showDeleteSuccess,
    onCloseDeleteSuccess,
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
          ? opcionesDeCorrespondencia(menuItem.estado).map((opcion) => (
              <BottomSheetOption
                key={opcion.accion}
                label={opcion.etiqueta}
                variant={opcion.peligrosa ? "danger" : undefined}
                onPress={() => onAccion(opcion.accion)}
              />
            ))
          : null}
      </BottomSheet>
      <Modal
        visible={!!deleteItem}
        onClose={onCloseDelete}
        title="Eliminar Correspondencia"
      >
        <View className="gap-4">
          <Text className="text-lg text-gray-900 text-center">
            ¿Seguro que desea eliminar?
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
          <Button variant="primary" fullWidth onPress={onConfirmDelete}>
            Eliminar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!entregaItem}
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
        <View className="gap-4">
          {/*
            Pedía también la hora, en un campo de texto libre, y no se guardaba:
            la hora de entrega la pone la base en el momento de confirmar.
          */}
          <Text className="text-sm text-gray-500 text-center">
            Indique quién recibió la encomienda. La hora queda registrada al
            confirmar.
          </Text>
          <Input
            label="Nombre de quien recibe"
            value={entregaNombre}
            onChangeText={onNombreChange}
            placeholder="Nombre y apellido"
          />
          <Button
            variant="primary"
            fullWidth
            disabled={entregaNombre.trim() === ""}
            onPress={onConfirmEntrega}
          >
            Confirmar Entrega
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!detailItem}
        onClose={onCloseDetail}
        title="Detalle de Correspondencia"
      >
        {detailItem && <CorrespondenciaDetalleModal item={detailItem} />}
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
