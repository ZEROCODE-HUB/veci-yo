import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Card, Cargando, Input, Modal, Toggle } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { MonedaDelPanel } from "../services/plataforma.repo";
import { useMonedasDeLaApp } from "../hooks/usePanelDeLaApp";
import { ConfirmarCambio, type CambioAConfirmar } from "../components/ConfirmarCambio";

/**
 * Las monedas (28/10/2026): cuáles se ofrecen al configurar un edificio, sus
 * cuotas y sus zonas. El cliente: «en moneda solo COP, soles y dólares».
 *
 * Una moneda no se borra: se apaga, y puede volver a encenderse. La base no
 * deja apagar una que esté en uso (un edificio, una zona, un precio vigente o
 * un país donde se dan de alta edificios) y dice por qué.
 */
export function PlataformaMonedasScreen() {
  const { monedas, cargando, error, esDueno } = useMonedasDeLaApp();
  const [editando, setEditando] = useState<MonedaDelPanel | null>(null);
  const [agregando, setAgregando] = useState(false);

  if (cargando) return <Cargando texto="las monedas" />;

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar las monedas")}</Text>
        </Card>
      ) : null}

      <Card className="p-0">
        {monedas.map((m, i) => (
          <Pressable
            key={m.codigo}
            onPress={() => setEditando(m)}
            accessibilityRole="button"
            accessibilityLabel={`${m.codigo} ${m.nombre}`}
            className={`p-4 active:opacity-70 ${i > 0 ? "border-t border-gray-100" : ""}`}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold text-gray-900">{`${m.codigo} · ${m.nombre}`}</Text>
              <Text className={`text-xs ${m.activa ? "text-success" : "text-gray-400"}`}>
                {m.activa ? "Se ofrece" : "Apagada"}
              </Text>
            </View>
            <Text className="mt-0.5 text-xs text-gray-500">
              {`${m.decimales === 0 ? "Sin decimales" : `${m.decimales} decimales`}${m.enUso ? ` · ${m.enUso}` : ""}`}
            </Text>
          </Pressable>
        ))}
      </Card>

      {esDueno ? (
        <Button variant="secondary" fullWidth onPress={() => setAgregando(true)}>
          Agregar una moneda
        </Button>
      ) : null}

      {editando ? (
        <EditarMoneda key={editando.codigo} moneda={editando} esDueno={esDueno} onClose={() => setEditando(null)} />
      ) : null}
      <AgregarMoneda visible={agregando} onClose={() => setAgregando(false)} />
    </DesplazableConTeclado>
  );
}

function EditarMoneda({
  moneda,
  esDueno,
  onClose,
}: {
  moneda: MonedaDelPanel;
  esDueno: boolean;
  onClose: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const { guardar } = useMonedasDeLaApp();
  // Se monta de nuevo por moneda (`key`), así que arranca con sus datos.
  const [nombre, setNombre] = useState(moneda.nombre);
  const [activa, setActiva] = useState(moneda.activa);
  const [confirmando, setConfirmando] = useState(false);

  const cambios: CambioAConfirmar[] = [];
  if (nombre.trim() !== moneda.nombre) cambios.push({ que: "Nombre", antes: moneda.nombre, despues: nombre.trim() });
  if (activa !== moneda.activa) {
    cambios.push({ que: "Se ofrece", antes: moneda.activa ? "Sí" : "No", despues: activa ? "Sí" : "No" });
  }

  const cerrar = onClose;

  const confirmar = async () => {
    try {
      await guardar.mutateAsync({
        codigo: moneda.codigo,
        cambios: {
          ...(nombre.trim() !== moneda.nombre ? { nombre: nombre.trim() } : {}),
          ...(activa !== moneda.activa ? { activa } : {}),
        },
      });
      addToast("Moneda guardada", "success");
      cerrar();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar la moneda"), "error");
      setConfirmando(false);
    }
  };

  return (
    <Modal visible onClose={cerrar} title={moneda.codigo}>
      <View className="gap-3 p-4">
        {confirmando ? (
          <ConfirmarCambio
            cambios={cambios}
            guardando={guardar.isPending}
            onConfirmar={() => void confirmar()}
            onVolver={() => setConfirmando(false)}
          />
        ) : (
          <>
            <Input label="Nombre" value={nombre} onChangeText={setNombre} editable={esDueno} />
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm text-gray-700">Se ofrece al configurar un edificio</Text>
              <Toggle
                value={activa}
                onChange={setActiva}
                disabled={!esDueno || (moneda.activa && Boolean(moneda.enUso))}
                accessibilityLabel="Se ofrece"
              />
            </View>
            {moneda.activa && moneda.enUso ? (
              <Text className="text-xs text-gray-500">{`No se puede apagar: ${moneda.enUso}.`}</Text>
            ) : null}
            {esDueno ? (
              <Button
                fullWidth
                onPress={() => setConfirmando(true)}
                disabled={cambios.length === 0 || nombre.trim() === ""}
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

function AgregarMoneda({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const { agregar } = useMonedasDeLaApp();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [decimales, setDecimales] = useState("2");
  const [confirmando, setConfirmando] = useState(false);

  if (!visible) return null;
  const codigoLimpio = codigo.trim().toUpperCase();
  const problema = !/^[A-Z]{3}$/.test(codigoLimpio)
    ? "El código son tres letras, por ejemplo BOB"
    : nombre.trim() === ""
      ? "Escribe el nombre"
      : !/^[0-4]$/.test(decimales.trim())
        ? "Los decimales van de 0 a 4"
        : null;

  const cerrar = () => {
    setCodigo("");
    setNombre("");
    setDecimales("2");
    setConfirmando(false);
    onClose();
  };

  const confirmar = async () => {
    try {
      await agregar.mutateAsync({ codigo: codigoLimpio, nombre: nombre.trim(), decimales: Number(decimales) });
      addToast(`${codigoLimpio} agregada`, "success");
      cerrar();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo agregar la moneda"), "error");
      setConfirmando(false);
    }
  };

  return (
    <Modal visible onClose={cerrar} title="Agregar una moneda">
      <View className="gap-3 p-4">
        {confirmando ? (
          <ConfirmarCambio
            cambios={[{ que: "Moneda nueva", antes: "", despues: `${codigoLimpio} · ${nombre.trim()} · ${decimales} decimales` }]}
            guardando={agregar.isPending}
            onConfirmar={() => void confirmar()}
            onVolver={() => setConfirmando(false)}
          />
        ) : (
          <>
            <Input label="Código ISO (tres letras)" value={codigo} onChangeText={setCodigo} placeholder="BOB" />
            <Input label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Boliviano" />
            <Input label="Decimales" value={decimales} onChangeText={setDecimales} soloCifras />
            {problema && codigo.trim() !== "" ? <Text className="text-xs text-danger">{problema}</Text> : null}
            <Button fullWidth onPress={() => setConfirmando(true)} disabled={Boolean(problema)}>
              Agregar
            </Button>
          </>
        )}
      </View>
    </Modal>
  );
}
