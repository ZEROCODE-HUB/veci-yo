import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useAuthStore } from "@/stores";
import {
  DirectorioAdminPagos,
  DirectorioAdminTabs,
  DirectorioDepartamentoCard,
  DirectorioDepositoCard,
  DirectorioDetalleModal,
  DirectorioEstacionamientoCard,
  DirectorioFiltros,
} from "../components";
import { useDirectorio } from "../hooks/useDirectorio";
import type { DirectorioDetalle } from "../types/directorio";

/*
  Un deposito sin vivienda asignada no tiene a quien llamar. Se dice, en vez de
  ensenar los contactos de otra: es el mismo criterio que `SIN_ASIGNAR` en el
  hook, donde los tres contactos fijos de «Carlos Gomez» y compania salian en
  todas las unidades.
*/
const SIN_CONTACTOS = {
  administrador: { nombre: "Sin asignar", telefono: "" },
  anfitrion: { nombre: "Sin asignar", telefono: "" },
  propietario: { nombre: "Sin asignar", telefono: "" },
};

export function DirectorioPropiedadesScreen() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const {
    unidades,
    tipologias,
    torres,
    depositosPorUnidad,
    search,
    setSearch,
    torreFiltro,
    setTorreFiltro,
    subTab,
    setSubTab,
    filtered,
    filteredEst,
    filteredDep,
    contactosFor,
  } = useDirectorio();
  const [tab, setTab] = useState<"directorio" | "pagos">("directorio");
  const [detalle, setDetalle] = useState<DirectorioDetalle | null>(null);
  const esAdmin = rolActivo === "administrador";
  /*
    Solo para saber si hay algo que pintar. Cada pestana se pinta con **su**
    lista mas abajo: antes habia una sola `list` con las tres mezcladas y un
    ternario dentro del `map`, asi que el tipo del elemento era la union de los
    tres y cada tarjeta lo recibia con `any`.
  */
  const cuantos =
    subTab === "departamentos"
      ? filtered.length
      : subTab === "estacionamientos"
        ? filteredEst.length
        : filteredDep.length;
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {esAdmin && <DirectorioAdminTabs tab={tab} onChange={setTab} />}
        {esAdmin && tab === "pagos" ? (
          <DirectorioAdminPagos
            unidades={unidades}
            propietarioDe={(u) => contactosFor(u).propietario.nombre}
          />
        ) : (
          <>
            <DirectorioFiltros
              search={search}
              onSearch={setSearch}
              torre={torreFiltro}
              torres={torres}
              onTorre={setTorreFiltro}
              subTab={subTab}
              onSubTab={setSubTab}
            />
            <View style={{ gap: 12 }}>
              {subTab === "departamentos" &&
                filtered.map((item) => (
                  <DirectorioDepartamentoCard
                    key={String(item.id)}
                    item={item}
                    tipologias={tipologias}
                    contactos={contactosFor(item)}
                    depositos={depositosPorUnidad.get(String(item.id)) ?? 0}
                    onPress={() =>
                      setDetalle({
                        tipo: "departamento",
                        datos: item,
                        contactos: contactosFor(item),
                      })
                    }
                  />
                ))}
              {subTab === "estacionamientos" &&
                filteredEst.map((item) => (
                  <DirectorioEstacionamientoCard
                    key={String(item.id)}
                    item={item}
                    onPress={() =>
                      setDetalle({
                        tipo: "estacionamiento",
                        datos: item,
                        contactos: item.contactos,
                      })
                    }
                  />
                ))}
              {subTab === "depositos" &&
                filteredDep.map((item) => (
                  <DirectorioDepositoCard
                    key={String(item.id)}
                    item={item}
                    onPress={() =>
                      setDetalle({
                        tipo: "deposito",
                        datos: item,
                        contactos:
                          item.contactos ??
                          (item.unidad
                            ? contactosFor(item.unidad)
                            : SIN_CONTACTOS),
                      })
                    }
                  />
                ))}
              {cuantos === 0 && (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <Text className="text-gray-400 text-sm">Sin resultados</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
      <DirectorioDetalleModal
        detalle={detalle}
        onClose={() => setDetalle(null)}
        onCall={(phone) => Linking.openURL(`tel:${phone}`)}
      />
    </View>
  );
}
