import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input, Select } from "@/shared/components";
import type { Deposito } from "@/stores/admin-store";
import type {
  DepositFormValues,
  EstacionamientoDeTorre,
  EstacionamientoFormValues,
} from "../../types";
import { depositToForm, estacionamientoToForm } from "../../types";

/**
 * Los estacionamientos y depósitos de un departamento, desde su ficha
 * (29/10/2026).
 *
 * El cliente: al crear o editar un departamento, asignarle sus
 * estacionamientos y depósitos ahí mismo, o crear uno nuevo si no hay libre.
 * Se siguen pudiendo asignar desde la cochera o el depósito; los dos caminos
 * escriben lo mismo (`unidad_id`).
 */
export function RecursosDeLaVivienda({
  unidadId,
  parkings,
  deposits,
  onCreateParking,
  onUpdateParking,
  onCreateDeposit,
  onUpdateDeposit,
}: {
  unidadId: string;
  parkings: EstacionamientoDeTorre[];
  deposits: Deposito[];
  onCreateParking: (form: EstacionamientoFormValues) => void;
  onUpdateParking: (parking: EstacionamientoDeTorre, form: EstacionamientoFormValues) => void;
  onCreateDeposit: (form: DepositFormValues) => void;
  onUpdateDeposit: (deposit: Deposito, form: DepositFormValues) => void;
}) {
  const suyos = parkings.filter((p) => p.unidadId === unidadId);
  const libres = parkings.filter((p) => p.tipo === "privado" && !p.unidadId);
  const susDepositos = deposits.filter((d) => String(d.unidadId ?? "") === unidadId);
  const depositosLibres = deposits.filter((d) => !d.unidadId);

  return (
    <View className="gap-4">
      <Bloque
        titulo={`Estacionamientos (${suyos.length})`}
        asignados={suyos.map((p) => ({
          clave: p.uuid,
          texto: [p.codigo, p.ubicacion].filter(Boolean).join(" · "),
          quitar: () => onUpdateParking(p, { ...estacionamientoToForm(p), unidadId: "" }),
        }))}
        libres={libres.map((p) => ({
          clave: p.uuid,
          texto: [p.codigo, p.ubicacion].filter(Boolean).join(" · "),
        }))}
        onAsignar={(clave) => {
          const p = libres.find((x) => x.uuid === clave);
          if (p) onUpdateParking(p, { ...estacionamientoToForm(p), tipo: "privado", unidadId });
        }}
        onCrear={(codigo, ubicacion) => onCreateParking({ codigo, ubicacion, tipo: "privado", unidadId })}
        nombre="estacionamiento"
      />
      <Bloque
        titulo={`Depósitos (${susDepositos.length})`}
        asignados={susDepositos.map((d) => ({
          clave: d.uuid ?? String(d.id),
          texto: [d.codigo, d.ubicacion].filter(Boolean).join(" · "),
          quitar: () => onUpdateDeposit(d, { ...depositToForm(d), unidadId: "" }),
        }))}
        libres={depositosLibres.map((d) => ({
          clave: d.uuid ?? String(d.id),
          texto: [d.codigo, d.ubicacion].filter(Boolean).join(" · "),
        }))}
        onAsignar={(clave) => {
          const d = depositosLibres.find((x) => (x.uuid ?? String(x.id)) === clave);
          if (d) onUpdateDeposit(d, { ...depositToForm(d), unidadId });
        }}
        onCrear={(codigo, ubicacion) => onCreateDeposit({ codigo, ubicacion, unidadId })}
        nombre="depósito"
      />
    </View>
  );
}

export function Bloque({
  titulo,
  asignados,
  libres,
  onAsignar,
  onCrear,
  nombre,
}: {
  titulo: string;
  asignados: Array<{ clave: string; texto: string; quitar: () => void }>;
  libres: Array<{ clave: string; texto: string }>;
  onAsignar: (clave: string) => void;
  onCrear: (codigo: string, ubicacion: string) => void;
  nombre: string;
}) {
  const [creando, setCreando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [ubicacion, setUbicacion] = useState("");

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
      {asignados.length === 0 ? (
        <Text className="text-xs text-gray-500">{`Sin ${nombre} asignado.`}</Text>
      ) : (
        asignados.map((a) => (
          <View key={a.clave} className="flex-row items-center gap-2">
            <Text className="flex-1 text-sm text-gray-900">{a.texto}</Text>
            <Button size="sm" variant="ghost" onPress={a.quitar}>
              Quitar
            </Button>
          </View>
        ))
      )}
      {libres.length > 0 ? (
        <Select
          label={`Asignar un ${nombre} libre (opcional)`}
          value=""
          placeholder="Elegir…"
          options={libres.map((l) => ({ value: l.clave, label: l.texto }))}
          onChange={(valor) => valor && onAsignar(String(valor))}
        />
      ) : (
        <Text className="text-xs text-gray-500">{`No hay ningún ${nombre} libre en la torre.`}</Text>
      )}
      {creando ? (
        <View className="gap-2">
          <Input label="Código *" value={codigo} onChangeText={setCodigo} placeholder="Ej: T1-P05" />
          <Input label="Ubicación (opcional)" value={ubicacion} onChangeText={setUbicacion} placeholder="Ej: Sótano 1" />
          <View className="flex-row gap-2">
            <Button
              size="sm"
              disabled={!codigo.trim()}
              onPress={() => {
                onCrear(codigo.trim(), ubicacion.trim());
                setCodigo("");
                setUbicacion("");
                setCreando(false);
              }}
            >
              Crear y asignar
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setCreando(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : (
        <Button size="sm" variant="secondary" onPress={() => setCreando(true)}>
          {`+ Crear un ${nombre} nuevo`}
        </Button>
      )}
    </View>
  );
}

/** Lo elegido para un departamento que todavía no se guardó (29/10/2026). */
export interface BorradorDeRecursos {
  estacionamientos: string[];
  estacionamientosNuevos: Array<{ codigo: string; ubicacion: string }>;
  depositos: string[];
  depositosNuevos: Array<{ codigo: string; ubicacion: string }>;
}

export const BORRADOR_VACIO: BorradorDeRecursos = {
  estacionamientos: [],
  estacionamientosNuevos: [],
  depositos: [],
  depositosNuevos: [],
};

/**
 * Lo mismo que `RecursosDeLaVivienda`, para un departamento nuevo: se elige
 * antes de guardar y se aplica al guardarlo (pedido del cliente, 29/10/2026:
 * «al registrar un nuevo departamento no aparecen»).
 */
export function RecursosDelBorrador({
  parkings,
  deposits,
  borrador,
  onCambiar,
}: {
  parkings: EstacionamientoDeTorre[];
  deposits: Deposito[];
  borrador: BorradorDeRecursos;
  onCambiar: (borrador: BorradorDeRecursos) => void;
}) {
  const libres = parkings.filter((p) => p.tipo === "privado" && !p.unidadId);
  const depositosLibres = deposits.filter((d) => !d.unidadId);
  const claveDep = (d: Deposito) => d.uuid ?? String(d.id);
  const texto = (codigo: string, ubicacion?: string | null) => [codigo, ubicacion].filter(Boolean).join(" · ");

  return (
    <View className="gap-4">
      <Bloque
        titulo={`Estacionamientos (${borrador.estacionamientos.length + borrador.estacionamientosNuevos.length})`}
        asignados={[
          ...libres
            .filter((p) => borrador.estacionamientos.includes(p.uuid))
            .map((p) => ({
              clave: p.uuid,
              texto: texto(p.codigo, p.ubicacion),
              quitar: () =>
                onCambiar({ ...borrador, estacionamientos: borrador.estacionamientos.filter((x) => x !== p.uuid) }),
            })),
          ...borrador.estacionamientosNuevos.map((n, i) => ({
            clave: `nuevo-${i}`,
            texto: `${texto(n.codigo, n.ubicacion)} (nuevo)`,
            quitar: () =>
              onCambiar({
                ...borrador,
                estacionamientosNuevos: borrador.estacionamientosNuevos.filter((_, j) => j !== i),
              }),
          })),
        ]}
        libres={libres
          .filter((p) => !borrador.estacionamientos.includes(p.uuid))
          .map((p) => ({ clave: p.uuid, texto: texto(p.codigo, p.ubicacion) }))}
        onAsignar={(clave) => onCambiar({ ...borrador, estacionamientos: [...borrador.estacionamientos, clave] })}
        onCrear={(codigo, ubicacion) =>
          onCambiar({ ...borrador, estacionamientosNuevos: [...borrador.estacionamientosNuevos, { codigo, ubicacion }] })
        }
        nombre="estacionamiento"
      />
      <Bloque
        titulo={`Depósitos (${borrador.depositos.length + borrador.depositosNuevos.length})`}
        asignados={[
          ...depositosLibres
            .filter((d) => borrador.depositos.includes(claveDep(d)))
            .map((d) => ({
              clave: claveDep(d),
              texto: texto(d.codigo, d.ubicacion),
              quitar: () =>
                onCambiar({ ...borrador, depositos: borrador.depositos.filter((x) => x !== claveDep(d)) }),
            })),
          ...borrador.depositosNuevos.map((n, i) => ({
            clave: `nuevo-${i}`,
            texto: `${texto(n.codigo, n.ubicacion)} (nuevo)`,
            quitar: () =>
              onCambiar({ ...borrador, depositosNuevos: borrador.depositosNuevos.filter((_, j) => j !== i) }),
          })),
        ]}
        libres={depositosLibres
          .filter((d) => !borrador.depositos.includes(claveDep(d)))
          .map((d) => ({ clave: claveDep(d), texto: texto(d.codigo, d.ubicacion) }))}
        onAsignar={(clave) => onCambiar({ ...borrador, depositos: [...borrador.depositos, clave] })}
        onCrear={(codigo, ubicacion) =>
          onCambiar({ ...borrador, depositosNuevos: [...borrador.depositosNuevos, { codigo, ubicacion }] })
        }
        nombre="depósito"
      />
    </View>
  );
}
