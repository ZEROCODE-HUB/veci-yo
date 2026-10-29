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
  onUpdateUnit: (unit: Unidad, form: UnitFormValues) => void;
  onDeleteUnit: (uuid: string) => void;
  onCreateDeposit: (form: DepositFormValues, units: Unidad[]) => void;
  onUpdateDeposit: (
    deposit: Deposito,
    form: DepositFormValues,
    units: Unidad[],
  ) => void;
  onDeleteDeposit: (uuid: string) => void;
  parkings: EstacionamientoDeTorre[];
  onCreateParking: (form: EstacionamientoFormValues) => void;
  onUpdateParking: (
    parking: EstacionamientoDeTorre,
    form: EstacionamientoFormValues,
  ) => void;
  onDeleteParking: (uuid: string) => void;
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
  const { data: propietarios = {} } = useQuery({
    queryKey: ["administrador", "propietarios-de-la-torre", tower.uuid],
    queryFn: () => propietariosDeLaTorre(tower.uuid ?? ""),
    enabled: Boolean(tower.uuid),
  });
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
                  subtitulo={`Piso ${unit.piso} · ${propietarios[unit.uuid ?? ""] || "Sin propietario"}`}
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
          onSave={(form, extra) => {
            if (unitEditing) {
              onUpdateUnit(unitEditing, form);
              closeUnit();
              return;
            }
            /*
              Al crear, lo elegido abajo --estacionamientos, depósitos y
              propietario-- se aplica en cuanto el departamento existe
              (pedido del cliente, 29/10/2026).
            */
            void onCreateUnit(form)
              .then(async (uuid) => {
                closeUnit();
                if (!extra) return;
                const { borrador, propietario } = extra;
                for (const id of borrador.estacionamientos) {
                  const p = parkings.find((x) => x.uuid === id);
                  if (p) onUpdateParking(p, { ...estacionamientoToForm(p), tipo: "privado", unidadId: uuid });
                }
                for (const n of borrador.estacionamientosNuevos) {
                  onCreateParking({ codigo: n.codigo, ubicacion: n.ubicacion, tipo: "privado", unidadId: uuid });
                }
                for (const id of borrador.depositos) {
                  const d = deposits.find((x) => (x.uuid ?? String(x.id)) === id);
                  if (d) onUpdateDeposit(d, { ...depositoAForm(d), unidadId: uuid }, units);
                }
                for (const n of borrador.depositosNuevos) {
                  onCreateDeposit({ codigo: n.codigo, ubicacion: n.ubicacion, unidadId: uuid }, units);
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
          onSave={(form) => {
            if (parkingEditing) onUpdateParking(parkingEditing, form);
            else onCreateParking(form);
            closeParking();
          }}
        />
        <DepositoFormModal
          visible={depositModal}
          editing={depositEditing}
          initial={depositInitial}
          units={units}
          onClose={closeDeposit}
          onSave={(form) => {
            if (depositEditing) onUpdateDeposit(depositEditing, form, units);
            else onCreateDeposit(form, units);
            closeDeposit();
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
