import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { Parametro } from "../services/plataforma.repo";
import { useAjustesDeLaApp, useHistorialDeAjuste } from "../hooks/usePanelDeLaApp";

const NUMERICOS = ["entero", "decimal", "dias", "horas", "minutos", "segundos", "megabytes"];

/** «Entre 1 y 30 días», con lo que la base tenga declarado. */
export function rangoDe(p: Parametro): string | null {
  const unidad = p.unidad ? ` ${p.unidad}` : "";
  if (p.minimo !== null && p.maximo !== null) return `Entre ${p.minimo} y ${p.maximo}${unidad}`;
  if (p.minimo !== null) return `Desde ${p.minimo}${unidad}`;
  if (p.maximo !== null) return `Hasta ${p.maximo}${unidad}`;
  return null;
}

/** Lo que se comprueba aquí para avisar antes; la base lo vuelve a comprobar. */
function problemaCon(p: Parametro, valor: string): string | null {
  if (NUMERICOS.includes(p.tipo)) {
    const n = Number(valor.replace(",", "."));
    if (valor.trim() === "" || Number.isNaN(n)) return "Tiene que ser un número";
    if (p.tipo !== "decimal" && !Number.isInteger(n)) return "Tiene que ser un número entero";
    if (p.minimo !== null && n < p.minimo) return `No puede ser menor que ${p.minimo}`;
    if (p.maximo !== null && n > p.maximo) return `No puede ser mayor que ${p.maximo}`;
  }
  if (p.tipo === "hora_del_dia" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor.trim())) {
    return "Escríbelo como HH:MM, por ejemplo 08:30";
  }
  if (p.tipo === "lista") {
    try {
      if (!Array.isArray(JSON.parse(valor))) return "Tiene que ser una lista entre corchetes";
    } catch {
      return "Tiene que ser una lista entre corchetes, por ejemplo [7, 3, 1]";
    }
  }
  return null;
}

interface Props {
  parametro: Parametro | null;
  onClose: () => void;
}

/**
 * Cambiar un ajuste de la app. Los de riesgo alto piden un segundo toque, y
 * cada uno enseña sus últimos cambios con quién los hizo.
 */
export function EditarAjuste({ parametro, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const { esDueno, cambiar } = useAjustesDeLaApp();
  const { cambios } = useHistorialDeAjuste(parametro?.clave ?? null);
  const [valor, setValor] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    setValor(parametro?.valor ?? "");
    setConfirmando(false);
  }, [parametro]);

  if (!parametro) return null;
  const p = parametro;
  const problema = problemaCon(p, valor);
  const rango = rangoDe(p);

  const guardar = async (nuevo: string) => {
    if (p.riesgo === "alto" && !confirmando) {
      setConfirmando(true);
      return;
    }
    try {
      await cambiar.mutateAsync({ clave: p.clave, valor: nuevo.trim() });
      addToast("Ajuste guardado", "success");
      onClose();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar el ajuste"), "error");
    }
  };

  return (
    <Modal visible onClose={onClose} title="Cambiar ajuste">
      <View className="gap-3 p-4">
        <Text className="text-sm text-gray-900">{p.descripcion}</Text>
        <Text className="text-xs text-gray-400">{p.clave}</Text>
        {rango ? <Text className="text-xs text-gray-500">{rango}</Text> : null}
        {p.riesgo === "alto" ? (
          <Text className="text-xs text-warning">Cambiarlo afecta a toda la app. Piénsalo dos veces.</Text>
        ) : null}

        {!esDueno ? (
          <Text className="text-sm text-gray-700">{`Valor: ${p.valor}${p.unidad ? ` ${p.unidad}` : ""}`}</Text>
        ) : p.tipo === "booleano" ? (
          <Toggle
            value={valor === "true"}
            onChange={(v) => setValor(v ? "true" : "false")}
            label={valor === "true" ? "Encendido" : "Apagado"}
          />
        ) : p.valoresPermitidos && p.valoresPermitidos.length > 0 ? (
          <Select
            label="Valor"
            value={valor}
            options={p.valoresPermitidos.map((v) => ({ label: v, value: v }))}
            onChange={(v) => setValor(String(v))}
          />
        ) : (
          <Input
            label={p.unidad ? `Valor (${p.unidad})` : "Valor"}
            value={valor}
            onChangeText={setValor}
            type={NUMERICOS.includes(p.tipo) ? "numeric" : "text"}
            multiline={p.tipo === "texto" && valor.length > 40}
            error={problema ?? undefined}
          />
        )}

        {esDueno ? (
          <View className="gap-2">
            <Button
              fullWidth
              variant={confirmando ? "danger" : "primary"}
              onPress={() => guardar(valor)}
              disabled={Boolean(problema) || valor.trim() === p.valor}
              loading={cambiar.isPending}
            >
              {confirmando ? "Confirmar el cambio" : "Guardar"}
            </Button>
            {p.valorPorDefecto !== null && p.valorPorDefecto !== p.valor ? (
              <Button variant="secondary" fullWidth onPress={() => setValor(p.valorPorDefecto ?? "")}>
                {`Volver al valor por defecto (${p.valorPorDefecto})`}
              </Button>
            ) : null}
          </View>
        ) : null}

        <Text className="mt-2 text-sm font-semibold text-gray-900">Últimos cambios</Text>
        {cambios.length === 0 ? (
          <Text className="text-xs text-gray-500">Sin cambios anotados.</Text>
        ) : (
          cambios.slice(0, 5).map((c) => (
            <Text key={`${c.cuando}-${c.despues}`} className="text-xs text-gray-600">
              {`${c.cuando} · ${c.antes ?? "—"} → ${c.despues ?? "—"} · ${c.quien}`}
            </Text>
          ))
        )}
      </View>
    </Modal>
  );
}
