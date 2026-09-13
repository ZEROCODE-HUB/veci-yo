import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Modal } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { Invitado, VisitaItem } from "@/shared/types";

const PASOS = [
  { key: "preregistroEnviado", label: "Link de preregistro enviado" },
  { key: "documentacionCompleta", label: "Documentación completada" },
  { key: "terminosAceptados", label: "Términos y Condiciones aceptados" },
  { key: "verificacionPasada", label: "Verificación superada" },
  { key: "trasideEntrada", label: "Ingreso al edificio (TRA/SIRE entrada)" },
  { key: "trasideSalida", label: "Salida del edificio (TRA/SIRE salida)" },
] as const;

interface Props {
  item: VisitaItem;
  onBack: () => void;
  onUpdateInvitado: (index: number, patch: Partial<Invitado>) => void;
}

export function ReservaPropietarioDetail({
  item,
  onBack,
  onUpdateInvitado,
}: Props) {
  const [documentosInvitado, setDocumentosInvitado] = useState<Invitado | null>(
    null,
  );
  const [hallazgosInvitado, setHallazgosInvitado] = useState<Invitado | null>(
    null,
  );

  return (
    <ScreenLayout withScroll padding={false}>
      <View className="px-4 pb-6 gap-3">
        <Pressable onPress={onBack} className="py-2 self-start">
          <Text className="text-sm font-semibold text-primary">
            ← Volver a visitas
          </Text>
        </Pressable>
        {(item.invitados || []).map((invitado, index) => (
          <InvitadoReservaCard
            key={`${invitado.nombre}-${index}`}
            invitado={invitado}
            onShowDocumentos={() => setDocumentosInvitado(invitado)}
            onShowHallazgos={() => setHallazgosInvitado(invitado)}
            onAcceptTerms={() =>
              onUpdateInvitado(index, {
                terminosAprobadoPor: "anfitrion",
                timeline: { ...invitado.timeline, terminosAceptados: true },
              })
            }
            onApproveVerification={() =>
              onUpdateInvitado(index, {
                timeline: { ...invitado.timeline, verificacionAprobada: true },
              })
            }
            onApproveWithFindings={() =>
              onUpdateInvitado(index, {
                timeline: {
                  ...invitado.timeline,
                  verificacionAprobada: true,
                  verificacionHallazgos: true,
                },
              })
            }
            onReportTraSire={() =>
              onUpdateInvitado(index, { traSireReported: true })
            }
          />
        ))}
      </View>

      <Modal
        visible={!!documentosInvitado}
        onClose={() => setDocumentosInvitado(null)}
        title={`Documentación de ${documentosInvitado?.nombre || ""}`}
      >
        {documentosInvitado && (
          <View className="gap-4">
            <View className="rounded-xl bg-gray-100 px-3.5 py-3">
              <Text className="text-xs font-semibold text-gray-500 mb-1">
                Tipo de documento
              </Text>
              <Text className="text-sm font-medium text-gray-900">
                {documentosInvitado.tipoDocumento || "No especificado"}
              </Text>
            </View>

            {(documentosInvitado.documentos?.length || 0) > 0 && (
              <View>
                <Text className="text-xs font-semibold text-gray-500 mb-2">
                  Imágenes del documento
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {documentosInvitado.documentos?.map((documento, index) => (
                    <View
                      key={`${documento}-${index}`}
                      className="rounded-lg items-center justify-center p-2"
                      style={{
                        width: "48%",
                        minHeight: 100,
                        backgroundColor: "#C5CAE9",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Ionicons name="document-outline" size={24} color="#6B7280" />
                      <Text className="text-[9px] text-gray-500 text-center mt-1">
                        {etiquetaDocumento(documento)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View className="rounded-xl bg-gray-100 px-3.5 py-3">
              <Text className="text-xs font-semibold text-gray-500 mb-2">
                Datos extraídos automáticamente
              </Text>
              <View className="gap-2">
                <DatoDocumento label="Nombre completo" value={documentosInvitado.nombre} />
                <DatoDocumento label="Número de documento" value={documentosInvitado.documentoNumero || "N/A"} />
                <DatoDocumento label="Fecha de nacimiento" value={documentosInvitado.fechaNacimiento || "N/A"} />
              </View>
            </View>

            <Button variant="ghost" fullWidth onPress={() => setDocumentosInvitado(null)}>
              Cerrar
            </Button>
          </View>
        )}
      </Modal>

      <Modal
        visible={!!hallazgosInvitado}
        onClose={() => setHallazgosInvitado(null)}
        title="Resumen de verificación"
      >
        <View className="gap-3">
          <Text className="text-base font-semibold text-gray-900">
            {hallazgosInvitado?.nombre}
          </Text>
          <View className="rounded-xl bg-amber-100 p-3">
            <Text className="text-sm text-amber-900">
              <Text className="font-bold">Hallazgos detectados: </Text>
              El documento no coincide con el registro en base de datos. Se
              recomienda verificar físicamente el documento presentado.
            </Text>
          </View>
          <Button onPress={() => setHallazgosInvitado(null)}>Cerrar</Button>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function InvitadoReservaCard({
  invitado,
  onShowDocumentos,
  onShowHallazgos,
  onAcceptTerms,
  onApproveVerification,
  onApproveWithFindings,
  onReportTraSire,
}: {
  invitado: Invitado;
  onShowDocumentos: () => void;
  onShowHallazgos: () => void;
  onAcceptTerms: () => void;
  onApproveVerification: () => void;
  onApproveWithFindings: () => void;
  onReportTraSire: () => void;
}) {
  const timeline = invitado.timeline || {};
  const estadoPaso = (key: string) => {
    if (key === "terminosAceptados") {
      if (timeline.terminosAceptados === true) return "aprobado";
      if (timeline.terminosAceptados === false) return "rechazado";
      return "pendiente";
    }
    if (key === "verificacionPasada")
      return timeline.verificacionAprobada === true || !!timeline[key]
        ? "aprobado"
        : "pendiente";
    return timeline[key] ? "aprobado" : "pendiente";
  };

  return (
    <View
      className="rounded-2xl bg-white p-3.5 shadow-sm"
      style={
        invitado.esMenor
          ? { borderLeftWidth: 4, borderLeftColor: "#F5B800" }
          : undefined
      }
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-base font-semibold text-gray-900 flex-1">
          {invitado.nombre}
        </Text>
        {invitado.esMenor && (
          <View className="rounded-full bg-amber-100 px-2 py-0.5">
            <Text className="text-2xs font-bold text-amber-800">👶 Menor</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center mb-1">
        {PASOS.map((paso, index) => {
          const estado = estadoPaso(paso.key);
          const manual =
            paso.key === "terminosAceptados" &&
            timeline.terminosAprobadoPor === "anfitrion";
          return (
            <View key={paso.key} className="flex-row items-center flex-1">
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    estado === "aprobado"
                      ? manual
                        ? "#2563EB"
                        : "#16A34A"
                      : estado === "rechazado"
                        ? "#EF4444"
                        : "#D1D5DB",
                }}
              />
              {index < PASOS.length - 1 && (
                <View
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor:
                      estado === "aprobado" ? "#16A34A" : "#E5E7EB",
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      <View className="gap-2 mt-2 pt-2.5 border-t border-gray-200">
        {PASOS.map((paso) => {
          const estado = estadoPaso(paso.key);
          const aprobado = estado === "aprobado";
          const tieneDocumentos =
            paso.key === "documentacionCompleta" &&
            (invitado.documentos?.length || 0) > 0;
          const puedeAprobarVerificacion =
            paso.key === "verificacionPasada" && !timeline.verificacionAprobada;
          return (
            <View
              key={paso.key}
              className={
                paso.key === "verificacionPasada"
                  ? "gap-2"
                  : "flex-row items-center gap-2 flex-wrap"
              }
            >
              <View className="flex-row items-center gap-2">
                <Text>
                  {aprobado ? "✅" : estado === "rechazado" ? "❌" : "⏳"}
                </Text>
                <Text className="text-xs text-gray-900 flex-1" numberOfLines={3}>
                  {paso.label}
                  {paso.key === "terminosAceptados" &&
                  invitado.terminosAprobadoPor === "anfitrion"
                    ? " (aprobado por anfitrión)"
                    : ""}
                  {paso.key === "verificacionPasada" &&
                  timeline.verificacionAprobada
                    ? " (aprobada)"
                    : ""}
                </Text>
              </View>
              {tieneDocumentos && (
                <SmallAction
                  label="Ver documentación"
                  color="#F5B800"
                  onPress={onShowDocumentos}
                />
              )}
              {paso.key === "terminosAceptados" &&
                invitado.terminosExcepcion &&
                !aprobado && (
                  <SmallAction
                    label="Aceptar excepción"
                    color="#F5B800"
                    onPress={onAcceptTerms}
                  />
                )}
              {puedeAprobarVerificacion && (
                <View className="flex-row items-center gap-1.5 flex-wrap ml-6">
                  <Text className="text-2xs font-semibold text-gray-500">
                    {timeline.verificacionHallazgos === true
                      ? "Con hallazgos"
                      : timeline.verificacionHallazgos === false
                        ? "Sin hallazgos"
                        : "Sin resultados"}
                  </Text>
                  {timeline.verificacionHallazgos === true && (
                    <SmallAction
                      label="Ver resumen"
                      color="#F59E0B"
                      onPress={onShowHallazgos}
                    />
                  )}
                  <SmallAction
                    label="Aprobar"
                    color="#16A34A"
                    onPress={onApproveVerification}
                  />
                  <SmallAction
                    label="Aprobar con hallazgos"
                    color="#F59E0B"
                    onPress={onApproveWithFindings}
                  />
                </View>
              )}
              {(paso.key === "trasideEntrada" ||
                paso.key === "trasideSalida") &&
                aprobado &&
                !invitado.traSireReported && (
                  <SmallAction
                    label={
                      paso.key === "trasideEntrada"
                        ? "Reportar TRA"
                        : "Reportar SIRE"
                    }
                    color="#2563EB"
                    onPress={onReportTraSire}
                  />
                )}
            </View>
          );
        })}
        <View className="flex-row items-center gap-2 mt-1 pt-2 border-t border-gray-200 flex-wrap">
          <Badge status={invitado.traSireReported ? "Aceptado" : "Pendiente"}>
            {invitado.traSireReported
              ? "TRA/SIRE reportado"
              : "TRA/SIRE pendiente"}
          </Badge>
          {!invitado.traSireReported && (
            <SmallAction
              label="Ya hice TRA/SIRE"
              color="#6B7280"
              onPress={onReportTraSire}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function SmallAction({
  label,
  onPress,
  color = "#2563EB",
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-md px-2.5 py-1"
      style={{ backgroundColor: color }}
    >
      <Text className="text-2xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function etiquetaDocumento(documento: string): string {
  const etiquetas: Record<string, string> = {
    "cedula-anverso": "Cédula (anverso)",
    "cedula-reverso": "Cédula (reverso)",
    pasaporte: "Pasaporte",
    tutela: "Tutela",
  };
  return etiquetas[documento] || documento;
}

function DatoDocumento({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-xs text-gray-500 flex-1">{label}</Text>
      <Text className="text-sm font-medium text-gray-900 text-right flex-1">
        {value}
      </Text>
    </View>
  );
}
