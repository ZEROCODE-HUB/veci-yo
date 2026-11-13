import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Tabs } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { ScrollView, Text, View } from "react-native";
import type { Deposito, Torre, Unidad } from "@/stores/admin-store";
import {
  depositToForm,
  estacionamientoToForm,
  unitToForm,
  type DepositFormValues,
  type EstacionamientoDeTorre,
  type EstacionamientoFormValues,
  type UnitFormValues,
} from "../../types";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";
import { UnidadFormModal } from "./UnidadFormModal";
import { DepositoFormModal } from "./DepositoFormModal";
import { EstacionamientoFormModal } from "./EstacionamientoFormModal";
import { FilaDeDepartamento } from "./FilaDeDepartamento";
import { UnidadDetalleModal } from "./UnidadDetalleModal";
import { propietariosDeLaTorre } from "../../services/arquitectura.repo";
import { asignarPropietario } from "@/features/propietario/services/invitacionesUnidad.repo";
import { useUIStore } from "@/stores/ui-store";
import { depositToForm as depositoAForm } from "../../types";

type Props = {
  tower: Torre;
  units: Unidad[];
  deposits: Deposito[];
  onBack: () => void;
  /** Devuelve el id del departamento creado. */
  onCreateUnit: (form: UnitFormValues) => Promise<string>;
  /*
    Las que guardan devuelven `false` si falló (13/11/2026): la ventana espera
    a la respuesta y, si falla, se queda abierta con lo escrito.
  */
  onUpdateUnit: (unit: Unidad, form: UnitFormValues) => Promise<boolean>;
  onDeleteUnit: (uuid: string) => Promise<boolean>;
  onCreateDeposit: (form: DepositFormValues, units: Unidad[]) => Promise<boolean>;
  onUpdateDeposit: (
    deposit: Deposito,
    form: DepositFormValues,
    units: Unidad[],
  ) => Promise<boolean>;
  onDeleteDeposit: (uuid: string) => Promise<boolean>;
  parkings: EstacionamientoDeTorre[];
  onCreateParking: (form: EstacionamientoFormValues) => Promise<boolean>;
  onUpdateParking: (
    parking: EstacionamientoDeTorre,
    form: EstacionamientoFormValues,
  ) => Promise<boolean>;
  onDeleteParking: (uuid: string) => Promise<boolean>;
};

export function TorreDetailView({
  tower,
  units,
  deposits,
  onBack,
  onCreateUnit,
  onUpdateUnit,
  onDeleteUnit,
  onCreateDeposit,
  onUpdateDeposit,
  onDeleteDeposit,
  parkings,
  onCreateParking,
  onUpdateParking,
  onDeleteParking,
}: Props) {
  const [tab, setTab] = useState("Departamentos");
  const [unitModal, setUnitModal] = useState(false);
  const [unitEditing, setUnitEditing] = useState<Unidad | null>(null);
  const [unitDetalle, setUnitDetalle] = useState<Unidad | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  // El propietario de cada departamento, para la lista (29/10/2026).
  const consultaPropietarios = useQuery({
    queryKey: ["administrador", "propietarios-de-la-torre", tower.uuid],
    queryFn: () => propietariosDeLaTorre(tower.uuid ?? ""),
    enabled: Boolean(tower.uuid),
  });
  const propietarios = consultaPropietarios.data ?? {};
  /*
    «Sin propietario» solo cuando se sabe: mientras llegan, o si no llegaron,
    la fila no afirma nada del dueño (13/11/2026).
  */
  const propietarioDe = (uuid?: string) =>
    consultaPropietarios.data
      ? propietarios[uuid ?? ""] || "Sin propietario"
      : consultaPropietarios.isError
        ? "Propietario sin cargar"
        : "Buscando propietario…";
  const [depositModal, setDepositModal] = useState(false);
  const [depositEditing, setDepositEditing] = useState<Deposito | null>(null);
  const unitInitial = useMemo(() => unitToForm(unitEditing), [unitEditing]);
  const depositInitial = useMemo(
    () => depositToForm(depositEditing),
    [depositEditing],
  );
  const [parkingModal, setParkingModal] = useState(false);
  const [parkingEditing, setParkingEditing] =
    useState<EstacionamientoDeTorre | null>(null);
  const parkingInitial = useMemo(
    () => estacionamientoToForm(parkingEditing),
    [parkingEditing],
  );

  const openUnit = (unit?: Unidad) => {
    setUnitEditing(unit || null);
    setUnitModal(true);
  };
  const openDeposit = (deposit?: Deposito) => {
    setDepositEditing(deposit || null);
    setDepositModal(true);
  };
  const closeUnit = () => {
    setUnitModal(false);
    setUnitEditing(null);
  };
  const closeDeposit = () => {
    setDepositModal(false);
    setDepositEditing(null);
  };
  const openParking = (parking?: EstacionamientoDeTorre) => {
    setParkingEditing(parking || null);
    setParkingModal(true);
  };
  const closeParking = () => {
    setParkingModal(false);
    setParkingEditing(null);
  };

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={`Torre ${tower.numero}`} onBack={onBack} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <Tabs
          tabs={["Departamentos", "Estacionamientos", "Depósitos"]}
          active={tab}
          onChange={(value) => setTab(value || "Departamentos")}
        />
        {tab === "Departamentos" && (
          <>
            <View className="items-end">
              <Button size="sm" onPress={() => openUnit()}>
                + Agregar departamento
              </Button>
            </View>
            <AdminSectionCard title="Departamentos">
              {units.map((unit) => (
                <FilaDeDepartamento
                  key={unit.id}
                  titulo={`Departamento ${unit.codigo}`}
                  subtitulo={`Piso ${unit.piso} · ${propietarioDe(unit.uuid)}`}
                  estado={unit.estado}
                  onEditar={() => openUnit(unit)}
                  onVerDetalle={() => setUnitDetalle(unit)}
                  onEliminar={() => onDeleteUnit(unit.uuid ?? "")}
                />
              ))}
              {!units.length && (
                <Text className="text-sm text-gray-500 text-center">
                  No hay departamentos registrados.
                </Text>
              )}
            </AdminSectionCard>
          </>
        )}
        {tab === "Estacionamientos" && (
          /*
            Aqui solo habia dos numeros: los que el administrador **declaro** al
            dar de alta la torre. No creaban ninguna cochera, y encima la lista
            de torres contaba las de verdad, asi que la misma pantalla decia
            «Cocheras V.: 0» arriba y «Cocheras de visitas: 10» al abrir la
            torre. Ahora se dan de alta una a una, como los depositos, y el
            numero declarado se retiro de la ficha (REVISAR-A-OJO 72).
          */
          <>
            <View className="items-end">
              <Button size="sm" onPress={() => openParking()}>
                + Agregar cochera
              </Button>
            </View>
            <AdminSectionCard title="Estacionamientos">
              {parkings.map((parking) => (
                <AdminRow
                  key={parking.uuid}
                  title={parking.codigo}
                  subtitle={[
                    parking.tipo === "visitante" ? "De visita" : "Privada",
                    parking.ubicacion,
                    unidadDe(parking, units),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  // Una cochera ocupada lo dice: borrarla deja a alguien dentro
                  // sin sitio registrado.
                  status={parking.ocupado ? "Ocupado" : undefined}
                  onPress={() => openParking(parking)}
                  onDelete={() => onDeleteParking(parking.uuid)}
                />
              ))}
              {!parkings.length && (
                <Text className="text-sm text-gray-500 text-center">
                  No hay cocheras registradas en esta torre.
                </Text>
              )}
            </AdminSectionCard>
          </>
        )}
        {tab === "Depósitos" && (
          <>
            <View className="items-end">
              <Button size="sm" onPress={() => openDeposit()}>
                + Agregar depósito
              </Button>
            </View>
            <AdminSectionCard title="Depósitos">
              {deposits.map((deposit) => (
                <AdminRow
                  key={deposit.id}
                  title={deposit.codigo}
                  subtitle={`${deposit.ubicacion} · ${deposit.departamentoCodigo || "Sin departamento"}`}
                  onPress={() => openDeposit(deposit)}
                  onDelete={() => onDeleteDeposit(deposit.uuid ?? "")}
                />
              ))}
              {!deposits.length && (
                <Text className="text-sm text-gray-500 text-center">
                  No hay depositos registrados.
                </Text>
              )}
            </AdminSectionCard>
          </>
        )}
        <UnidadDetalleModal
          unit={unitDetalle}
          tower={tower}
          parkings={parkings}
          deposits={deposits}
          onClose={() => setUnitDetalle(null)}
        />
        <UnidadFormModal
          visible={unitModal}
          editing={unitEditing}
          initial={unitInitial}
          onClose={closeUnit}
          parkings={parkings}
          deposits={deposits}
          propietarioActual={propietarios[unitEditing?.uuid ?? ""]}
          onCreateParking={onCreateParking}
          onUpdateParking={onUpdateParking}
          onCreateDeposit={(form) => onCreateDeposit(form, units)}
          onUpdateDeposit={(deposit, form) => onUpdateDeposit(deposit, form, units)}
          onSave={async (form, extra) => {
            if (unitEditing) {
              if (await onUpdateUnit(unitEditing, form)) closeUnit();
              return;
            }
            /*
              Al crear, lo elegido abajo --estacionamientos, depósitos y
              propietario-- se aplica en cuanto el departamento existe
              (pedido del cliente, 29/10/2026).
            */
            return onCreateUnit(form)
              .then(async (uuid) => {
                closeUnit();
                if (!extra) return;
                const { borrador, propietario } = extra;
                for (const id of borrador.estacionamientos) {
                  const p = parkings.find((x) => x.uuid === id);
                  if (p) void onUpdateParking(p, { ...estacionamientoToForm(p), tipo: "privado", unidadId: uuid });
                }
                for (const n of borrador.estacionamientosNuevos) {
                  void onCreateParking({ codigo: n.codigo, ubicacion: n.ubicacion, tipo: "privado", unidadId: uuid });
                }
                for (const id of borrador.depositos) {
                  const d = deposits.find((x) => (x.uuid ?? String(x.id)) === id);
                  if (d) void onUpdateDeposit(d, { ...depositoAForm(d), unidadId: uuid }, units);
                }
                for (const n of borrador.depositosNuevos) {
                  void onCreateDeposit({ codigo: n.codigo, ubicacion: n.ubicacion, unidadId: uuid }, units);
                }
                if (propietario) {
                  try {
                    const r = await asignarPropietario({ unidadId: uuid, ...propietario });
                    addToast(
                      r.asignado
                        ? `${propietario.nombre} ya es propietario${r.correoEnviado ? ". Le avisamos por correo." : "."}`
                        : `${propietario.nombre} queda como propietario en cuanto cree su cuenta con ${propietario.correo}.`,
                      "success",
                    );
                  } catch (e) {
                    addToast(
                      (e as { message?: string } | null)?.message ?? "No se pudo asignar el propietario",
                      "error",
                    );
                  }
                }
              })
              .catch(() => undefined);
          }}
        />
        <EstacionamientoFormModal
          visible={parkingModal}
          editing={parkingEditing}
          initial={parkingInitial}
          units={units}
          onClose={closeParking}
          onSave={async (form) => {
            const ok = parkingEditing
              ? await onUpdateParking(parkingEditing, form)
              : await onCreateParking(form);
            if (ok) closeParking();
          }}
        />
        <DepositoFormModal
          visible={depositModal}
          editing={depositEditing}
          initial={depositInitial}
          units={units}
          onClose={closeDeposit}
          onSave={async (form) => {
            const ok = depositEditing
              ? await onUpdateDeposit(depositEditing, form, units)
              : await onCreateDeposit(form, units);
            if (ok) closeDeposit();
          }}
        />
      </ScrollView>
    </View>
  );
}

/** El departamento de una cochera privada, o nada si es de visita. */
function unidadDe(parking: EstacionamientoDeTorre, units: Unidad[]): string {
  if (!parking.unidadId) return "";
  const unidad = units.find(
    (item) => String(item.uuid ?? item.id) === String(parking.unidadId),
  );
  return unidad ? `Depto ${unidad.codigo}` : "";
}
