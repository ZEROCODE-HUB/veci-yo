import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";
import { NivelFormModal } from "./NivelFormModal";
import type { NivelDeEstacionamiento } from "../../services/arquitectura.repo";

type Datos = { nombre: string; nomenclatura: string; torreId?: string | null };
type TorreCorta = { uuid?: string; nombre: string };

/**
 * Arquitectura › Estacionamientos (16/11/2026): los niveles del edificio.
 *
 * Cada estacionamiento nuevo va en un nivel y su código lleva la nomenclatura
 * del nivel (S1-01). Desde el 17/11/2026 cada nivel es de una torre: el
 * cliente pidió «primero se crea la torre, luego recién el sótano», y que en
 * Estacionamiento diga en qué torre está. Por eso se fueron los «sugeridos»,
 * que salían de los sótanos escritos en la torre y no sabían de cuál. Los estacionamientos se siguen creando desde cada torre o
 * de golpe al crear la torre; aquí se ve cuántos hay en cada nivel.
 */
export function EstacionamientosTab({
  niveles,
  estacionamientos,
  torres,
  onCreate,
  onUpdate,
  onDelete,
}: {
  niveles: NivelDeEstacionamiento[];
  estacionamientos: Array<{ nivelId: string | null }>;
  /** Las torres del edificio: cada nivel es de una. */
  torres: TorreCorta[];
  onCreate: (niveles: Datos[]) => Promise<boolean>;
  onUpdate: (uuid: string, datos: Datos) => Promise<boolean>;
  onDelete: (uuid: string) => Promise<boolean>;
}) {
  const [formulario, setFormulario] = useState<{ editando: NivelDeEstacionamiento | null } | null>(null);
  const nombreDeTorre = (uuid: string | null) =>
    torres.find((t) => t.uuid === uuid)?.nombre ?? "Sin torre";
  const cuantos = (uuid: string) => estacionamientos.filter((e) => e.nivelId === uuid).length;
  const sinNivel = estacionamientos.filter((e) => !e.nivelId).length;
  const editando = formulario?.editando ?? null;

  return (
    <View className="gap-3">
      <View className="flex-row justify-end gap-2">
        <Button
          size="sm"
          disabled={!torres.length}
          onPress={() => setFormulario({ editando: null })}
        >
          + Nuevo sótano o nivel
        </Button>
      </View>
      {torres.length ? null : (
        <Text className="text-sm text-gray-500 text-center">
          Primero crea una torre en la pestaña Torres. Después agregas aquí sus sótanos.
        </Text>
      )}
      <AdminSectionCard title="Niveles de estacionamiento">
        {niveles.map((nivel) => (
          <AdminRow
            key={nivel.uuid}
            title={nivel.nombre}
            subtitle={`${nombreDeTorre(nivel.torreId)} · Nomenclatura ${nivel.nomenclatura} · ${cuantos(nivel.uuid)} estacionamientos`}
            onPress={() => setFormulario({ editando: nivel })}
            onDelete={() => onDelete(nivel.uuid)}
          />
        ))}
        {niveles.length ? null : (
          <Text className="text-sm text-gray-500 text-center">
            Todavía no hay sótanos ni niveles.
          </Text>
        )}
        {sinNivel ? (
          <Text className="text-xs text-gray-500 mt-2">
            {`${sinNivel} ${sinNivel === 1 ? "estacionamiento creado antes no tiene" : "estacionamientos creados antes no tienen"} nivel. Puedes ponérselo al editarlo en su torre.`}
          </Text>
        ) : null}
      </AdminSectionCard>
      <NivelFormModal
        visible={formulario !== null}
        editando={editando}
        torres={torres}
        nomenclaturasUsadas={niveles
          .filter((n) => n.uuid !== editando?.uuid)
          .map((n) => n.nomenclatura)}
        onClose={() => setFormulario(null)}
        onSave={(datos) => (editando ? onUpdate(editando.uuid, datos) : onCreate([datos]))}
      />
    </View>
  );
}
