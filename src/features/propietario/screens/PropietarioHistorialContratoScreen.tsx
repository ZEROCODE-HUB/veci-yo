import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Modal } from "@/shared/components";
import { ContratoAltaModal, ContratoCard } from "../components/contratos";
import {
  useHistorialContrato,
  type Contrato,
} from "../hooks/useHistorialContrato";

/**
 * Los contratos de arrendamiento de la vivienda.
 *
 * Llevaba **dos contratos inventados** escritos en este mismo archivo
 * —"Contrato N° 16548", uno "Activa" y otro "Finalizado", con fechas de 2024 y
 * 2025— iguales para cualquier vivienda de cualquier condominio. Debajo, el
 * texto de los términos de arrendamiento, también escrito aquí y **el mismo**
 * que ya vive en la tabla `reglamento`: dos copias del mismo párrafo que
 * podían divergir sin que nadie se enterara.
 *
 * El botón de descarga decía "Descarga existosa" —con la errata— sobre un PDF
 * que no existía en ningún sitio. Se ofrece solo cuando el contrato tiene
 * archivo cargado, que hoy es nunca: no hay pantalla para subirlo, y anunciar
 * una descarga que no ocurre es peor que no ofrecerla.
 */
export function PropietarioHistorialContratoScreen() {
  const {
    contratos,
    cargando,
    terminosGenerales,
    candidatos,
    altaAbierta,
    setAltaAbierta,
    registrar,
    cerrar,
  } = useHistorialContrato();
  const [contratoActivo, setContratoActivo] = useState<Contrato | null>(null);

  const alta = (
    <ContratoAltaModal
      visible={altaAbierta}
      candidatos={candidatos}
      guardando={registrar.isPending}
      onGuardar={(datos) => registrar.mutate(datos)}
      onClose={() => setAltaAbierta(false)}
    />
  );

  if (!cargando && contratos.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 p-6 gap-4">
        <Text className="text-sm text-center text-gray-500">
          Esta vivienda todavía no tiene ningún contrato registrado.
        </Text>
        <Pressable
          onPress={() => setAltaAbierta(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3"
        >
          <Ionicons name="add" size={16} color={theme.colors.primary} />
          <Text
            className="text-sm font-semibold"
            style={{ color: theme.colors.primary }}
          >
            Registrar un contrato
          </Text>
        </Pressable>
        {alta}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      {cargando && (
        <Text className="text-sm text-center text-gray-500">
          Buscando los contratos…
        </Text>
      )}

      {contratos.map((contrato) => (
        <ContratoCard
          key={contrato.id}
          contrato={contrato}
          onPress={() => setContratoActivo(contrato)}
        />
      ))}

      <Pressable
        onPress={() => setAltaAbierta(true)}
        className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3"
      >
        <Ionicons name="add" size={16} color={theme.colors.primary} />
        <Text
          className="text-sm font-semibold"
          style={{ color: theme.colors.primary }}
        >
          Registrar un contrato
        </Text>
      </Pressable>

      {alta}

      <View className="h-6" />

      <Modal
        visible={!!contratoActivo}
        onClose={() => setContratoActivo(null)}
        title={contratoActivo ? `Contrato N°: ${contratoActivo.numero}` : ""}
      >
        {contratoActivo && (
          <View className="flex-col gap-3">
            <View className="flex-row justify-between">
              <Text
                className="text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Fecha inicio: {contratoActivo.fechaInicio}
              </Text>
              <Text
                className="text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Fecha fin: {contratoActivo.fechaFin}
              </Text>
            </View>

            {!!contratoActivo.monto && (
              <Text className="text-sm font-semibold text-gray-900">
                {contratoActivo.monto} de alquiler
              </Text>
            )}

            {/*
              `nestedScrollEnabled`: va dentro del scroll de la pantalla y, sin
              eso, en Android no se desliza y el resto del contrato no se puede
              leer (auditoría de responsividad, 25/10/2026).
            */}
            <ScrollView
              nestedScrollEnabled
              className="rounded-xl p-3 max-h-[300px]"
              style={{ backgroundColor: theme.colors.bgApp }}
            >
              {/* Las cláusulas propias del contrato, si las tiene. */}
              {!!contratoActivo.texto && (
                <Text
                  className="text-sm text-gray-900 mb-3"
                  style={{ lineHeight: 22 }}
                >
                  {contratoActivo.texto}
                </Text>
              )}

              {/* Y los términos generales, que son del condominio. */}
              {terminosGenerales.map((parrafo, indice) => (
                <Text
                  key={`${parrafo}-${indice}`}
                  className="text-sm text-gray-900"
                  style={{ lineHeight: 22 }}
                >
                  {parrafo}
                </Text>
              ))}

              {terminosGenerales.length === 0 && !contratoActivo.texto && (
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Este condominio todavía no tiene cargado su reglamento.
                </Text>
              )}
            </ScrollView>

            {/*
              Un contrato no se podía cerrar: la acción existía y la pantalla
              no la usaba, así que todos quedaban «Activa» para siempre y se
              iban acumulando (13/10/2026).
            */}
            {contratoActivo.estado === "Activa" ? (
              <View className="gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  loading={cerrar.isPending}
                  onPress={() =>
                    cerrar.mutate(
                      { contratoId: contratoActivo.id, estado: "finalizado" },
                      { onSuccess: () => setContratoActivo(null) },
                    )
                  }
                >
                  <Text>Finalizar el contrato</Text>
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={cerrar.isPending}
                  onPress={() =>
                    cerrar.mutate(
                      { contratoId: contratoActivo.id, estado: "cancelado" },
                      { onSuccess: () => setContratoActivo(null) },
                    )
                  }
                >
                  <Text className="text-danger">Cancelarlo: no llegó a empezar</Text>
                </Button>
              </View>
            ) : (
              <Text className="text-xs text-center text-gray-500">
                Este contrato está {contratoActivo.estado.toLowerCase()}.
              </Text>
            )}
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}
