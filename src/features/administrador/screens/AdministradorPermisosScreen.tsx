import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Button,
  InfoButton,
  Modal,
  Toggle,
} from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { StayFields as StayFieldsView, RegulationCard as RegulationCardView } from "../components/permisos";
import { useAdministradorPermisos } from "../hooks/useAdministradorPermisos";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";
import { AdminSectionCard } from "../components";

type StayKey = "estanciaCorta" | "estanciaLarga";
type StayField = keyof EstanciaConfig;

export function AdministradorPermisosScreen() {
  const navigation = useNavigation<any>();
  const { data: permisos, savePermisos } = useAdministradorPermisos();
  const [form, setForm] = useState<PermisoVivienda>(() => ({
    ...permisos,
    diferenciaEstancia: permisos.diferenciaEstancia ?? false,
    estanciaCorta: {
      ...permisos.estanciaCorta,
      estanciaMaxima: permisos.estanciaCorta.estanciaMaxima || "3 dias",
    },
  }));
  const [showSuccess, setShowSuccess] = useState(false);
  const difference = !!form.diferenciaEstancia;
  const setFlag = (
    key: "entregaDirecta" | "huespedesTemporales",
    value: boolean,
  ) => setForm((current) => ({ ...current, [key]: value }));
  const setStay = (key: StayKey, field: StayField, value: string) =>
    setForm((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  const setShortStay = (field: StayField, value: string) =>
    setForm((current) => ({
      ...current,
      estanciaCorta: { ...current.estanciaCorta, [field]: value },
      ...(field === "estanciaMaxima"
        ? { estanciaLarga: { ...current.estanciaLarga, estanciaMinima: value } }
        : {}),
    }));
  const save = () => {
    savePermisos(form);
    setShowSuccess(true);
  };
  const openRegulations = (tipo: string) =>
    navigation.navigate("ReglaDetalle", { tipo });

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Editar permisos viviendas" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">
            Correspondencia
          </Text>
          <AdminSectionCard>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center gap-1">
                <Text className="text-base font-semibold text-gray-900">
                  Permitir entrega directa en vivienda
                </Text>
                <InfoButton
                  titulo="Entrega directa en vivienda"
                  descripcion="Si esta activo, el repartidor puede subir directamente al departamento a entregar. Si esta desactivado, el residente debe bajar a porteria a recibir."
                  size={16}
                />
              </View>
              <Toggle
                value={form.entregaDirecta}
                onChange={(value) => setFlag("entregaDirecta", value)}
              />
            </View>
          </AdminSectionCard>
        </View>
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">
            Huespedes Temporales
          </Text>
          <AdminSectionCard>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-base font-semibold text-gray-900">
                Habilitar funcionalidad de renta corta
              </Text>
              <Toggle
                value={form.huespedesTemporales}
                onChange={(value) => setFlag("huespedesTemporales", value)}
              />
            </View>
          </AdminSectionCard>
        </View>
        <AdminSectionCard>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-base font-semibold text-gray-900">
              ¿Su edificio diferencia estancia corta de estancia larga?
            </Text>
            <Toggle
              value={difference}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  diferenciaEstancia: value,
                }))
              }
            />
          </View>
          <Text className="text-xs text-gray-400 leading-5">
            Este edificio adapta privilegios para las estadias de corta y larga
            estancia.
          </Text>
        </AdminSectionCard>
        {!difference && (
          <AdminSectionCard title="Configuracion de estancia">
            <StayFieldsView
              values={form.estanciaCorta}
              onChange={(field, value) => setShortStay(field, value)}
            />
          </AdminSectionCard>
        )}
        {difference && (
          <>
            <AdminSectionCard title="Estancia corta">
              <StayFieldsView
                values={form.estanciaCorta}
                onChange={(field, value) => setShortStay(field, value)}
                includeMaximum
                maximumValue={form.estanciaCorta.estanciaMaxima}
              />
            </AdminSectionCard>
            <AdminSectionCard title="Estancia larga">
              <StayFieldsView
                values={form.estanciaLarga}
                onChange={(field, value) =>
                  setStay("estanciaLarga", field, value)
                }
                showMinimumHint
              />
            </AdminSectionCard>
          </>
        )}
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">Reglamentos</Text>
          <Text className="text-xs text-gray-500 leading-5">
            Administra los reglamentos para cada tipo de residente.
          </Text>
          <View className="flex-row gap-3">
            <RegulationCardView
              image={require("@/assets/icons/reglas/residente-permanente-1.png")}
              label="Residente Permanente"
              onPress={() => openRegulations("residente-permanente")}
            />
            <RegulationCardView
              image={require("@/assets/icons/reglas/residente-temporal-1.png")}
              label="Huesped Temporal"
              onPress={() => openRegulations("huesped-temporal")}
            />
            <RegulationCardView
              image={require("@/assets/icons/reglas/guardia-seguridad-1.png")}
              label="Guardia de Seguridad"
              onPress={() => openRegulations("guardia-seguridad")}
            />
          </View>
        </View>
        <Button fullWidth onPress={save}>
          Guardar
        </Button>
      </ScrollView>
      <Modal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Editar Permisos"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center">
            Sus permisos se guardaron con exito
          </Text>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => setShowSuccess(false)}
          >
            Entendido
          </Button>
        </View>
      </Modal>
    </View>
  );
}
