import { useMemo, useState } from "react";
import { Button, Input, Modal, Select, Tabs } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { ScrollView, Text, View } from "react-native";
import type { Deposito, Torre, Unidad } from "@/stores/admin-store";
import {
  depositToForm,
  unitToForm,
  type DepositFormValues,
  type UnitFormValues,
} from "../../types";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";
import { UnidadFormModal } from "./UnidadFormModal";
import { DepositoFormModal } from "./DepositoFormModal";

type Props = {
  tower: Torre;
  units: Unidad[];
  deposits: Deposito[];
  onBack: () => void;
  onCreateUnit: (form: UnitFormValues) => void;
  onUpdateUnit: (unit: Unidad, form: UnitFormValues) => void;
  onDeleteUnit: (id: number) => void;
  onCreateDeposit: (form: DepositFormValues, units: Unidad[]) => void;
  onUpdateDeposit: (
    deposit: Deposito,
    form: DepositFormValues,
    units: Unidad[],
  ) => void;
  onDeleteDeposit: (id: number) => void;
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
}: Props) {
  const [tab, setTab] = useState("Departamentos");
  const [unitModal, setUnitModal] = useState(false);
  const [unitEditing, setUnitEditing] = useState<Unidad | null>(null);
  const [depositModal, setDepositModal] = useState(false);
  const [depositEditing, setDepositEditing] = useState<Deposito | null>(null);
  const unitInitial = useMemo(() => unitToForm(unitEditing), [unitEditing]);
  const depositInitial = useMemo(
    () => depositToForm(depositEditing),
    [depositEditing],
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

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={`Torre N${tower.numero}`} onBack={onBack} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <Tabs
          tabs={["Departamentos", "Estacionamientos", "Depositos"]}
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
                <AdminRow
                  key={unit.id}
                  title={`Departamento ${unit.codigo}`}
                  subtitle={`Piso ${unit.piso} · ${unit.propietarioAsignado || "Sin propietario"}`}
                  status={unit.estado}
                  onPress={() => openUnit(unit)}
                  onDelete={() => onDeleteUnit(unit.id)}
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
          <AdminSectionCard title="Estacionamientos">
            <Text className="text-sm text-gray-500 text-center">
              Cocheras privadas configuradas: {tower.cocherasPrivadas || "0"}
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              Cocheras de visitas: {tower.cocherasVisitas || "0"}
            </Text>
          </AdminSectionCard>
        )}
        {tab === "Depositos" && (
          <>
            <View className="items-end">
              <Button size="sm" onPress={() => openDeposit()}>
                + Agregar deposito
              </Button>
            </View>
            <AdminSectionCard title="Depositos">
              {deposits.map((deposit) => (
                <AdminRow
                  key={deposit.id}
                  title={deposit.codigo}
                  subtitle={`${deposit.ubicacion} · ${deposit.departamentoCodigo || "Sin departamento"}`}
                  onPress={() => openDeposit(deposit)}
                  onDelete={() => onDeleteDeposit(deposit.id)}
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
        <UnidadFormModal
          visible={unitModal}
          editing={unitEditing}
          initial={unitInitial}
          onClose={closeUnit}
          onSave={(form) => {
            if (unitEditing) onUpdateUnit(unitEditing, form);
            else onCreateUnit(form);
            closeUnit();
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
