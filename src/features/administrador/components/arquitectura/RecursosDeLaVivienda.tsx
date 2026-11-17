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
import { codigoConNivel, siguientesCodigos } from "../../helpers/arquitectura.helpers";
import { ElegidoDeLaVivienda, type EstadoElegido } from "./ElegidoDeLaVivienda";

/** Los niveles del edificio y los códigos que ya hay (16/11/2026). */
export interface NivelesParaCrear {
  niveles: Array<{ uuid: string; nombre: string; nomenclatura: string }>;
  codigosDelEdificio: string[];
}

/** Las opciones del selector de nivel y la sugerencia de código de cada uno. */
function opcionesDeNivel({ niveles, codigosDelEdificio }: NivelesParaCrear) {
  return {
    niveles: niveles.map((n) => ({ value: n.uuid, label: `${n.nombre} (${n.nomenclatura})` })),
    sugerir: (nivelId: string) => {
      const nivel = niveles.find((n) => n.uuid === nivelId);
      return nivel ? siguientesCodigos(nivel.nomenclatura, "privado", 1, codigosDelEdificio)[0] : "";
    },
  };
}

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
  nivelesParaCrear,
}: {
  unidadId: string;
  nivelesParaCrear: NivelesParaCrear;
  parkings: EstacionamientoDeTorre[];
  deposits: Deposito[];
  onCreateParking: (form: EstacionamientoFormValues) => unknown;
  onUpdateParking: (parking: EstacionamientoDeTorre, form: EstacionamientoFormValues) => unknown;
  onCreateDeposit: (form: DepositFormValues) => unknown;
  onUpdateDeposit: (deposit: Deposito, form: DepositFormValues) => unknown;
}) {
  const suyos = parkings.filter((p) => p.unidadId === unidadId);
  const libres = parkings.filter((p) => p.tipo === "privado" && !p.unidadId);
  const susDepositos = deposits.filter((d) => String(d.unidadId ?? "") === unidadId);
  const depositosLibres = deposits.filter((d) => !d.unidadId);

  return (
    <View className="gap-4">
      <Bloque
        titulo={`Estacionamientos (${suyos.length})`}
        explicacion="Los estacionamientos de este departamento. Lo que eliges se asigna al momento."
        estado="asignado"
        asignados={suyos.map((p) => ({
          clave: p.uuid,
          texto: codigoConNivel(p.codigo, p.nivel),
          quitar: () => onUpdateParking(p, { ...estacionamientoToForm(p), unidadId: "" }),
        }))}
        libres={libres.map((p) => ({
          clave: p.uuid,
          // «S1-03 · Sótano 1» (16/11/2026): el nivel dice dónde está.
          texto: codigoConNivel(p.codigo, p.nivel),
        }))}
        onAsignar={(clave) => {
          const p = libres.find((x) => x.uuid === clave);
          if (p) onUpdateParking(p, { ...estacionamientoToForm(p), tipo: "privado", unidadId });
        }}
        onCrear={(codigo, ubicacion, nivelId) =>
          onCreateParking({ codigo, ubicacion, nivelId, tipo: "privado", unidadId })
        }
        {...opcionesDeNivel(nivelesParaCrear)}
        nombre="estacionamiento"
      />
      <Bloque
        titulo={`Depósitos (${susDepositos.length})`}
        explicacion="Los depósitos de este departamento. Lo que eliges se asigna al momento."
        estado="asignado"
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
  explicacion,
  estado,
  asignados,
  libres,
  onAsignar,
  onCrear,
  nombre,
  niveles,
  sugerir,
}: {
  titulo: string;
  /** Una línea que dice para qué es el bloque y cuándo se guarda (17/11/2026). */
  explicacion: string;
  /** Lo elegido ya está escrito o se escribe al guardar el departamento. */
  estado: EstadoElegido;
  asignados: Array<{ clave: string; texto: string; nota?: string; quitar: () => unknown }>;
  libres: Array<{ clave: string; texto: string }>;
  onAsignar: (clave: string) => unknown;
  onCrear: (codigo: string, ubicacion: string, nivelId: string) => unknown;
  nombre: string;
  /**
   * Con niveles, «+ Crear nuevo» pide el nivel antes que nada y sugiere el
   * código (16/11/2026: «Ubicación obligatoria al crear Estacionamiento»).
   */
  niveles?: Array<{ value: string; label: string }>;
  sugerir?: (nivelId: string) => string;
}) {
  const [creando, setCreando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [nivelId, setNivelId] = useState("");
  const [sugerido, setSugerido] = useState("");
  const faltaNivel = Boolean(niveles) && !nivelId;
  /*
    Lo que se está guardando ahora (13/11/2026, tester: «al asignar no hay un
    estado de carga»): «asignar», «crear» o la clave de lo que se quita.
  */
  const [ocupado, setOcupado] = useState<string | null>(null);
  const hacer = async (que: string, accion: () => unknown) => {
    setOcupado(que);
    try {
      await accion();
    } finally {
      setOcupado(null);
    }
  };

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="gap-0.5">
        <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
        <Text className="text-xs text-gray-500">{explicacion}</Text>
      </View>
      {asignados.length === 0 ? (
        <Text className="text-xs text-gray-500">{`Todavía no tiene ${nombre}.`}</Text>
      ) : (
        asignados.map((a) => (
          <ElegidoDeLaVivienda
            key={a.clave}
            texto={a.texto}
            nota={a.nota}
            estado={estado}
            quitando={ocupado === a.clave}
            bloqueado={ocupado !== null}
            onQuitar={() => void hacer(a.clave, a.quitar)}
          />
        ))
      )}
      {ocupado === "asignar" ? (
        <Text className="text-xs font-semibold text-gray-600">{`Asignando el ${nombre}…`}</Text>
      ) : null}
      {libres.length > 0 ? (
        <Select
          label={asignados.length ? `Agregar otro ${nombre} (opcional)` : `Elegir un ${nombre} libre (opcional)`}
          value=""
          placeholder="Elegir de los libres de la torre…"
          options={libres.map((l) => ({ value: l.clave, label: l.texto }))}
          onChange={(valor) => {
            if (valor && ocupado === null) void hacer("asignar", () => onAsignar(String(valor)));
          }}
        />
      ) : (
        <Text className="text-xs text-gray-500">{asignados.length ? `No quedan más ${nombre}s libres en la torre.` : `No hay ningún ${nombre} libre en la torre.`}</Text>
      )}
      {creando ? (
        <View className="gap-2">
          {niveles ? (
            <Select
              label="Nivel *"
              value={nivelId}
              placeholder="Elegir el nivel…"
              textoSinOpciones="Todavía no hay niveles. Créalos en Arquitectura › Estacionamientos."
              options={niveles}
              onChange={(valor) => {
                const id = String(valor);
                setNivelId(id);
                // Se sugiere el siguiente código del nivel, salvo que se haya
                // escrito otro a mano.
                if (sugerir && (!codigo || codigo === sugerido)) {
                  const nuevo = sugerir(id);
                  setSugerido(nuevo);
                  setCodigo(nuevo);
                }
              }}
            />
          ) : null}
          <Input label="Código *" value={codigo} onChangeText={setCodigo} placeholder={niveles ? "Ej: S1-05" : "Ej: D-05"} />
          <Input
            label={niveles ? "Detalle de ubicación (opcional)" : "Ubicación (opcional)"}
            value={ubicacion}
            onChangeText={setUbicacion}
            placeholder={niveles ? "Ej: Junto al ascensor" : "Ej: Sótano 1"}
          />
          <View className="flex-row gap-2">
            <Button
              size="sm"
              disabled={!codigo.trim() || faltaNivel || ocupado !== null}
              loading={ocupado === "crear"}
              onPress={() =>
                void hacer("crear", () => onCrear(codigo.trim(), ubicacion.trim(), nivelId)).then(() => {
                  setCodigo("");
                  setUbicacion("");
                  setNivelId("");
                  setSugerido("");
                  setCreando(false);
                })
              }
            >
              {estado === "asignado" ? "Crear y asignar" : "Agregar a la lista"}
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
  estacionamientosNuevos: Array<{ codigo: string; ubicacion: string; nivelId: string }>;
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
  nivelesParaCrear,
}: {
  nivelesParaCrear: NivelesParaCrear;
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
        explicacion="Los estacionamientos de este departamento. Se asignan al guardar el departamento."
        estado="al-guardar"
        asignados={[
          ...libres
            .filter((p) => borrador.estacionamientos.includes(p.uuid))
            .map((p) => ({
              clave: p.uuid,
              texto: codigoConNivel(p.codigo, p.nivel),
              quitar: () =>
                onCambiar({ ...borrador, estacionamientos: borrador.estacionamientos.filter((x) => x !== p.uuid) }),
            })),
          ...borrador.estacionamientosNuevos.map((n, i) => ({
            clave: `nuevo-${i}`,
            texto: codigoConNivel(n.codigo, nivelesParaCrear.niveles.find((x) => x.uuid === n.nivelId)?.nombre),
            nota: "nuevo",
            quitar: () =>
              onCambiar({
                ...borrador,
                estacionamientosNuevos: borrador.estacionamientosNuevos.filter((_, j) => j !== i),
              }),
          })),
        ]}
        libres={libres
          .filter((p) => !borrador.estacionamientos.includes(p.uuid))
          .map((p) => ({ clave: p.uuid, texto: codigoConNivel(p.codigo, p.nivel) }))}
        onAsignar={(clave) => onCambiar({ ...borrador, estacionamientos: [...borrador.estacionamientos, clave] })}
        onCrear={(codigo, ubicacion, nivelId) =>
          onCambiar({
            ...borrador,
            estacionamientosNuevos: [...borrador.estacionamientosNuevos, { codigo, ubicacion, nivelId }],
          })
        }
        {...opcionesDeNivel({
          ...nivelesParaCrear,
          // Lo ya apuntado en el borrador también cuenta para el siguiente código.
          codigosDelEdificio: [
            ...nivelesParaCrear.codigosDelEdificio,
            ...borrador.estacionamientosNuevos.map((n) => n.codigo),
          ],
        })}
        nombre="estacionamiento"
      />
      <Bloque
        titulo={`Depósitos (${borrador.depositos.length + borrador.depositosNuevos.length})`}
        explicacion="Los depósitos de este departamento. Se asignan al guardar el departamento."
        estado="al-guardar"
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
            texto: texto(n.codigo, n.ubicacion),
            nota: "nuevo",
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
