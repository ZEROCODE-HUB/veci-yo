import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Modal } from "@/shared/components";
import { Pressable, Text, View } from "react-native";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, towerToForm, type TowerFormValues } from "../../types";
import { TorreFormModal } from "./TorreFormModal";

type Props = {
  towers: Torre[];
  onSelect: (tower: Torre) => void;
  onCreate: (form: TowerFormValues) => void;
  onUpdate: (tower: Torre) => void;
  onDelete: (tower: Torre) => void;
};

export function TorresTab({
  towers,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Torre | null>(null);
  const [menu, setMenu] = useState<Torre | null>(null);
  const [deleting, setDeleting] = useState<Torre | null>(null);
  const initial = useMemo(() => towerToForm(editing), [editing]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const save = (form: TowerFormValues) => {
    if (editing) onUpdate({ ...editing, ...form });
    else onCreate(form);
    closeForm();
  };

  const nextNumber = towers.length
    ? Math.max(...towers.map((tower) => tower.numero)) + 1
    : 1;

  return (
    <View className="gap-3">
      <View className="items-end">
        <Button
          size="sm"
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Nueva torre
        </Button>
      </View>
      {towers.map((tower) => (
        <Pressable
          key={tower.id}
          onPress={() => onSelect(tower)}
          className="rounded-2xl bg-white border border-green-500 p-4"
          style={{ elevation: 2 }}
        >
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <TowerValue
                label="Nombre"
                value={tower.nombre || `Torre N${tower.numero}`}
                strong
              />
              <TowerValue label="Depto" value={tower.depto} />
              <TowerValue label="Penthouse" value={tower.penthouse} />
              <TowerValue label="Pisos" value={tower.pisos} />
              <TowerValue label="Sotanos" value={tower.sotanos} />
            </View>
            <View className="flex-1 gap-1">
              <TowerValue label="Cocheras V." value={tower.cocherasVisitas} />
              <TowerValue label="Coch. priv." value={tower.cocherasPrivadas} />
              <TowerValue label="Almacen" value={tower.almacenPrivados} />
              <TowerValue label="Ent. veh." value={tower.entradasVehiculares} />
              <TowerValue label="Ent. peat." value={tower.entradasPeatonales} />
            </View>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setMenu(tower);
              }}
              className="p-2"
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </Pressable>
      ))}
      <Modal
        visible={!!menu}
        onClose={() => setMenu(null)}
        title="Opciones de torre"
      >
        <View className="gap-3">
          <Button
            fullWidth
            onPress={() => {
              setEditing(menu);
              setMenu(null);
              setFormOpen(true);
            }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              setDeleting(menu);
              setMenu(null);
            }}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
      <TorreFormModal
        visible={formOpen}
        editing={editing}
        nextNumber={nextNumber}
        initial={initial}
        onClose={closeForm}
        onSave={save}
      />
      <Modal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar torre"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center">
            Seguro que deseas eliminar esta torre?
          </Text>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              if (deleting) onDelete(deleting);
              setDeleting(null);
            }}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
    </View>
  );
}

function TowerValue({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  return (
    <Text className="text-sm text-gray-500">
      {label}:{" "}
      <Text
        className={strong ? "font-semibold text-gray-900" : "text-gray-900"}
      >
        {value || "-"}
      </Text>
    </Text>
  );
}
