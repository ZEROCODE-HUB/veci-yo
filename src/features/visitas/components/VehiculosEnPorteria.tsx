import React, { useContext, useState } from "react";
import { Text, View } from "react-native";
import { QueryClientContext } from "@tanstack/react-query";
import { Button, Input, Modal, Select } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import { useLista } from "@/shared/hooks/useLista";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { errorDePlaca } from "../helpers/validarVisita";
import { agregarVehiculoEnPorteria, cambiarPlaca } from "../services/porteria.repo";

/**
 * Los vehículos de una visita, para la portería (14/10/2026).
 *
 * La responsable de producto: la portería edita las placas y apunta el
 * vehículo con el que llega alguien. Hasta hoy la placa solo se escribía al
 * crear la visita. Las reglas del edificio (si un huésped puede traer carro)
 * las aplica la base al guardar.
 */
export function VehiculosEnPorteria({ visita }: { visita: VisitaItem }) {
  const { addToast } = useUIStore();
  // Del contexto y no con `useQueryClient`: sin proveedor (las pruebas de las
  // fichas de portería) no revienta, solo no refresca.
  const cliente = useContext(QueryClientContext);
  const [editando, setEditando] = useState<{ uuid: string; placa: string } | null>(null);
  const [nuevo, setNuevo] = useState<{ placa: string; tipo: string } | null>(null);
  // La misma regla de placa que el resto de la app, con el largo de la base;
  // aquí no se miraba nada (Parametrización, 25/10/2026).
  const parametros = useParametrosDeLaBase();
  const errorPlaca = (placa: string | undefined) =>
    parametros.listo && placa
      ? errorDePlaca(placa, {
          minimo: parametros.numero("placa_largo_minimo"),
          maximo: parametros.numero("placa_largo_maximo"),
        })
      : "";
  const [guardando, setGuardando] = useState(false);
  // Los de la lista `tipos_de_vehiculo`, con los mismos nombres que el resto
  // de la app: aquí decía «Carro» y en las demás pantallas «Automóvil»
  // (Parametrización, 25/10/2026). Desde el 28/10/2026 los nombra y ordena el
  // administrador.
  const tiposDeVehiculo = useLista("tipos_de_vehiculo").opciones;
  const tipos = tiposDeVehiculo.map((o) => ({ label: o.etiqueta, value: o.codigo }));

  const guardar = async (accion: () => Promise<void>, exito: string, cerrar: () => void) => {
    setGuardando(true);
    try {
      await accion();
      await cliente?.invalidateQueries({ queryKey: ["visitas"] });
      addToast(exito, "success");
      cerrar();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar el vehículo"), "error");
    } finally {
      setGuardando(false);
    }
  };

  if (["Finalizado", "Cancelado"].includes(visita.estado)) return null;

  return (
    <View className="gap-2 rounded-2xl bg-white p-4">
      <Text className="text-sm font-semibold text-gray-900">Vehículos</Text>
      {visita.vehiculos.length === 0 ? (
        <Text className="text-xs text-gray-500">Sin vehículos apuntados.</Text>
      ) : null}
      {visita.vehiculos.map((v) => (
        <View key={v.uuid ?? v.placa} className="flex-row items-center justify-between gap-2">
          <Text className="text-sm text-gray-900 flex-1">
            🚗 {v.placa}
            {v.responsable ? ` · ${v.responsable}` : ""}
          </Text>
          {v.uuid ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setEditando({ uuid: v.uuid ?? "", placa: v.placa })}
            >
              Editar placa
            </Button>
          ) : null}
        </View>
      ))}
      <View className="flex-row">
        <Button size="sm" variant="secondary" onPress={() => setNuevo({ placa: "", tipo: tiposDeVehiculo[0]?.codigo ?? "" })}>
          Agregar vehículo
        </Button>
      </View>

      <Modal visible={!!editando} onClose={() => setEditando(null)} title="Editar placa">
        <View className="gap-4">
          <Input
            label="Placa"
            value={editando?.placa ?? ""}
            onChangeText={(t) => setEditando((e) => (e ? { ...e, placa: t } : e))}
            error={errorPlaca(editando?.placa)}
            showEditIcon={false}
          />
          <Button
            fullWidth
            loading={guardando}
            disabled={!editando?.placa.trim() || Boolean(errorPlaca(editando?.placa))}
            onPress={() =>
              editando &&
              guardar(() => cambiarPlaca(editando.uuid, editando.placa), "Placa corregida", () =>
                setEditando(null),
              )
            }
          >
            Guardar
          </Button>
        </View>
      </Modal>

      <Modal visible={!!nuevo} onClose={() => setNuevo(null)} title="Agregar vehículo">
        <View className="gap-4">
          <Input
            label="Placa"
            value={nuevo?.placa ?? ""}
            onChangeText={(t) => setNuevo((n) => (n ? { ...n, placa: t } : n))}
            placeholder="ABC123"
            error={errorPlaca(nuevo?.placa)}
            showEditIcon={false}
          />
          <Select
            label="Tipo"
            value={nuevo?.tipo ?? null}
            options={tipos}
            onChange={(t) => setNuevo((n) => (n ? { ...n, tipo: String(t) } : n))}
          />
          <Button
            fullWidth
            loading={guardando}
            disabled={!nuevo?.placa.trim() || Boolean(errorPlaca(nuevo?.placa))}
            onPress={() =>
              nuevo &&
              guardar(
                () => agregarVehiculoEnPorteria(visita.uuid ?? "", nuevo.placa, nuevo.tipo),
                "Vehículo apuntado",
                () => setNuevo(null),
              )
            }
          >
            Agregar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
