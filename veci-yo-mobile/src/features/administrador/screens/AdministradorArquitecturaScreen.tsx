import { useState } from "react";
import { ScrollView, View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { Tabs } from "@/shared/components";
import type { Torre } from "@/stores/admin-store";
import {
  CondominioTab,
  PorteriasTab,
  TorreDetailView,
  TorresTab,
} from "../components/arquitectura";
import { useAdministradorArquitectura } from "../hooks";
import type { DepositFormValues, UnitFormValues } from "../types";

const TABS = ["Condominio", "Torres", "Porterias"];

export function AdministradorArquitecturaScreen() {
  const [tab, setTab] = useState("Condominio");
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const {
    data,
    createTower,
    updateTower,
    deleteTower,
    createUnit,
    updateUnit,
    deleteUnit,
    createDeposit,
    updateDeposit,
    deleteDeposit,
    createPorteria,
    updatePorteria,
    deletePorteria,
  } = useAdministradorArquitectura();

  const selectedTower = selectedTowerId
    ? data.torres.find((tower) => tower.id === selectedTowerId) || null
    : null;

  if (selectedTower) {
    const units = data.unidades.filter(
      (unit) => unit.torreNumero === selectedTower.numero,
    );
    const deposits = data.depositos.filter(
      (deposit) => deposit.torreNumero === selectedTower.numero,
    );

    return (
      <TorreDetailView
        tower={selectedTower}
        units={units}
        deposits={deposits}
        onBack={() => setSelectedTowerId(null)}
        onCreateUnit={(form) =>
          createUnit.mutate(createUnitPayload(selectedTower, form))
        }
        onUpdateUnit={(unit, form) =>
          updateUnit.mutate({
            ...unit,
            ...createUnitPayload(selectedTower, form),
          })
        }
        onDeleteUnit={(id) => deleteUnit.mutate(id)}
        onCreateDeposit={(form, currentUnits) =>
          createDeposit.mutate(
            createDepositPayload(selectedTower, form, currentUnits),
          )
        }
        onUpdateDeposit={(deposit, form, currentUnits) =>
          updateDeposit.mutate({
            ...deposit,
            ...createDepositPayload(selectedTower, form, currentUnits),
          })
        }
        onDeleteDeposit={(id) => deleteDeposit.mutate(id)}
      />
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Arquitectura" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <Tabs
          tabs={TABS}
          active={tab}
          onChange={(value) => setTab(value || "Condominio")}
        />
        {tab === "Condominio" && <CondominioTab />}
        {tab === "Torres" && (
          <TorresTab
            towers={data.torres}
            onSelect={(tower) => setSelectedTowerId(tower.id)}
            onCreate={(form) => createTower.mutate(form)}
            onUpdate={(tower) => updateTower.mutate(tower)}
            onDelete={(tower) => deleteTower.mutate(tower)}
          />
        )}
        {tab === "Porterias" && (
          <PorteriasTab
            items={data.porterias}
            onCreate={(form) =>
              createPorteria.mutate({ ...form, tipo: "Acceso" })
            }
            onUpdate={(item, form) =>
              updatePorteria.mutate({ ...item, ...form })
            }
            onDelete={(id) => deletePorteria.mutate(id)}
          />
        )}
      </ScrollView>
    </View>
  );
}

function createUnitPayload(tower: Torre, form: UnitFormValues) {
  return {
    codigo: form.codigo,
    torreNumero: tower.numero,
    piso: Number(form.piso) || 1,
    estado: form.estado,
  };
}

function createDepositPayload(
  tower: Torre,
  form: DepositFormValues,
  units: { id: number; codigo: string }[],
) {
  const unit = units.find((item) => String(item.id) === form.unidadId);
  return {
    codigo: form.codigo,
    ubicacion: form.ubicacion,
    unidadId: unit?.id || 0,
    torreNumero: tower.numero,
    departamentoCodigo: unit?.codigo || "",
  };
}
