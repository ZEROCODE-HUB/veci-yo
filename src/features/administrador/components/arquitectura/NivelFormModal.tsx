import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Input, Modal, Select } from "@/shared/components";
import { limpiarNomenclatura } from "../../helpers/arquitectura.helpers";

/**
 * Crear o corregir un nivel de estacionamiento: cómo se llama y su
 * nomenclatura (16/11/2026, el cliente: «Niveles de estacionamiento que hay,
 * cómo se llama y su nomenclatura»), y de qué torre es (17/11/2026: «primero
 * se crea la torre, luego recién el sótano»).
 */
export function NivelFormModal({
  visible,
  editando,
  torres,
  nomenclaturasUsadas,
  onClose,
  onSave,
}: {
  visible: boolean;
  editando: { nombre: string; nomenclatura: string; torreId: string | null } | null;
  torres: Array<{ uuid?: string; nombre: string }>;
  /** Las de los otros niveles: la nomenclatura no se repite en el edificio. */
  nomenclaturasUsadas: string[];
  onClose: () => void;
  /** `false` si falló: la ventana se queda abierta con lo escrito. */
  onSave: (datos: { nombre: string; nomenclatura: string; torreId: string }) => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState("");
  const [nomenclatura, setNomenclatura] = useState("");
  const [torreId, setTorreId] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNombre(editando?.nombre ?? "");
    setNomenclatura(editando?.nomenclatura ?? "");
    // Con una sola torre no hay nada que elegir.
    setTorreId(editando?.torreId ?? (torres.length === 1 ? torres[0].uuid ?? "" : ""));
  }, [visible, editando, torres]);

  const repetida = nomenclaturasUsadas.includes(nomenclatura);

  return (
    <Modal visible={visible} onClose={onClose} title={editando ? "Editar nivel" : "Nuevo nivel"}>
      <View className="gap-3">
        <Select
          label="Torre *"
          value={torreId}
          placeholder="Elegir la torre…"
          textoSinOpciones="Primero crea una torre."
          options={torres.map((t) => ({ value: t.uuid ?? "", label: t.nombre }))}
          onChange={(valor) => setTorreId(String(valor))}
        />
        <Input label="Nombre *" value={nombre} onChangeText={setNombre} placeholder="Ej: Sótano 1" />
        <Input
          label="Nomenclatura *"
          value={nomenclatura}
          onChangeText={(v) => setNomenclatura(limpiarNomenclatura(v))}
          placeholder="Ej: AS1"
          error={repetida ? "Ya hay un nivel con esa nomenclatura" : undefined}
        />
        <Button
          fullWidth
          loading={guardando}
          disabled={!torreId || !nombre.trim() || !nomenclatura || repetida}
          onPress={() => {
            setGuardando(true);
            void onSave({ nombre: nombre.trim(), nomenclatura, torreId }).then((ok) => {
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
