import React, { useLayoutEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, InfoButton } from "@/shared/components";
import { HELP } from "@/shared/content/helpContent";
import { useNavigation } from "@react-navigation/native";
import { useReglas } from "../hooks/useReglas";
import {
  ReglaAccionesModal,
  ReglaCumplimientoModal,
  ReglaDepartamentoCard,
  ReglaFiltros,
  ReglaTipoCard,
} from "../components/reglas";
import {
  reglasDepartamentosFiltro,
  reglasPisos,
  reglasTorres,
} from "../reglasMockData";

const iconResidentePermanente = require("@/assets/icons/reglas/residente-permanente-1.png");
const iconResidenteTemporal = require("@/assets/icons/reglas/residente-temporal-1.png");
const iconGuardia = require("@/assets/icons/reglas/guardia-seguridad-1.png");

export function ReglasScreen() {
  const navigation = useNavigation<any>();
  const reglas = useReglas();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <InfoButton
          titulo={HELP.reglas.info.titulo}
          descripcion={HELP.reglas.info.descripcion}
          bullets={HELP.reglas.info.bullets}
          ejemplo={HELP.reglas.info.ejemplo}
        />
      ),
    });
  }, [navigation]);

  return (
    <View className="flex-1 bg-bg-app">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
        <View className={`gap-3 ${reglas.isTemporaryGuest ? "" : "flex-row"}`}>
          {!reglas.isTemporaryGuest && (
            <View className="flex-1">
              <ReglaTipoCard
                icon={iconResidentePermanente}
                label="Residente Permanente"
                onPress={() =>
                  navigation.navigate("ReglaDetalle", {
                    tipo: "residente-permanente",
                  })
                }
              />
            </View>
          )}
          <View className="flex-1">
            <ReglaTipoCard
              icon={iconResidenteTemporal}
              label="Huésped Temporal"
              onPress={() =>
                navigation.navigate("ReglaDetalle", {
                  tipo: "huesped-temporal",
                })
              }
            />
          </View>
          {!reglas.isTemporaryGuest && (
            <View className="flex-1">
              <ReglaTipoCard
                icon={iconGuardia}
                label="Guardia de Seguridad"
                onPress={() =>
                  navigation.navigate("ReglaDetalle", {
                    tipo: "guardia-seguridad",
                  })
                }
              />
            </View>
          )}
        </View>
        {!reglas.isTemporaryGuest && (
          <>
            <ReglaFiltros
              open={reglas.filterOpen}
              search={reglas.search}
              onSearch={reglas.setSearch}
              onToggle={() => reglas.setFilterOpen((open) => !open)}
              tower={reglas.tower}
              department={reglas.department}
              floor={reglas.floor}
              onTower={reglas.setTower}
              onDepartment={reglas.setDepartment}
              onFloor={reglas.setFloor}
              torres={reglasTorres}
              departamentos={reglasDepartamentosFiltro}
              pisos={reglasPisos}
            />
            <Text className="py-1 text-sm text-center text-gray-500">
              Lista de departamentos habilitados para renta corta
            </Text>
            {(reglas.role === "propietario" ||
              reglas.role === "inquilino-lider") && (
              <View className="gap-1.5">
                <Button
                  variant="blue"
                  fullWidth
                  onPress={() => navigation.navigate("ReclamoNuevo")}
                >
                  Crear PQRS
                </Button>
                <Text className="text-xs leading-4 text-center text-gray-500">
                  Este botón permite crear un reporte o solicitud de Pregunta,
                  Queja, Reclamo o Solicitud (PQRS).
                </Text>
              </View>
            )}
          </>
        )}
        {!reglas.isTemporaryGuest &&
          reglas.filtered.map((item) => (
            <ReglaDepartamentoCard
              key={item.id}
              departamento={item}
              onActions={() => reglas.setActionsDepartment(item)}
              onCompliance={() => reglas.setComplianceDepartment(item)}
            />
          ))}
        <View className="h-6" />
      </ScrollView>
      <ReglaAccionesModal
        departamento={reglas.actionsDepartment}
        puedeLlamar={reglas.canCallDepartmentContacts}
        onClose={() => reglas.setActionsDepartment(null)}
        onCall={reglas.callContact}
        onReport={() => {
          const nombre = reglas.actionsDepartment?.departamento || "";
          reglas.setActionsDepartment(null);
          navigation.navigate("ReclamoNuevo", {
            tituloPreseleccionado: nombre,
            departamentoDenunciado: nombre,
          });
        }}
      />
      <ReglaCumplimientoModal
        departamento={reglas.complianceDepartment}
        onClose={() => reglas.setComplianceDepartment(null)}
      />
    </View>
  );
}
