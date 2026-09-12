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

interface CorrespondenciaActionOverlaysProps {
  menuItem: CorrespondenciaItem | null;
  onCloseMenu: () => void;
  puedeModificarEstado: boolean;
  puedeCrear: boolean;
  onEstado: (estado: CorrespondenciaItem["estado"]) => void;
  onEliminarSeleccion: () => void;
  onInformar: (item: CorrespondenciaItem) => void;
  deleteItem: CorrespondenciaItem | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  entregaPuertaItem: CorrespondenciaItem | null;
  onCloseEntrega: () => void;
  entregaPuertaNombre: string;
  onNombreChange: (value: string) => void;
  entregaPuertaHora: string;
  onHoraChange: (value: string) => void;
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
    puedeModificarEstado,
    puedeCrear,
    onEstado,
    onEliminarSeleccion,
    onInformar,
    deleteItem,
    onCloseDelete,
    onConfirmDelete,
    entregaPuertaItem,
    onCloseEntrega,
    entregaPuertaNombre,
    onNombreChange,
    entregaPuertaHora,
    onHoraChange,
    onConfirmEntrega,
    detailItem,
    onCloseDetail,
    showDeleteSuccess,
    onCloseDeleteSuccess,
  } = props;
  return (
    <>
      <BottomSheet visible={!!menuItem} onClose={onCloseMenu}>
        {puedeModificarEstado && (
          <>
            <BottomSheetOption
              label="Estado: Portería"
              onPress={() => onEstado("En Portería")}
            />
            <BottomSheetOption
              label="Estado: Entregado"
              onPress={() => onEstado("Entregado")}
            />
          </>
        )}
        {puedeModificarEstado && (
          <BottomSheetOption
            label="Eliminar"
            variant="danger"
            onPress={onEliminarSeleccion}
          />
        )}
        {puedeCrear && menuItem && (
          <BottomSheetOption
            label="Informar"
            onPress={() => onInformar(menuItem)}
          />
        )}
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
              style={{ borderWidth: 1.5, borderColor: "#F5B800" }}
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
        visible={!!entregaPuertaItem}
        onClose={onCloseEntrega}
        title="Entrega en Puerta"
      >
        <View className="gap-4">
          <Text className="text-sm text-gray-500 text-center">
            Indique quién recibió la encomienda y a qué hora se entregó.
          </Text>
          <Input
            value={entregaPuertaNombre}
            onChangeText={onNombreChange}
            placeholder="Nombre de quien recibe"
          />
          <View>
            <Text className="text-sm text-gray-500 mb-1.5 font-medium">
              Hora de entrega
            </Text>
            <Input
              value={entregaPuertaHora}
              onChangeText={onHoraChange}
              placeholder="HH:MM"
            />
          </View>
          <Button variant="primary" fullWidth onPress={onConfirmEntrega}>
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
