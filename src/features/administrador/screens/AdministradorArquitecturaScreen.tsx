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

const TABS = ["Condominio", "Torres", "Porterías"];

export function AdministradorArquitecturaScreen() {
  const [tab, setTab] = useState("Condominio");
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const {
    torres,
    unidades,
    depositos,
    porterias,
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
    ? torres.find((tower) => tower.uuid === selectedTowerId) || null
    : null;

  if (selectedTower) {
    const units = unidades.filter(
      (unit) => unit.torreNumero === selectedTower.numero,
    );
    const deposits = depositos.filter(
      (deposit) => deposit.torreNumero === selectedTower.numero,
    );

    return (
      <TorreDetailView
        tower={selectedTower}
        units={units}
        deposits={deposits}
        onBack={() => setSelectedTowerId(null)}
        onCreateUnit={(form) =>
          createUnit({
            torreId: selectedTower.uuid ?? "",
            codigo: form.codigo,
            piso: Number(form.piso) || 1,
          })
        }
        onUpdateUnit={(unit, form) =>
          updateUnit(unit.uuid ?? "", {
            codigo: form.codigo,
            piso: Number(form.piso) || 1,
            estado: form.estado as any,
          })
        }
        onDeleteUnit={(uuid) => deleteUnit(uuid)}
        onCreateDeposit={(form) =>
          createDeposit({
            codigo: form.codigo,
            ubicacion: form.ubicacion,
            torreId: selectedTower.uuid ?? "",
            // El deposito se asigna a una unidad real por uuid, no por codigo.
            unidadId: form.unidadId || undefined,
          })
        }
        onUpdateDeposit={(deposit, form) =>
          updateDeposit(deposit.uuid ?? "", {
            codigo: form.codigo,
            ubicacion: form.ubicacion,
            unidadId: form.unidadId || null,
          })
        }
        onDeleteDeposit={(uuid) => deleteDeposit(uuid)}
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
            towers={torres}
            unidades={unidades}
            onSelect={(tower) => setSelectedTowerId(tower.uuid ?? null)}
            onCreate={(form) => createTower(form)}
            onUpdate={(tower) => updateTower(tower.uuid ?? "", tower)}
            onDelete={(tower) => deleteTower(tower.uuid ?? "")}
          />
        )}
        {tab === "Porterías" && (
          <PorteriasTab
            items={porterias}
            onCreate={(form) =>
              createPorteria({ ...form, tipo: "entrada_principal" })
            }
            onUpdate={(item, form) => updatePorteria(item.uuid ?? "", form)}
            onDelete={(uuid) => deletePorteria(uuid)}
          />
        )}
      </ScrollView>
    </View>
  );
}
