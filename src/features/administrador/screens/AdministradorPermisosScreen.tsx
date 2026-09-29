import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  InfoButton,
  Input,
  Modal,
  Select,
  Toggle,
} from "@/shared/components";
import { useUnidadesDisponibles, useNavegacion } from "@/shared/hooks";
import { PageHeader } from "@/shared/layouts";
import { StayFields as StayFieldsView, RegulationCard as RegulationCardView } from "../components/permisos";
import { useAdministradorPermisos } from "../hooks/useAdministradorPermisos";
import { useVerificacionDeDocumento } from "../hooks/useVerificacionDeDocumento";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";
import { AdminSectionCard } from "../components";

type StayKey = "estanciaCorta" | "estanciaLarga";

/** Lo que significa la opción vacía del selector. */
const TODO_EL_EDIFICIO = "";

export function AdministradorPermisosScreen() {
  const navigation = useNavegacion();
  /*
    Qué se está configurando: la regla del edificio, o la excepción de una
    vivienda. Las dos cosas existían en la tabla y en la base desde el
    principio --`permisos_de_unidad` combina campo a campo-- y la pantalla
    solo sabía la primera (R-34).
  */
  const [unidadId, setUnidadId] = useState<string>(TODO_EL_EDIFICIO);
  const { unidades } = useUnidadesDisponibles();
  const documento = useVerificacionDeDocumento();
  const { data: permisos, savePermisos } = useAdministradorPermisos(
    unidadId || undefined,
  );
  /*
    Sin inventar nada: se toma lo que venga. Aqui habia un
    `estanciaMaxima ?? 3` que volvia a meter el tope de tres dias que se
    quito de `PERMISOS_INICIALES` justo por eso --le decia al propietario que
    su edificio limita las estancias a tres noches cuando nadie lo ha dicho--.
    Era el mismo valor inventado, en el segundo sitio.
  */
  const [form, setForm] = useState<PermisoVivienda>(() => ({
    ...permisos,
    diferenciaEstancia: permisos.diferenciaEstancia ?? false,
  }));
  const [showSuccess, setShowSuccess] = useState(false);
  const difference = !!form.diferenciaEstancia;
  const setFlag = (
    key: "entregaDirecta" | "huespedesTemporales",
    value: boolean,
  ) => setForm((current) => ({ ...current, [key]: value }));
  const setStay = <C extends keyof EstanciaConfig>(
    key: StayKey,
    field: C,
    value: EstanciaConfig[C],
  ) =>
    setForm((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));

  /**
   * La estancia maxima de la corta es la minima de la larga: donde termina
   * una empieza la otra. Por eso cambiar la primera arrastra la segunda.
   */
  const setShortStay = <C extends keyof EstanciaConfig>(
    field: C,
    value: EstanciaConfig[C],
  ) =>
    setForm((current) => ({
      ...current,
      estanciaCorta: { ...current.estanciaCorta, [field]: value },
      ...(field === "estanciaMaxima" && typeof value === "number"
        ? { estanciaLarga: { ...current.estanciaLarga, estanciaMinima: value } }
        : {}),
    }));
  const save = () => {
    // El aviso de exito espera a que el guardado termine. Antes aparecia de
    // inmediato y, si fallaba, se veia el exito y el error a la vez.
    savePermisos(form, { onSuccess: () => setShowSuccess(true) });
  };
  const openRegulations = (tipo: string) =>
    navigation.navigate("ReglaDetalle", { tipo });

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Editar permisos viviendas" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        <AdminSectionCard>
          <Select
            label="Qué se está configurando"
            value={unidadId}
            onChange={(valor) =>
              setUnidadId(String(valor ?? TODO_EL_EDIFICIO))
            }
            options={[
              { value: TODO_EL_EDIFICIO, label: "Todo el edificio" },
              ...unidades.map((u) => ({
                value: u.unidadId,
                label: `Vivienda ${u.codigo}`,
              })),
            ]}
          />
          <Text className="mt-2 text-sm leading-5 text-gray-500">
            {unidadId
              ? "Lo que dejes sin tocar sigue la regla del edificio: una excepción se combina campo a campo, no reemplaza el resto."
              : "La regla general. Cada vivienda puede tener su excepción."}
          </Text>
        </AdminSectionCard>
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">Visitas</Text>
          <AdminSectionCard>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center gap-1">
                <Text className="text-base font-semibold text-gray-900">
                  La portería verifica el documento
                </Text>
                <InfoButton
                  titulo="Verificación del documento"
                  descripcion="Si está activo, la portería compara el documento del invitado con la persona que tiene delante antes de dejarla entrar. Si se desactiva, no lo pide, y entonces el tipo y el número que el residente escribió al invitar no se usan para nada."
                  size={16}
                />
              </View>
              <Toggle
                value={documento.verificar}
                onChange={documento.setVerificar}
                disabled={documento.guardando}
                accessibilityLabel="La portería verifica el documento"
              />
            </View>
          </AdminSectionCard>
        </View>
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
                accessibilityLabel="Permitir entrega directa en vivienda"
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
                accessibilityLabel="Habilitar funcionalidad de renta corta"
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
              accessibilityLabel="Diferenciar estancia corta de estancia larga"
            />
          </View>
          <Text className="text-xs text-gray-400 leading-5">
            Este edificio adapta privilegios para las estadias de corta y larga
            estancia.
          </Text>
          {/*
            Donde esta la frontera. Sin este numero, los dos bloques de reglas
            de abajo estaban ahi y nada podia elegir entre ellos: es lo que
            pidio el cliente --«menos de 1 mes mas limitantes; mas, ya son casi
            residentes»-- y lo que faltaba para que `corta_permite_visitas`
            sirviera de algo.

            Solo se pregunta si el edificio diferencia: si no, no hay dos lados
            que separar.
          */}
          {difference && (
            <View className="mt-3 gap-1">
              <Input
                label="Hasta cuántas noches cuenta como estancia corta"
                type="numeric"
                placeholder="30"
                value={
                  form.cortaHastaNoches == null
                    ? ""
                    : String(form.cortaHastaNoches)
                }
                onChangeText={(texto) => {
                  const soloDigitos = texto.replace(/[^0-9]/g, "");
                  setForm((current) => ({
                    ...current,
                    cortaHastaNoches: soloDigitos ? Number(soloDigitos) : null,
                  }));
                }}
              />
              <Text className="text-xs text-gray-400 leading-5">
                {form.cortaHastaNoches
                  ? `Hasta ${form.cortaHastaNoches} noches se aplican las reglas de estancia corta; a partir de ${form.cortaHastaNoches + 1}, las de larga.`
                  : "Mientras no lo digas, todas las estancias se tratan como cortas, que es lo más restrictivo."}
              </Text>
            </View>
          )}
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
              />
            </AdminSectionCard>
            <AdminSectionCard title="Estancia larga">
              <StayFieldsView
                values={form.estanciaLarga}
                onChange={(field, value) =>
                  setStay("estanciaLarga", field, value)
                }
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
