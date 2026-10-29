import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Cargando, Input, Modal, Select } from "@/shared/components";
import { TIPO_DOCUMENTO } from "@/shared/constants";
import { useLista } from "@/shared/hooks/useLista";
import { formatAmount, formatDateIso, mensajeDeError } from "@/shared/utils";
import type { Database } from "@/shared/types/database.types";
import {
  ajustarDatosDeLaTra,
  reportarALaTra,
  vistaPreviaDeLaTra,
  type ReporteTra,
  type VistaPreviaTra,
} from "../services/precheckin.repo";

type Motivo = Database["public"]["Enums"]["motivo_estancia"];

interface Props {
  visible: boolean;
  visitaUuid: string;
  /** Una sola persona; sin ella, toda la estancia. */
  invitadoUuid?: string;
  onClose: () => void;
  onReportado: (resultado: ReporteTra) => void;
}

interface Ciudades {
  residencia: string;
  procedencia: string;
}


/**
 * Lo que se va a declarar a la TRA, para revisarlo y corregirlo antes de
 * enviar.
 *
 * Decisión del cliente (26/10/2026): la ventana sale **siempre**, no solo
 * cuando falta algo. El costo lo escribe el huésped, y puede haberlo puesto
 * en dólares o en soles: el ministerio lo pide en pesos colombianos, así que
 * quien lo confirma es el anfitrión, que es quien responde por la
 * declaración. Lo corregido se guarda en la estancia antes de reportar, y la
 * función de servidor rechaza un costo que no esté en pesos.
 */
export function ConfirmarTra({ visible, visitaUuid, invitadoUuid, onClose, onReportado }: Props) {
  // Los motivos son la lista `motivos_de_viaje` de la base (28/10/2026).
  const opcionesMotivo = useLista("motivos_de_viaje").opciones.map((o) => ({ value: o.codigo, label: o.etiqueta }));
  const [vista, setVista] = useState<VistaPreviaTra | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [costo, setCosto] = useState("");
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [ciudades, setCiudades] = useState<Record<string, Ciudades>>({});
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  useEffect(() => {
    if (!visible) return;
    let vigente = true;
    setVista(null);
    setErrorCarga("");
    setErrorEnvio("");
    setIntentado(false);
    vistaPreviaDeLaTra(visitaUuid, invitadoUuid)
      .then((v) => {
        if (!vigente) return;
        setVista(v);
        // Un costo en otra moneda no se copia: hay que escribirlo en pesos.
        const enPesos = v.costo !== null && (v.monedaCosto ?? "COP") === "COP";
        setCosto(enPesos ? String(Math.round(v.costo ?? 0)) : "");
        setMotivo((v.motivo as Motivo | null) ?? "turismo");
        setCiudades(
          Object.fromEntries(
            v.personas.map((p) => [
              p.invitadoUuid,
              { residencia: p.ciudadResidencia ?? "", procedencia: p.ciudadProcedencia ?? "" },
            ]),
          ),
        );
      })
      .catch((e) => {
        if (vigente) setErrorCarga(mensajeDeError(e, "No se pudo armar el reporte"));
      });
    return () => {
      vigente = false;
    };
  }, [visible, visitaUuid, invitadoUuid]);

  // Las de quien ya está reportado no se vuelven a mandar, así que no se editan.
  const editables = (vista?.personas ?? []).filter((p) => p.estado !== "enviado");
  const costoVacio = costo.trim() === "";
  const ciudadVacia = (uuid: string, campo: keyof Ciudades) =>
    (ciudades[uuid]?.[campo] ?? "").trim() === "";
  const hayFaltas =
    costoVacio ||
    editables.some((p) => ciudadVacia(p.invitadoUuid, "residencia") || ciudadVacia(p.invitadoUuid, "procedencia"));

  const confirmar = async () => {
    setIntentado(true);
    setErrorEnvio("");
    if (hayFaltas || !vista) return;
    setEnviando(true);
    try {
      await ajustarDatosDeLaTra({
        visitaUuid,
        costo: Number(costo),
        motivo,
        personas: editables.map((p) => ({
          invitadoUuid: p.invitadoUuid,
          ciudadResidencia: ciudades[p.invitadoUuid]?.residencia ?? "",
          ciudadProcedencia: ciudades[p.invitadoUuid]?.procedencia ?? "",
        })),
      });
      const resultado = await reportarALaTra(visitaUuid, invitadoUuid);
      onReportado(resultado);
      onClose();
    } catch (e) {
      setErrorEnvio(mensajeDeError(e, "No se pudo reportar"));
    } finally {
      setEnviando(false);
    }
  };

  const costoEnOtraMoneda =
    vista && vista.costo !== null && vista.monedaCosto && vista.monedaCosto !== "COP";

  return (
    <Modal visible={visible} onClose={onClose} title="Confirma el reporte al ministerio (TRA)">
      {errorCarga ? (
        <Text className="text-sm text-gray-700">{errorCarga}</Text>
      ) : !vista ? (
        <Cargando variante="enLinea" texto="lo que se va a declarar" />
      ) : (
        <View className="gap-4">
          <Text className="text-sm text-gray-700">
            Esto es lo que se va a declarar. Revísalo y corrige lo que haga falta antes de enviarlo.
          </Text>
          {vista.simulado ? (
            <Text className="text-xs text-gray-500">
              Hoy está en simulación: se guarda lo que se declararía, pero no sale nada al ministerio.
            </Text>
          ) : null}

          <View className="gap-1 rounded-xl bg-gray-100 px-3.5 py-3">
            <Text className="text-sm text-gray-900">{vista.nombreEstablecimiento}</Text>
            <Text className="text-xs text-gray-600">
              {`${vista.tipoAcomodacion} · habitación ${vista.numeroHabitacion} · ${formatDateIso(vista.checkIn)} al ${formatDateIso(vista.checkOut)}`}
            </Text>
            <Text className="text-xs text-gray-600">
              {vista.rnt ? `RNT ${vista.rnt}` : "Falta el RNT: ponlo en la configuración de tu renta corta."}
            </Text>
          </View>

          <View className="gap-1">
            <Input
              label="Costo total de la estancia, en pesos colombianos *"
              value={costo}
              onChangeText={setCosto}
              soloCifras
              error={intentado && costoVacio ? "Escribe el costo en pesos colombianos" : undefined}
            />
            {costoEnOtraMoneda ? (
              <Text className="text-xs text-gray-600">
                {`El huésped indicó ${vista.monedaCosto} ${formatAmount(vista.costo ?? 0)}. El ministerio lo pide en pesos colombianos.`}
              </Text>
            ) : null}
          </View>

          <Select
            label="Motivo del viaje"
            value={motivo}
            options={opcionesMotivo}
            onChange={(v) => setMotivo(String(v) as Motivo)}
          />

          {vista.personas.map((p) => (
            <View key={p.invitadoUuid} className="gap-2 border-t border-gray-100 pt-3">
              <Text className="text-sm font-semibold text-gray-900">
                {`${p.nombres} ${p.apellidos ?? ""}`.trim()}
                {p.esTitular ? " · huésped principal" : ""}
              </Text>
              <Text className="text-xs text-gray-600">
                {p.documento
                  ? `${p.tipoDocumento ? TIPO_DOCUMENTO[p.tipoDocumento as keyof typeof TIPO_DOCUMENTO] ?? p.tipoDocumento : "Documento"} ${p.documento}`
                  : "Sin documento"}
              </Text>
              {p.estado === "enviado" ? (
                <Text className="text-xs text-gray-500">Ya está reportado al ministerio.</Text>
              ) : (
                <>
                  <Input
                    label="Ciudad donde vive *"
                    value={ciudades[p.invitadoUuid]?.residencia ?? ""}
                    onChangeText={(t) =>
                      setCiudades((c) => ({ ...c, [p.invitadoUuid]: { ...c[p.invitadoUuid], residencia: t } }))
                    }
                    error={intentado && ciudadVacia(p.invitadoUuid, "residencia") ? "Falta la ciudad" : undefined}
                  />
                  <Input
                    label="Ciudad de donde viene *"
                    value={ciudades[p.invitadoUuid]?.procedencia ?? ""}
                    onChangeText={(t) =>
                      setCiudades((c) => ({ ...c, [p.invitadoUuid]: { ...c[p.invitadoUuid], procedencia: t } }))
                    }
                    error={intentado && ciudadVacia(p.invitadoUuid, "procedencia") ? "Falta la ciudad" : undefined}
                  />
                </>
              )}
            </View>
          ))}

          {/* Lo que falta puede quedar arriba, fuera de la vista: se dice junto al botón. */}
          {intentado && hayFaltas ? (
            <Text className="text-sm text-danger">Falta completar los campos marcados en rojo.</Text>
          ) : null}
          {errorEnvio ? <Text className="text-sm text-danger">{errorEnvio}</Text> : null}

          <View className="gap-2">
            <Button onPress={confirmar} loading={enviando} fullWidth>
              Confirmar y reportar
            </Button>
            <Button variant="secondary" onPress={onClose} disabled={enviando} fullWidth>
              Cancelar
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
