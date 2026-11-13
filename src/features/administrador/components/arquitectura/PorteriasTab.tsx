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
  /** `false` si falló: la ventana se queda abierta con lo escrito (13/11/2026). */
  onCreate: (form: PorteriaFormValues) => Promise<boolean>;
  onUpdate: (item: Porteria, form: PorteriaFormValues) => Promise<boolean>;
  onDelete: (uuid: string) => Promise<boolean>;
};

export function PorteriasTab({ items, onCreate, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<Porteria | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Porteria | null>(null);
  const [borrando, setBorrando] = useState(false);
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
          + Nueva portería
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
        onSave={async (form) => {
          const ok = editing ? await onUpdate(editing, form) : await onCreate(form);
          if (ok) close();
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
            loading={borrando}
            onPress={() => {
              if (!deleting) return;
              setBorrando(true);
              void onDelete(deleting.uuid ?? "").then((ok) => {
                setBorrando(false);
                if (ok) setDeleting(null);
              });
            }}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
