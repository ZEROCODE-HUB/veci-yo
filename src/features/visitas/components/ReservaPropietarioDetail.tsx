import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Badge, Button, Modal } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { Invitado, VisitaItem } from "@/shared/types";
import { urlFotoVisita } from "../services/visitas.repo";
import { EnlacePrecheckin } from "./EnlacePrecheckin";

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
  /** El reporte ante la autoridad; lo escribe la base, no el estado local. */
  onReportTraSire: (
    invitadoUuid: string,
    movimiento: "entrada" | "salida",
  ) => void;
  /** Marca los términos como aprobados por excepción del anfitrión. */
  onAcceptTerms: (invitadoUuid: string) => void;
  /** Ejecuta la verificación de antecedentes; `conHallazgos` la anota. */
  onApproveVerification: (invitadoUuid: string, conHallazgos: boolean) => void;
}

export function ReservaPropietarioDetail({
  item,
  onBack,
  /*
    Ningun control lo llama todavia: `actualizarInvitado` esta escrita en el
    repositorio --corregir el nombre o el documento de un invitado antes de que
    llegue-- y falta el boton. Se queda declarado porque quitarlo alejaria la
    cadena un eslabon mas del control que falta. Punto 46 de
    `docs/REVISAR-A-OJO.md`.
  */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateInvitado,
  onReportTraSire,
  onAcceptTerms,
  onApproveVerification,
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

        {/*
          Lo primero de la pantalla, porque es lo primero del flujo: sin este
          enlace el huesped no puede hacer nada, y hasta ahora no existia.
          El timeline de abajo daba el paso por hecho con un `true` cableado.
        */}
        {item.uuid && (
          <EnlacePrecheckin
            visitaUuid={item.uuid}
            yaEnviado={Boolean(item.invitados?.[0]?.timeline?.preregistroEnviado)}
            cerrado={Boolean(item.invitados?.[0]?.timeline?.precheckinCerrado)}
          />
        )}
        {(item.invitados || []).map((invitado, index) => (
          <InvitadoReservaCard
            key={`${invitado.nombre}-${index}`}
            invitado={invitado}
            onShowDocumentos={() => setDocumentosInvitado(invitado)}
            onShowHallazgos={() => setHallazgosInvitado(invitado)}
            /*
              Los tres escribían en el estado local: la excepción de los
              términos y la verificación se perdían al recargar, y con la
              excepción se perdía el registro de quién la había asumido, que
              es lo único que le da dueño.
            */
            onAcceptTerms={() => onAcceptTerms(invitado.uuid ?? "")}
            onApproveVerification={() =>
              onApproveVerification(invitado.uuid ?? "", false)
            }
            onApproveWithFindings={() =>
              onApproveVerification(invitado.uuid ?? "", true)
            }
            onReportTraSire={(movimiento) =>
              onReportTraSire(invitado.uuid ?? "", movimiento)
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
                {/*
                  La imagen, no un icono. El titulo decia «Imagenes del
                  documento» y debajo salia un recuadro gris con un icono de
                  fichero y el nombre del archivo, **teniendo la ruta ahi
                  mismo** --se usaba para la etiqueta--. La pantalla del
                  guardia, con el mismo dato, si la pintaba.

                  El cliente decidio el 25/09/2026 que el anfitrion si la ve
                  (R-3): responde por su huesped ante el edificio, asi que
                  puede contrastar quien llega.
                */}
                <ImagenesDelDocumento rutas={documentosInvitado.documentos ?? []} />
              </View>
            )}

            <View className="rounded-xl bg-gray-100 px-3.5 py-3">
              <Text className="text-xs font-semibold text-gray-500 mb-2">
                Datos extraídos automáticamente
              </Text>
              <View className="gap-2">
                <DatoDocumento
                  label="Nombre completo"
                  value={documentosInvitado.nombre}
                />
                <DatoDocumento
                  label="Número de documento"
                  value={documentosInvitado.documentoNumero || "N/A"}
                />
                <DatoDocumento
                  label="Fecha de nacimiento"
                  value={documentosInvitado.fechaNacimiento || "N/A"}
                />
              </View>
            </View>

            <Button
              variant="ghost"
              fullWidth
              onPress={() => setDocumentosInvitado(null)}
            >
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
  onReportTraSire: (movimiento: "entrada" | "salida") => void;
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
          ? { borderLeftWidth: 4, borderLeftColor: theme.colors.primary }
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
          /*
            El mismo hecho estaba leido de dos sitios: aqui de `timeline` y en
            la etiqueta de abajo de `invitado.terminosAprobadoPor`. El
            repositorio rellena los dos con el mismo valor, asi que hoy
            coinciden; el dia que uno cambie, el punto del timeline y su texto
            diran cosas distintas sobre la misma persona. Se lee del campo con
            tipo, que es el que la pantalla tiene garantizado.
          */
          const manual =
            paso.key === "terminosAceptados" &&
            invitado.terminosAprobadoPor === "anfitrion";
          return (
            <View key={paso.key} className="flex-row items-center flex-1">
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    estado === "aprobado"
                      ? manual
                        ? theme.colors.secondary
                        : theme.colors.success
                      : estado === "rechazado"
                        ? theme.colors.danger
                        : theme.colors.borderStrong,
                }}
              />
              {index < PASOS.length - 1 && (
                <View
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor:
                      estado === "aprobado"
                        ? theme.colors.success
                        : theme.colors.border,
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
                <Text
                  className="text-xs text-gray-900 flex-1"
                  numberOfLines={3}
                >
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
                  color={theme.colors.primary}
                  onPress={onShowDocumentos}
                />
              )}
              {/*
                  Se ofrece cuando los términos **no** están aceptados, que es
                  cuando hace falta la excepción. La condición miraba
                  `terminosExcepcion`, o sea que solo aparecía si la excepción
                  ya estaba marcada: no había forma de marcarla.
              */}
              {paso.key === "terminosAceptados" && !aprobado && (
                <SmallAction
                  label="Aprobar por excepción"
                  color={theme.colors.primary}
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
                      color={theme.colors.warning}
                      onPress={onShowHallazgos}
                    />
                  )}
                  <SmallAction
                    label="Aprobar"
                    color={theme.colors.success}
                    onPress={onApproveVerification}
                  />
                  <SmallAction
                    label="Aprobar con hallazgos"
                    color={theme.colors.warning}
                    onPress={onApproveWithFindings}
                  />
                </View>
              )}
              {/*
                  Se ofrece cuando **se puede** reportar, no cuando ya se
                  reportó. La condición miraba `aprobado`, que con el timeline
                  real solo es cierto después del reporte: el botón no habría
                  aparecido nunca.

                  Y se ofrece según lo que el KT manda: la entrada, cuando la
                  portería ha confirmado el ingreso; la salida, cuando la
                  salida está registrada. La base lo vuelve a comprobar.
              */}
              {paso.key === "trasideEntrada" && invitado.llego && !aprobado && (
                <SmallAction
                  label="Reportar TRA"
                  color={theme.colors.secondary}
                  onPress={() => onReportTraSire("entrada")}
                />
              )}
              {paso.key === "trasideSalida" &&
                !!invitado.horaSalida &&
                !aprobado && (
                  <SmallAction
                    label="Reportar SIRE"
                    color={theme.colors.secondary}
                    onPress={() => onReportTraSire("salida")}
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
          {!invitado.traSireReported && invitado.llego && (
            <SmallAction
              label="Ya hice TRA/SIRE"
              color={theme.colors.textSecondary}
              onPress={() => onReportTraSire("entrada")}
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
  color = theme.colors.secondary,
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

/**
 * Las fotos del documento, con su URL firmada.
 *
 * El bucket es privado: la ruta sola no sirve, hace falta pedir una URL
 * temporal. Es el mismo patron que ya usa `PhotoPicker` en la pantalla del
 * guardia.
 */
function ImagenesDelDocumento({ rutas }: { rutas: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [fallo, setFallo] = useState(false);

  /*
    La clave del contenido, en su propia variable.

    `rutas` es un array nuevo en cada render, asi que ponerlo en las
    dependencias pediria las URL firmadas otra vez cada vez que el padre se
    repinta. Se compara por contenido; extraerlo a una variable es ademas lo
    que el linter pide para poder comprobarlo.
  */
  const clave = rutas.join("|");

  useEffect(() => {
    let vigente = true;
    if (rutas.length === 0) {
      setUrls([]);
      return;
    }
    Promise.all(rutas.map((ruta) => urlFotoVisita(ruta)))
      .then((firmadas) => {
        if (vigente) setUrls(firmadas);
      })
      .catch(() => {
        // Se dice, en vez de dejar un hueco: una foto que no carga y un
        // documento que nadie subio se ven igual, y no son lo mismo.
        if (vigente) setFallo(true);
      });
    return () => {
      vigente = false;
    };
    // `rutas` se mira por `clave`: ver arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  if (fallo) {
    return (
      <Text className="text-xs text-gray-500">
        No se pudieron cargar las imágenes.
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {urls.map((url, index) => (
        <Image
          key={`${url}-${index}`}
          source={{ uri: url }}
          style={{ width: "48%", minHeight: 120, borderRadius: 8 }}
          resizeMode="cover"
          accessibilityLabel={`Imagen ${index + 1} del documento`}
        />
      ))}
    </View>
  );
}
