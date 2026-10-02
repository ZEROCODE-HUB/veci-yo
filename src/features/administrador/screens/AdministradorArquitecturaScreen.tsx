import { useState } from "react";
import { ScrollView, View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { Tabs } from "@/shared/components";
import {
  CondominioTab,
  PorteriasTab,
  TorreDetailView,
  TorresTab,
} from "../components/arquitectura";
import { useAdministradorArquitectura } from "../hooks";

const TABS = ["Condominio", "Torres", "Porterías"];

export function AdministradorArquitecturaScreen() {
  const [tab, setTab] = useState("Condominio");
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const {
    torres,
    unidades,
    estacionamientos,
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
    createEstacionamiento,
    updateEstacionamiento,
    deleteEstacionamiento,
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
    const parkings = estacionamientos.filter(
      (parking) => parking.torreNumero === selectedTower.numero,
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
            estado: form.estado,
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
        parkings={parkings}
        onCreateParking={(form) =>
          createEstacionamiento({
            codigo: form.codigo,
            tipo: form.tipo,
            ubicacion: form.ubicacion,
            torreId: selectedTower.uuid ?? "",
            // Una cochera de visita no es de nadie: el formulario solo pide el
            // departamento cuando es privada.
            unidadId: form.tipo === "privado" ? form.unidadId || undefined : undefined,
          })
        }
        onUpdateParking={(parking, form) =>
          updateEstacionamiento(parking.uuid, {
            codigo: form.codigo,
            tipo: form.tipo,
            ubicacion: form.ubicacion,
            unidadId: form.tipo === "privado" ? form.unidadId || null : null,
          })
        }
        onDeleteParking={(uuid) => deleteEstacionamiento(uuid)}
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
            estacionamientos={estacionamientos}
            onSelect={(tower) => setSelectedTowerId(tower.uuid ?? null)}
            onCreate={(form) => createTower(form)}
            onUpdate={(tower) => updateTower(tower.uuid ?? "", tower)}
            onDelete={(tower) => deleteTower(tower.uuid ?? "")}
          />
        )}
        {tab === "Porterías" && (
          <PorteriasTab
            items={porterias}
            // El tipo lo elige quien da de alta la porteria. Estaba escrito a
            // fuego aqui, asi que un edificio con garaje no podia registrar su
            // acceso vehicular.
            onCreate={(form) => createPorteria(form)}
            onUpdate={(item, form) => updatePorteria(item.uuid ?? "", form)}
            onDelete={(uuid) => deletePorteria(uuid)}
          />
        )}
      </ScrollView>
    </View>
  );
}
