import { useEffect, useState } from "react";
import { useParametros } from "@/shared/hooks";
import { ScrollView, View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { SegunLaCarga, Tabs } from "@/shared/components";
import {
  CondominioTab,
  EstacionamientosTab,
  PorteriasTab,
  TorreDetailView,
  TorresTab,
} from "../components/arquitectura";
import { useAdministradorArquitectura } from "../hooks";
import { leerIndiceDeVotacion } from "../helpers/indiceDeVotacion";

// «Estacionamientos»: los niveles del edificio (16/11/2026).
const TABS = ["Condominio", "Torres", "Estacionamientos", "Porterías"];

export function AdministradorArquitecturaScreen() {
  /*
    La lista «Tu edificio, paso a paso» del inicio abre directamente en la
    pestaña del paso (16/11/2026). Una que no exista se ignora.
  */
  const pestana = useParametros("AdministradorArquitectura")?.pestana;
  const [tab, setTab] = useState(pestana && TABS.includes(pestana) ? pestana : "Condominio");
  useEffect(() => {
    if (pestana && TABS.includes(pestana)) setTab(pestana);
  }, [pestana]);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const {
    torres,
    unidades,
    estacionamientos,
    depositos,
    porterias,
    niveles,
    estado,
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
    createGaritas,
    createNiveles,
    updateNivel,
    deleteNivel,
  } = useAdministradorArquitectura();
  const codigosDelEdificio = estacionamientos.map((e) => e.codigo);

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
            tipologiaId: form.tipologiaId || undefined,
            indiceVotacion: leerIndiceDeVotacion(form.indiceVotacion),
          })
        }
        onUpdateUnit={(unit, form) =>
          updateUnit(unit.uuid ?? "", {
            codigo: form.codigo,
            piso: Number(form.piso) || 1,
            estado: form.estado,
            tipologiaId: form.tipologiaId || null,
            indiceVotacion: leerIndiceDeVotacion(form.indiceVotacion),
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
        niveles={niveles}
        codigosDelEdificio={codigosDelEdificio}
        onCreateParking={(form) =>
          createEstacionamiento({
            codigo: form.codigo,
            tipo: form.tipo,
            nivelId: form.nivelId,
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
            nivelId: form.nivelId,
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
        {/*
          Torres y porterías esperan a la lista: antes salían en blanco
          mientras cargaba, y en blanco para siempre si fallaba (13/11/2026).
        */}
        {tab === "Torres" && (
          <SegunLaCarga estado={estado} texto="las torres" forma="tarjetas" enLinea>
          <TorresTab
            towers={torres}
            unidades={unidades}
            estacionamientos={estacionamientos}
            onSelect={(tower) => setSelectedTowerId(tower.uuid ?? null)}
            onCreate={(form, construccion) => createTower(form, construccion)}
            onUpdate={(tower) => updateTower(tower.uuid ?? "", tower)}
            onDelete={(tower) => deleteTower(tower.uuid ?? "")}
          />
          </SegunLaCarga>
        )}
        {tab === "Estacionamientos" && (
          <SegunLaCarga estado={estado} texto="los niveles" forma="filas" enLinea>
          <EstacionamientosTab
            niveles={niveles}
            estacionamientos={estacionamientos}
            torres={torres}
            onCreate={(datos) => createNiveles(datos)}
            onUpdate={(uuid, datos) => updateNivel(uuid, datos)}
            onDelete={(uuid) => deleteNivel(uuid)}
          />
          </SegunLaCarga>
        )}
        {tab === "Porterías" && (
          <SegunLaCarga estado={estado} texto="las porterías" forma="filas" enLinea>
          <PorteriasTab
            items={porterias}
            torres={torres}
            onCrearGaritas={(garitas) => createGaritas(garitas)}
            // El tipo lo elige quien da de alta la porteria. Estaba escrito a
            // fuego aqui, asi que un edificio con garaje no podia registrar su
            // acceso vehicular.
            onCreate={(form) => createPorteria(form)}
            onUpdate={(item, form) => updatePorteria(item.uuid ?? "", form)}
            onDelete={(uuid) => deletePorteria(uuid)}
          />
          </SegunLaCarga>
        )}
      </ScrollView>
    </View>
  );
}
