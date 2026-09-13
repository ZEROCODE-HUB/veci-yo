import { useMemo, useState } from "react";
import { Button, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import type { Porteria } from "@/stores/admin-store";
import { porteriaToForm, type PorteriaFormValues } from "../../types";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";
import { PorteriaFormModal } from "./PorteriaFormModal";

type Props = {
  items: Porteria[];
  onCreate: (form: PorteriaFormValues) => void;
  onUpdate: (item: Porteria, form: PorteriaFormValues) => void;
  onDelete: (id: number) => void;
};

export function PorteriasTab({ items, onCreate, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<Porteria | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Porteria | null>(null);
  const initial = useMemo(() => porteriaToForm(editing), [editing]);

  const open = (item?: Porteria) => {
    setEditing(item || null);
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <View className="gap-3">
      <View className="items-end">
        <Button size="sm" onPress={() => open()}>
          + Nueva porteria
        </Button>
      </View>
      <AdminSectionCard>
        {items.map((item) => (
          <AdminRow
            key={item.id}
            title={item.nombre}
            subtitle={`${item.ubicacion || ""}${item.telefono ? ` · ${item.telefono}` : ""}`}
            onPress={() => open(item)}
            onDelete={() => setDeleting(item)}
          />
        ))}
      </AdminSectionCard>
      <PorteriaFormModal
        visible={formOpen}
        editing={editing}
        initial={initial}
        onClose={close}
        onSave={(form) => {
          if (editing) onUpdate(editing, form);
          else onCreate(form);
          close();
        }}
      />
      <Modal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar porteria"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center">
            Eliminar la porteria {deleting?.nombre}?
          </Text>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              if (deleting) onDelete(deleting.id);
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
