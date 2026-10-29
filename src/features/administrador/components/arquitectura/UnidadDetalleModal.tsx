import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Badge, Cargando, Modal } from "@/shared/components";
import { ESTADO_UNIDAD } from "@/shared/constants";
import { formatDate } from "@/shared/utils";
import { useAdminStore, type Deposito, type Torre, type Unidad } from "@/stores/admin-store";
import { obtenerContactosDeLaVivienda } from "@/features/directorio/services/contactos.repo";
import { PAPEL_EN_LA_VIVIENDA } from "@/features/directorio/helpers/contactos";
import { propietarioPendiente } from "@/features/propietario/services/invitacionesUnidad.repo";
import type { EstacionamientoDeTorre } from "../../types";

/**
 * «Ver detalle» de un departamento (29/10/2026), según el prototipo
 * (`UnidadDetalleModal` de la maqueta), con lo que de verdad hay en la base:
 * estado, torre, piso y tipología; el propietario (o el que está asignado y
 * todavía no creó su cuenta); quiénes viven o figuran; sus estacionamientos y
 * depósitos. Lo que la maqueta inventaba y la base no tiene, no se pinta.
 */
export function UnidadDetalleModal({
  unit,
  tower,
  parkings,
  deposits,
  onClose,
}: {
  unit: Unidad | null;
  tower: Torre;
  parkings: EstacionamientoDeTorre[];
  deposits: Deposito[];
  onClose: () => void;
}) {
  const tipologias = useAdminStore((s) => s.tipologias);
  const unidadId = unit?.uuid ?? "";

  const personas = useQuery({
    queryKey: ["unidad", "detalle", "personas", unidadId],
    queryFn: () => obtenerContactosDeLaVivienda(unidadId),
    enabled: Boolean(unidadId),
  });
  const pendiente = useQuery({
    queryKey: ["unidad", "detalle", "propietario-pendiente", unidadId],
    queryFn: () => propietarioPendiente(unidadId),
    enabled: Boolean(unidadId),
  });

  if (!unit) return null;
  const tipologia = tipologias.find((t) => t.uuid === unit.tipologiaId);
  const suyos = parkings.filter((p) => p.unidadId === unidadId);
  const susDepositos = deposits.filter((d) => String(d.unidadId ?? "") === unidadId);
  const propietarios = (personas.data ?? []).filter((p) => p.rol === "propietario");
  const otros = (personas.data ?? []).filter((p) => p.rol !== "propietario");

  return (
    <Modal visible onClose={onClose} title={`Departamento ${unit.codigo}`}>
      <View className="gap-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-gray-500">Estado:</Text>
          <Badge status={ESTADO_UNIDAD[unit.estado]}>{ESTADO_UNIDAD[unit.estado]}</Badge>
        </View>

        <Seccion titulo="Información general">
          <Dato etiqueta="Torre" valor={tower.nombre || `Torre ${tower.numero}`} />
          <Dato etiqueta="Piso" valor={String(unit.piso)} />
          <Dato
            etiqueta="Tipología"
            valor={
              tipologia
                ? `${tipologia.nombre} · ${tipologia.habitaciones} hab. · ${tipologia.banos} baños · ${tipologia.metrosCuadrados} m²`
                : "Sin tipología"
            }
          />
        </Seccion>

        <Seccion titulo="Propietario">
          {personas.isLoading ? (
            <Cargando variante="enLinea" texto="el propietario" />
          ) : propietarios.length > 0 ? (
            propietarios.map((p) => (
              <Dato
                key={p.membresiaId}
                etiqueta={p.esAnfitrionPrimario ? "Anfitrión primario" : "Propietario"}
                valor={p.nombre}
              />
            ))
          ) : pendiente.data ? (
            <Text className="text-sm text-gray-900">
              {`${pendiente.data.nombre} (${pendiente.data.correo}): asignado el ${formatDate(new Date(pendiente.data.desde))}, todavía no creó su cuenta.`}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500">Sin propietario asignado.</Text>
          )}
        </Seccion>

        {otros.length > 0 ? (
          <Seccion titulo="Personas registradas">
            {otros.map((p) => (
              <Dato key={p.membresiaId} etiqueta={PAPEL_EN_LA_VIVIENDA[p.rol] ?? p.rol} valor={p.nombre} />
            ))}
          </Seccion>
        ) : null}

        <Seccion titulo="Estacionamientos y depósitos">
          <Dato
            etiqueta="Estacionamientos"
            valor={suyos.length ? suyos.map((p) => p.codigo).join(", ") : "Ninguno"}
          />
          <Dato
            etiqueta="Depósitos"
            valor={susDepositos.length ? susDepositos.map((d) => d.codigo).join(", ") : "Ninguno"}
          />
        </Seccion>
      </View>
    </Modal>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5 rounded-xl border border-gray-200 p-3">
      <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
      {children}
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Text className="text-sm text-gray-500">
      {`${etiqueta}: `}
      <Text className="text-gray-900">{valor}</Text>
    </Text>
  );
}
