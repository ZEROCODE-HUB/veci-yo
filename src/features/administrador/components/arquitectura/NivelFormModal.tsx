import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Input, Modal } from "@/shared/components";
import { limpiarNomenclatura } from "../../helpers/arquitectura.helpers";

/**
 * Crear o corregir un nivel de estacionamiento: cómo se llama y su
 * nomenclatura (16/11/2026, el cliente: «Niveles de estacionamiento que hay,
 * cómo se llama y su nomenclatura»).
 */
export function NivelFormModal({
  visible,
  editando,
  nomenclaturasUsadas,
  onClose,
  onSave,
}: {
  visible: boolean;
  editando: { nombre: string; nomenclatura: string } | null;
  /** Las de los otros niveles: la nomenclatura no se repite en el edificio. */
  nomenclaturasUsadas: string[];
  onClose: () => void;
  /** `false` si falló: la ventana se queda abierta con lo escrito. */
  onSave: (datos: { nombre: string; nomenclatura: string }) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState("");
  const [nomenclatura, setNomenclatura] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNombre(editando?.nombre ?? "");
    setNomenclatura(editando?.nomenclatura ?? "");
  }, [visible, editando]);

  const repetida = nomenclaturasUsadas.includes(nomenclatura);

  return (
    <Modal visible={visible} onClose={onClose} title={editando ? "Editar nivel" : "Nuevo nivel"}>
      <View className="gap-3">
        <Input label="Nombre *" value={nombre} onChangeText={setNombre} placeholder="Ej: Sótano 1" />
        <Input
          label="Nomenclatura *"
          value={nomenclatura}
          onChangeText={(v) => setNomenclatura(limpiarNomenclatura(v))}
          placeholder="Ej: S1"
          error={repetida ? "Ya hay un nivel con esa nomenclatura" : undefined}
        />
        <Button
          fullWidth
          loading={guardando}
          disabled={!nombre.trim() || !nomenclatura || repetida}
          onPress={() => {
            setGuardando(true);
            void onSave({ nombre: nombre.trim(), nomenclatura }).then((ok) => {
              setGuardando(false);
              if (ok) onClose();
            });
          }}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
