import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Input, Modal } from "@/shared/components";
import type { PreguntaFrecuente } from "../../services";

export type FormularioPregunta = {
  categoria: string;
  pregunta: string;
  respuesta: string;
};

/**
 * Escribir o corregir una pregunta frecuente (16/10/2026). Solo la abre la
 * administración, desde Soporte › Preguntas frecuentes.
 */
export function PreguntaFrecuenteFormModal({
  visible,
  editando,
  guardando,
  borrando,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  editando: PreguntaFrecuente | null;
  guardando: boolean;
  borrando: boolean;
  onClose: () => void;
  onSave: (form: FormularioPregunta) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<FormularioPregunta>({
    categoria: "",
    pregunta: "",
    respuesta: "",
  });
  const [errores, setErrores] = useState<{ pregunta?: string; respuesta?: string }>({});

  useEffect(() => {
    if (!visible) return;
    setForm({
      categoria: editando?.categoria ?? "",
      pregunta: editando?.pregunta ?? "",
      respuesta: editando?.respuesta ?? "",
    });
    setErrores({});
  }, [visible, editando]);

  const cambiar = (clave: keyof FormularioPregunta) => (texto: string) =>
    setForm((f) => ({ ...f, [clave]: texto }));

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editando ? "Editar pregunta" : "Nueva pregunta"}
    >
      <View className="gap-3">
        <Input
          label="Categoría (opcional)"
          explicacion="Agrupa las preguntas en la lista. Si la dejas vacía, va a «General»."
          value={form.categoria}
          onChangeText={cambiar("categoria")}
          placeholder="Ej: Visitas, Zonas comunes, Pagos"
          showEditIcon={false}
        />
        <Input
          label="Pregunta *"
          value={form.pregunta}
          onChangeText={cambiar("pregunta")}
          showEditIcon={false}
          error={errores.pregunta}
        />
        <Input
          label="Respuesta *"
          value={form.respuesta}
          onChangeText={cambiar("respuesta")}
          multiline
          showEditIcon={false}
          error={errores.respuesta}
        />
        <Button
          fullWidth
          loading={guardando}
          onPress={() => {
            const faltan = {
              pregunta: form.pregunta.trim() ? undefined : "Escribe la pregunta.",
              respuesta: form.respuesta.trim() ? undefined : "Escribe la respuesta.",
            };
            setErrores(faltan);
            if (faltan.pregunta || faltan.respuesta) return;
            onSave(form);
          }}
        >
          Guardar
        </Button>
        {editando ? (
          <Button variant="danger" fullWidth loading={borrando} onPress={onDelete}>
            Eliminar pregunta
          </Button>
        ) : null}
      </View>
    </Modal>
  );
}
