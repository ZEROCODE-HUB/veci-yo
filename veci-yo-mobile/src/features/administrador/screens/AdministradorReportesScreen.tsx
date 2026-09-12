import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Calendar, Modal, Toggle } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useAdminStore, useAuthStore, useUIStore } from "@/stores";
import { ReporteSelector } from "../components/reportes";
import { useAdministradorReportes } from "../hooks/useAdministradorReportes";

const REPORTS = [
  { id: "visitantes", label: "Visitantes y vehículos", icon: "👥" },
  { id: "correspondencia", label: "Correspondencia", icon: "📮" },
  { id: "areas-comunes", label: "Áreas comunes", icon: "🏗️" },
] as const;

type Report = (typeof REPORTS)[number];

function formatDate(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resetDates() {
  return { from: null as Date | null, to: null as Date | null };
}

export function AdministradorReportesScreen() {
  const usuario = useAuthStore((state) => state.usuario);
  const coadministradores = useAdminStore((state) => state.coadministradores);
  const addToast = useUIStore((state) => state.addToast);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [allHistory, setAllHistory] = useState(false);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"from" | "to" | null>(null);
  const [automatic, setAutomatic] = useState(false);
  const [showAutomatic, setShowAutomatic] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { generateReport: requestReport, generating } = useAdministradorReportes();

  const adminEmail = usuario?.correo || "admin@veciyo.com";
  const coadminEmails = coadministradores
    .map((item) => item.correo || item.email)
    .filter(Boolean) as string[];

  const resetReport = () => {
    setShowSuccess(false);
    setSelectedReport(null);
    setAllHistory(false);
    const dates = resetDates();
    setFrom(dates.from);
    setTo(dates.to);
  };

  const generateReport = () => {
    if (!selectedReport) return;
    if (!allHistory && (!from || !to)) {
      addToast(
        'Debes seleccionar un rango de fechas o marcar "Todo el historial"',
        "info",
      );
      return;
    }
    requestReport(
      { reporteId: selectedReport.id, desde: formatDate(from), hasta: formatDate(to), todoHistorial: allHistory },
      { onSuccess: () => setShowSuccess(true) },
    );
  };

  const activateAutomatic = () => {
    setAutomatic(true);
    setShowAutomatic(false);
    addToast(
      "Envío automático mensual activado. Se enviará el día 30/31 de cada mes.",
      "success",
    );
  };

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Reportes" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        {!selectedReport ? (
          <>
            <Text className="text-base text-center text-gray-500">
              Seleccioná el reporte que querés generar
            </Text>
            <ReporteSelector reportes={REPORTS} onSelect={(id) => setSelectedReport(REPORTS.find((report) => report.id === id) || null)} />
            <View
              className="rounded-2xl bg-white p-5 gap-3"
              style={{
                elevation: 2,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 7,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text className="text-base font-bold text-center text-gray-900">
                Envío automático mensual
              </Text>
              <Text className="text-sm leading-5 text-center text-gray-500">
                Al activarlo, el día 30/31 de cada mes se enviarán
                automáticamente los 3 reportes consolidados al correo del
                Administrador y de los Coadministradores.
              </Text>
              {automatic ? (
                <View className="rounded-xl bg-green-50 p-3">
                  <Text className="text-sm text-center text-green-800">
                    ✅ Envío automático mensual activado
                  </Text>
                </View>
              ) : (
                <Button fullWidth onPress={() => setShowAutomatic(true)}>
                  Activar envío automático mensual
                </Button>
              )}
            </View>
          </>
        ) : (
          <View className="gap-4">
            <Pressable
              onPress={resetReport}
              className="flex-row items-center gap-1 self-start"
            >
              <Ionicons name="arrow-back" size={18} color="#F5B800" />
              <Text className="text-sm text-primary">Volver</Text>
            </Pressable>
            <View className="items-center rounded-2xl bg-white p-5 gap-2">
              <Text className="text-4xl">{selectedReport.icon}</Text>
              <Text className="text-base font-bold text-gray-900">
                {selectedReport.label}
              </Text>
            </View>
            <View className="rounded-2xl bg-white p-5 gap-4">
              <Text className="text-sm font-semibold text-center text-gray-900">
                Rango de fechas
              </Text>
              <Toggle
                value={allHistory}
                onChange={setAllHistory}
                label="Todo el historial"
              />
              {!allHistory && (
                <View className="gap-3">
                  <Pressable
                    onPress={() => setPicker("from")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <Text
                      className={`text-sm ${from ? "text-gray-900" : "text-gray-500"}`}
                    >
                      {from ? formatDate(from) : "Desde"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPicker("to")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <Text
                      className={`text-sm ${to ? "text-gray-900" : "text-gray-500"}`}
                    >
                      {to ? formatDate(to) : "Hasta"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
            <View className="rounded-2xl bg-white p-4 gap-2">
              <Text className="text-sm text-center text-gray-500">
                El reporte se enviará a:
              </Text>
              <Text className="text-sm font-medium text-center text-gray-900">
                {adminEmail}
              </Text>
              {coadminEmails.length > 0 && (
                <Text className="text-xs text-center text-gray-400">
                  CC: {coadminEmails.join(", ")}
                </Text>
              )}
            </View>
            <Button fullWidth disabled={generating} onPress={generateReport}>
              {generating
                ? "Generando reporte..."
                : "Generar y enviar por correo"}
            </Button>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!picker}
        onClose={() => setPicker(null)}
        title={picker === "from" ? "Fecha desde" : "Fecha hasta"}
      >
        <Calendar
          selected={picker === "from" ? from : to}
          onSelect={(date) => {
            if (picker === "from") setFrom(date);
            if (picker === "to") setTo(date);
            setPicker(null);
          }}
        />
      </Modal>
      <Modal
        visible={showSuccess}
        onClose={resetReport}
        title="Reporte generado"
      >
        <View className="items-center gap-4">
          <Text className="text-5xl">✅</Text>
          <Text className="text-base leading-6 text-center text-gray-900">
            El reporte de{" "}
            <Text className="font-bold">{selectedReport?.label}</Text> fue
            generado y enviado a <Text className="font-bold">{adminEmail}</Text>
            {coadminEmails.length > 0
              ? ` con copia a ${coadminEmails.length} coadministrador(es)`
              : ""}
            .
          </Text>
          <Text className="text-sm text-center text-gray-500">
            {allHistory
              ? "Historial completo"
              : `Período: ${formatDate(from)} a ${formatDate(to)}`}
          </Text>
          <Button fullWidth onPress={resetReport}>
            Aceptar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={showAutomatic}
        onClose={() => setShowAutomatic(false)}
        title="Envío automático mensual"
      >
        <View className="items-center gap-4">
          <Text className="text-4xl">📅</Text>
          <Text className="text-base leading-6 text-center text-gray-900">
            Se enviarán automáticamente los 3 reportes consolidados el día 30/31
            de cada mes a las 12:00 a.m.
          </Text>
          <View className="w-full rounded-xl bg-gray-50 p-3">
            <Text className="text-xs leading-5 text-center text-gray-500">
              Destinatarios: <Text className="font-bold">{adminEmail}</Text>
              {coadminEmails.length > 0 ? `, ${coadminEmails.join(", ")}` : ""}
            </Text>
          </View>
          <Button fullWidth onPress={activateAutomatic}>
            Activar
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => setShowAutomatic(false)}
          >
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
