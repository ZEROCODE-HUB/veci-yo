import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";
import { NivelFormModal } from "./NivelFormModal";
import { nivelesSugeridos } from "../../helpers/arquitectura.helpers";
import type { NivelDeEstacionamiento } from "../../services/arquitectura.repo";

type Datos = { nombre: string; nomenclatura: string };

/**
 * Arquitectura › Estacionamientos (16/11/2026): los niveles del edificio.
 *
 * Cada estacionamiento nuevo va en un nivel y su código lleva la nomenclatura
 * del nivel (S1-01). Los estacionamientos se siguen creando desde cada torre o
 * de golpe al crear la torre; aquí se ve cuántos hay en cada nivel.
 */
export function EstacionamientosTab({
  niveles,
  estacionamientos,
  sotanosMaximo,
  onCreate,
  onUpdate,
  onDelete,
}: {
  niveles: NivelDeEstacionamiento[];
  estacionamientos: Array<{ nivelId: string | null }>;
  /** Los sótanos de la torre que más tiene: «Crear los sugeridos». */
  sotanosMaximo: number;
  onCreate: (niveles: Datos[]) => Promise<boolean>;
  onUpdate: (uuid: string, datos: Datos) => Promise<boolean>;
  onDelete: (uuid: string) => Promise<boolean>;
}) {
  const [formulario, setFormulario] = useState<{ editando: NivelDeEstacionamiento | null } | null>(null);
  const [creandoSugeridos, setCreandoSugeridos] = useState(false);
  const sugeridos = nivelesSugeridos(sotanosMaximo, niveles);
  const cuantos = (uuid: string) => estacionamientos.filter((e) => e.nivelId === uuid).length;
  const sinNivel = estacionamientos.filter((e) => !e.nivelId).length;
  const editando = formulario?.editando ?? null;

  return (
    <View className="gap-3">
      <View className="flex-row justify-end gap-2">
        <Button size="sm" onPress={() => setFormulario({ editando: null })}>
          + Nuevo nivel
        </Button>
      </View>
      <AdminSectionCard title="Niveles de estacionamiento">
        {niveles.map((nivel) => (
          <AdminRow
            key={nivel.uuid}
            title={nivel.nombre}
            subtitle={`Nomenclatura ${nivel.nomenclatura} · ${cuantos(nivel.uuid)} estacionamientos`}
            onPress={() => setFormulario({ editando: nivel })}
            onDelete={() => onDelete(nivel.uuid)}
          />
        ))}
        {niveles.length ? null : (
          <Text className="text-sm text-gray-500 text-center">
            Todavía no hay niveles. Crea los sugeridos o uno a uno.
          </Text>
        )}
        {sinNivel ? (
          <Text className="text-xs text-gray-500 mt-2">
            {`${sinNivel} ${sinNivel === 1 ? "estacionamiento creado antes no tiene" : "estacionamientos creados antes no tienen"} nivel. Puedes ponérselo al editarlo en su torre.`}
          </Text>
        ) : null}
      </AdminSectionCard>
      {sugeridos.length ? (
        <View className="gap-2 rounded-xl bg-blue-50 p-3">
          <Text className="text-sm text-blue-700">
            {`Sugeridos: ${sugeridos.map((s) => `${s.nombre} (${s.nomenclatura})`).join(", ")}`}
          </Text>
          <Button
            size="sm"
            variant="secondary"
            loading={creandoSugeridos}
            onPress={() => {
              setCreandoSugeridos(true);
              void onCreate(sugeridos).then(() => setCreandoSugeridos(false));
            }}
          >
            Crear los sugeridos
          </Button>
        </View>
      ) : null}
      <NivelFormModal
        visible={formulario !== null}
        editando={editando}
        nomenclaturasUsadas={niveles
          .filter((n) => n.uuid !== editando?.uuid)
          .map((n) => n.nomenclatura)}
        onClose={() => setFormulario(null)}
        onSave={(datos) => (editando ? onUpdate(editando.uuid, datos) : onCreate([datos]))}
      />
    </View>
  );
}
