import { BottomSheet, BottomSheetOption, Button, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import type { Guardia } from "@/shared/types";
import { formatRangoHoras } from "@/shared/utils";

type Props = {
  menuGuardia: Guardia | null;
  deleteTarget: Guardia | null;
  onCloseMenu: () => void;
  onEdit: (guardia: Guardia) => void;
  onManageShifts: (guardia: Guardia) => void;
  onRequestDelete: (guardia: Guardia) => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
};

export function SeguridadActionOverlays({
  menuGuardia,
  deleteTarget,
  onCloseMenu,
  onEdit,
  onManageShifts,
  onRequestDelete,
  onCloseDelete,
  onConfirmDelete,
}: Props) {
  return (
    <>
      <BottomSheet visible={!!menuGuardia} onClose={onCloseMenu}>
        <BottomSheetOption
          label="Editar"
          onPress={() => menuGuardia && onEdit(menuGuardia)}
        />
        <BottomSheetOption
          label="Gestionar turnos"
          onPress={() => menuGuardia && onManageShifts(menuGuardia)}
        />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => menuGuardia && onRequestDelete(menuGuardia)}
        />
      </BottomSheet>

      <Modal
        visible={!!deleteTarget}
        onClose={onCloseDelete}
        title="Eliminar guardia"
      >
        <View className="gap-4">
          <Text className="text-base text-center text-gray-700">
            ¿Seguro que deseas eliminar este guardia?
          </Text>
          {deleteTarget && (
            <View className="rounded-2xl border border-primary p-4 gap-2">
              <Text className="text-base font-bold text-gray-900">
                {deleteTarget.nombre}
              </Text>
              {deleteTarget.cedula ? (
                <Text className="text-sm text-gray-500">
                  🪪 {deleteTarget.cedula}
                </Text>
              ) : null}
              <Text className="text-sm text-gray-500">
                Horario: {" "}
                {deleteTarget.turnos
                  .map(
                    (turno) =>
                      `${turno.dia} ${formatRangoHoras(turno.horaInicio, turno.horaFin)}`,
                  )
                  .join(" · ")}
              </Text>
            </View>
          )}
          <Button fullWidth onPress={onConfirmDelete}>
            Aceptar
          </Button>
          <Button fullWidth variant="ghost" onPress={onCloseDelete}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </>
  );
}
