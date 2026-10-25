import React, { useState } from "react";
import { Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Card, Cargando, Input } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { formatAmount } from "@/shared/utils";
import { mensajeDeError } from "@/shared/utils/error.util";
import type { PrecioVigente } from "../services/plataforma.repo";
import { usePreciosDeLaApp } from "../hooks/usePanelDeLaApp";

/**
 * Los precios de los planes (23/10/2026).
 *
 * Un precio nuevo vale **desde hoy**: el anterior se cierra, no se borra, y
 * lo ya cobrado guarda su importe. Si el vigente empezó hoy, se corrige.
 */
export function PlataformaPreciosScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const { precios, cargando, error, esDueno, cambiar } = usePreciosDeLaApp();
  const [editando, setEditando] = useState<string | null>(null);
  const [monto, setMonto] = useState("");

  if (cargando) return <Cargando texto="los precios" />;

  const llave = (p: PrecioVigente) => `${p.plan}:${p.pais ?? ""}`;

  const guardar = async (p: PrecioVigente) => {
    const n = Number(monto.replace(",", "."));
    if (monto.trim() === "" || Number.isNaN(n) || n < 0) {
      addToast("Escribe un precio válido", "error");
      return;
    }
    try {
      await cambiar.mutateAsync({ plan: p.plan, pais: p.pais, monto: n, moneda: p.moneda });
      addToast("Precio actualizado desde hoy", "success");
      setEditando(null);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo cambiar el precio"), "error");
    }
  };

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar los precios")}</Text>
        </Card>
      ) : null}

      {precios.map((p) => (
        <Card key={llave(p)} className="gap-2 p-4">
          <Text className="text-base font-semibold text-gray-900">{p.planNombre}</Text>
          <Text className="text-xs text-gray-500">
            {`${p.pais ? `País ${p.pais}` : "Todos los países"} · ${p.periodicidad} · desde ${p.vigenteDesde}`}
          </Text>
          <Text className="text-lg font-bold text-primary">{`${formatAmount(p.monto)} ${p.moneda}`}</Text>

          {esDueno && editando === llave(p) ? (
            <View className="gap-2">
              <Input label={`Precio nuevo (${p.moneda})`} value={monto} onChangeText={setMonto} type="numeric" />
              <Button onPress={() => guardar(p)} loading={cambiar.isPending} fullWidth>
                Guardar desde hoy
              </Button>
              <Button variant="secondary" onPress={() => setEditando(null)} fullWidth>
                Cancelar
              </Button>
            </View>
          ) : esDueno ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                setEditando(llave(p));
                setMonto(String(p.monto));
              }}
              style={{ alignSelf: "flex-start" }}
            >
              Cambiar precio
            </Button>
          ) : null}
        </Card>
      ))}
    </DesplazableConTeclado>
  );
}
