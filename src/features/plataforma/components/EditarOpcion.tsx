import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal, Toggle } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { CambiosDeOpcion, CampoExtra, ListaDelPanel, OpcionDelPanel } from "../services/plataforma.repo";
import { useListasDeLaApp } from "../hooks/usePanelDeLaApp";
import { ConfirmarCambio, type CambioAConfirmar } from "./ConfirmarCambio";

interface Props {
  lista: ListaDelPanel;
  opcion: OpcionDelPanel;
  esDueno: boolean;
  onClose: () => void;
}

/** Cómo se escribe un dato propio en el formulario: todo como texto. */
function aTexto(campo: CampoExtra, valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (campo.tipo === "lista") return Array.isArray(valor) ? valor.join(", ") : "";
  return String(valor);
}

/** Y de vuelta, con su tipo. `undefined` = no se entiende. */
function deTexto(campo: CampoExtra, texto: string): unknown {
  const t = texto.trim();
  if (campo.tipo === "booleano") return t === "true";
  if (campo.tipo === "numero") return t === "" ? null : Number.isFinite(Number(t)) ? Number(t) : undefined;
  if (campo.tipo === "lista") return t === "" ? [] : t.split(",").map((x) => x.trim()).filter(Boolean);
  if (campo.tipo === "hora") return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : undefined;
  return t === "" ? null : t;
}

/**
 * Cambiar una opción de una lista: su nombre, si se ofrece, su orden y los
 * datos propios que la lista declare (las siglas de la TRA, el horario de un
 * check-in…). El código no se cambia nunca: es lo que guardan los datos.
 * Todo cambio se confirma enseñando de qué a qué.
 */
export function EditarOpcion({ lista, opcion, esDueno, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const { guardar } = useListasDeLaApp();
  const [etiqueta, setEtiqueta] = useState(opcion.etiqueta);
  const [activo, setActivo] = useState(opcion.activo);
  const [orden, setOrden] = useState(String(opcion.orden));
  const [extra, setExtra] = useState<Record<string, string>>(() =>
    Object.fromEntries(lista.camposExtra.map((c) => [c.clave, aTexto(c, opcion.extra[c.clave])])),
  );
  const [confirmando, setConfirmando] = useState(false);

  const cambios: CambiosDeOpcion = {};
  const resumen: CambioAConfirmar[] = [];
  if (etiqueta.trim() !== opcion.etiqueta) {
    cambios.etiqueta = etiqueta.trim();
    resumen.push({ que: "Nombre", antes: opcion.etiqueta, despues: etiqueta.trim() });
  }
  if (activo !== opcion.activo) {
    cambios.activo = activo;
    resumen.push({ que: "Se ofrece", antes: opcion.activo ? "Sí" : "No", despues: activo ? "Sí" : "No" });
  }
  if (orden.trim() !== String(opcion.orden) && /^\d+$/.test(orden.trim())) {
    cambios.orden = Number(orden.trim());
    resumen.push({ que: "Orden", antes: String(opcion.orden), despues: orden.trim() });
  }
  let extraMalo: string | null = null;
  const nuevoExtra: Record<string, unknown> = {};
  for (const c of lista.camposExtra) {
    const texto = extra[c.clave] ?? "";
    if (texto === aTexto(c, opcion.extra[c.clave])) continue;
    const valor = deTexto(c, texto);
    if (valor === undefined) {
      extraMalo = `Revisa «${c.etiqueta}»`;
      continue;
    }
    nuevoExtra[c.clave] = valor;
    resumen.push({ que: c.etiqueta, antes: aTexto(c, opcion.extra[c.clave]), despues: texto.trim() });
  }
  if (Object.keys(nuevoExtra).length > 0) cambios.extra = nuevoExtra;

  const confirmar = async () => {
    try {
      await guardar.mutateAsync({ id: opcion.id, cambios });
      addToast("Opción guardada", "success");
      onClose();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar la opción"), "error");
      setConfirmando(false);
    }
  };

  return (
    <Modal visible onClose={onClose} title={lista.titulo}>
      <View className="gap-3 p-4">
        <Text className="text-xs text-gray-400">{`Código: ${opcion.codigo}${opcion.pais ? ` · ${opcion.pais}` : ""}`}</Text>
        {confirmando ? (
          <ConfirmarCambio
            cambios={resumen}
            riesgoAlto={lista.riesgo === "alto"}
            guardando={guardar.isPending}
            onConfirmar={() => void confirmar()}
            onVolver={() => setConfirmando(false)}
          />
        ) : (
          <>
            <Input label="Nombre" value={etiqueta} onChangeText={setEtiqueta} editable={esDueno} />
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm text-gray-700">Se ofrece</Text>
              <Toggle value={activo} onChange={setActivo} disabled={!esDueno} accessibilityLabel="Se ofrece" />
            </View>
            <Input label="Orden (más bajo, más arriba)" value={orden} onChangeText={setOrden} soloCifras editable={esDueno} />
            {lista.camposExtra.map((c) =>
              c.tipo === "booleano" ? (
                <View key={c.clave} className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 text-sm text-gray-700">{c.etiqueta}</Text>
                  <Toggle
                    value={extra[c.clave] === "true"}
                    onChange={(v) => setExtra({ ...extra, [c.clave]: v ? "true" : "false" })}
                    disabled={!esDueno}
                    accessibilityLabel={c.etiqueta}
                  />
                </View>
              ) : (
                <Input
                  key={c.clave}
                  label={c.tipo === "lista" ? `${c.etiqueta} (separadas por comas)` : c.etiqueta}
                  value={extra[c.clave] ?? ""}
                  onChangeText={(v) => setExtra({ ...extra, [c.clave]: v })}
                  editable={esDueno}
                />
              ),
            )}
            {lista.riesgo === "alto" ? (
              <Text className="text-xs text-warning">
                Esta lista tiene que ver con lo legal o con lo que se manda al gobierno.
              </Text>
            ) : null}
            {extraMalo ? <Text className="text-xs text-danger">{extraMalo}</Text> : null}
            {esDueno ? (
              <Button
                fullWidth
                onPress={() => setConfirmando(true)}
                disabled={resumen.length === 0 || Boolean(extraMalo) || etiqueta.trim() === ""}
              >
                Guardar
              </Button>
            ) : null}
          </>
        )}
      </View>
    </Modal>
  );
}
