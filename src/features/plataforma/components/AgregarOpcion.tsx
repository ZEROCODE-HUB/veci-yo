import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useDatosDePaises } from "@/shared/hooks/useDatosDePaises";
import type { ListaDelPanel } from "../services/plataforma.repo";
import { useListasDeLaApp } from "../hooks/usePanelDeLaApp";
import { ConfirmarCambio } from "./ConfirmarCambio";

/**
 * Agregar una opción a una lista que lo admite. El código sale del nombre
 * («Servientrega Ltda.» → servientrega_ltda) y no cambia después. En una lista
 * por país, se elige el país entre los que operan.
 */
export function AgregarOpcion({ lista, onClose }: { lista: ListaDelPanel; onClose: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const { agregar } = useListasDeLaApp();
  const { paisesDondeOpera } = useDatosDePaises();
  const [etiqueta, setEtiqueta] = useState("");
  const [pais, setPais] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const falta = etiqueta.trim() === "" || (lista.porPais && !pais);

  const confirmar = async () => {
    try {
      await agregar.mutateAsync({ catalogo: lista.catalogo, etiqueta: etiqueta.trim(), pais });
      addToast("Opción agregada", "success");
      onClose();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo agregar la opción"), "error");
      setConfirmando(false);
    }
  };

  return (
    <Modal visible onClose={onClose} title={`Agregar a ${lista.titulo}`}>
      <View className="gap-3 p-4">
        {confirmando ? (
          <ConfirmarCambio
            cambios={[{ que: "Opción nueva", antes: "", despues: `${etiqueta.trim()}${pais ? ` (${pais})` : ""}` }]}
            riesgoAlto={lista.riesgo === "alto"}
            guardando={agregar.isPending}
            onConfirmar={() => void confirmar()}
            onVolver={() => setConfirmando(false)}
          />
        ) : (
          <>
            <Input label="Nombre" value={etiqueta} onChangeText={setEtiqueta} />
            {lista.porPais ? (
              <Select
                label="País"
                value={pais}
                options={paisesDondeOpera.map((c) => ({ value: c, label: c }))}
                onChange={(v) => setPais(String(v))}
                placeholder="Elige el país"
              />
            ) : null}
            <Text className="text-xs text-gray-500">Sale encendida y al final de la lista.</Text>
            <Button fullWidth onPress={() => setConfirmando(true)} disabled={falta}>
              Agregar
            </Button>
          </>
        )}
      </View>
    </Modal>
  );
}
