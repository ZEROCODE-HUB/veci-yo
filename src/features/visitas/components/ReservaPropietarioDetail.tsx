import { placasConResponsable } from "../helpers/vehiculos";
import { ReportesAlMinisterio } from "./ReportesAlMinisterio";
import { theme } from "@/config";
import { TIPO_DOCUMENTO } from "@/shared/constants";
import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Badge, Button, Input, Modal } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { Invitado, VisitaItem } from "@/shared/types";
import { urlFotoVisita } from "../services/visitas.repo";
import { estadoDelPaso } from "../helpers/estadoDelPaso";
import { EnlacePrecheckin } from "./EnlacePrecheckin";
import { CuantosVienen } from "./CuantosVienen";
import { VisorDeDocumento } from "./VisorDeDocumento";

const PASOS = [
  { key: "preregistroEnviado", label: "Link de preregistro enviado" },
  { key: "documentacionCompleta", label: "Documentación completada" },
  { key: "terminosAceptados", label: "Términos y Condiciones aceptados" },
  { key: "verificacionPasada", label: "Verificación superada" },
  { key: "trasideEntrada", label: "Ingreso al edificio (TRA/SIRE entrada)" },
  { key: "trasideSalida", label: "Salida del edificio (TRA/SIRE salida)" },
] as const;

/**
 * Los pasos de un **menor**, que no son los de un adulto.
 *
 * Un menor no acepta terminos ni pasa verificacion de antecedentes. No es una
 * opinion: `cerrar_precheckin` excluye a los menores de las dos cosas con un
 * `and not es_menor`, asi que un preregistro cierra sin ninguna de ellas.
 *
 * Y la pantalla las pintaba igual: el cliente termino su registro entero el
 * 09/10/2026, cerro correctamente, y en su propia lista el niño aparecia con
 * «Terminos y Condiciones aceptados» en ambar y un boton «Aprobar por
 * excepcion» al lado. Le estaba pidiendo algo que nadie le pide, y ofreciendo
 * saltarse una regla que no existe.
 *
 * Por quien responde y su autorizacion no van aqui: eso lo pinta la ficha
 * debajo del timeline, con su propio detalle.
 */
const PASOS_MENOR = [
  { key: "preregistroEnviado", label: "Link de preregistro enviado" },
  { key: "documentacionCompleta", label: "Documentación completada" },
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
  /** Corrige cuántas personas vienen y cuántas son menores. */
  onCambiarCuantos: (previstas: number, menores: number) => void;
  cambiandoCuantos?: boolean;
}

export function ReservaPropietarioDetail({
  item,
  onBack,
  onUpdateInvitado,
  onReportTraSire,
  onAcceptTerms,
  onApproveVerification,
  onCambiarCuantos,
  cambiandoCuantos = false,
}: Props) {
  const [documentosInvitado, setDocumentosInvitado] = useState<Invitado | null>(
    null,
  );
  const [hallazgosInvitado, setHallazgosInvitado] = useState<Invitado | null>(
    null,
  );
  /*
    Corregir lo que trae el documento.

    El cliente lo aprobo el 29/09/2026: se puede corregir **hasta que el
    invitado llega**, no despues. Importa porque la porteria compara el
    documento con la persona que tiene delante, y un nombre o un numero mal
    escritos en la invitacion son una entrada denegada en la puerta.

    `actualizarInvitado` llevaba escrita en el repositorio desde el principio y
    ningun control la llamaba --el unico camino que llegaba a ella venia del
    boton de TRA/SIRE, y se perdio al reimplementarlo contra la base--. Punto 46
    de `docs/REVISAR-A-OJO.md`.
  */
  const [correccion, setCorreccion] = useState<{
    nombre: string;
    documento: string;
  } | null>(null);

  const indiceDe = (invitado: Invitado) =>
    (item.invitados || []).findIndex((otro) => otro.uuid === invitado.uuid);

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
        {item.uuid ? (
          <EnlacePrecheckin
            visitaUuid={item.uuid}
            yaEnviado={Boolean(item.invitados?.[0]?.timeline?.preregistroEnviado)}
            cerrado={Boolean(item.invitados?.[0]?.timeline?.precheckinCerrado)}
          />
        ) : null}
        {/*
          Los reportes al ministerio vuelven, donde el KT dice que van: los
          habilita la porteria al marcar la entrada. REVISAR-A-OJO 183.
        */}
        {item.uuid ? (
          <ReportesAlMinisterio
            visitaUuid={item.uuid}
            haEntrado={(item.invitados || []).some((i) => i.llego)}
          />
        ) : null}
        {/*
          Cuantas vienen, y poder corregirlo. Va antes de las fichas porque es
          lo que explica por que hay menos de las que deberia haber: el
          preregistro no se cierra hasta que esten todas.
        */}
        <CuantosVienen
          previstas={item.huespedesPrevistos}
          menores={item.menoresPrevistos}
          registradas={(item.invitados || []).length}
          cerrado={Boolean(item.invitados?.[0]?.timeline?.precheckinCerrado)}
          onGuardar={onCambiarCuantos}
          guardando={cambiandoCuantos}
        />

        {item.tieneVehiculo ? (
          <View className="rounded-xl bg-gray-100 px-3.5 py-3">
            <Text className="text-xs font-semibold text-gray-500 mb-1">
              Vehículos
            </Text>
            <Text className="text-sm font-medium text-gray-900">
              {placasConResponsable(item.vehiculos)}
            </Text>
          </View>
        ) : null}

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
                {documentosInvitado.tipoDocumento
                  ? TIPO_DOCUMENTO[documentosInvitado.tipoDocumento]
                  : "No especificado"}
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

            {documentosInvitado.llego ? (
              <Text className="text-xs text-gray-500">
                Ya registró su ingreso, así que estos datos no se pueden
                corregir: son los que la portería comparó en la puerta.
              </Text>
            ) : correccion ? (
              <View className="gap-3">
                <Input
                  label="Nombre completo"
                  value={correccion.nombre}
                  onChangeText={(valor) =>
                    setCorreccion((previo) =>
                      previo ? { ...previo, nombre: valor } : previo,
                    )
                  }
                />
                <Input
                  label="Número de documento"
                  value={correccion.documento}
                  onChangeText={(valor) =>
                    setCorreccion((previo) =>
                      previo ? { ...previo, documento: valor } : previo,
                    )
                  }
                />
                <Button
                  fullWidth
                  disabled={!correccion.nombre.trim()}
                  onPress={() => {
                    const indice = indiceDe(documentosInvitado);
                    if (indice >= 0) {
                      onUpdateInvitado(indice, {
                        nombre: correccion.nombre.trim(),
                        documentoNumero: correccion.documento.trim(),
                      });
                    }
                    setCorreccion(null);
                    setDocumentosInvitado(null);
                  }}
                >
                  Guardar corrección
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onPress={() => setCorreccion(null)}
                >
                  Cancelar
                </Button>
              </View>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onPress={() =>
                  setCorreccion({
                    nombre: documentosInvitado.nombre,
                    documento: documentosInvitado.documentoNumero ?? "",
                  })
                }
              >
                Corregir estos datos
              </Button>
            )}

            {!correccion && (
              <Button
                variant="ghost"
                fullWidth
                onPress={() => setDocumentosInvitado(null)}
              >
                Cerrar
              </Button>
            )}
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
  /** Dos estados, y por que son dos, en `estadoDelPaso`. */
  const estadoPaso = (key: string) => estadoDelPaso(timeline, key);

  /*
    A un menor no se le piden terminos ni verificacion, asi que no se le
    enseñan: ver un paso pendiente que nadie va a completar nunca se lee como
    un registro a medias.
  */
  const pasos = invitado.esMenor ? PASOS_MENOR : PASOS;

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
        {pasos.map((paso, index) => {
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
                      : theme.colors.borderStrong,
                }}
              />
              {index < pasos.length - 1 && (
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
        {pasos.map((paso) => {
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
                <Text>{aprobado ? "✅" : "⏳"}</Text>
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
                  {paso.key === "terminosAceptados" && invitado.reglasAceptadas
                    ? " · reglas del edificio aceptadas"
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
              {/*
                Aqui ya no se reporta, y los dos botones que habia no
                reportaban: insertaban una fila en `reporte_tra` --una
                anotacion de «esto lo hice yo»-- sin llamar a ninguna funcion
                del ministerio. El de la salida se llamaba ademas «Reportar
                SIRE» y hacia lo mismo que el otro con `movimiento: salida`,
                que no es el SIRE sino la salida del TRA.

                **Reportar es por estancia, no por persona**: `reportar-tra`
                manda al titular a `/one/` y cada acompañante a `/two/`
                llevando el codigo que devolvio el primero. Un boton por
                invitado no encaja con eso. Los de verdad estan arriba, en
                `EnlacePrecheckin`, y ahi si llaman a las funciones y enseñan
                lo que se declararia.

                Lo que si se queda es «Ya hice TRA/SIRE», abajo: esa es la
                anotacion honesta de quien lo hizo por fuera.
              */}
              {(paso.key === "trasideEntrada" || paso.key === "trasideSalida") &&
              (paso.key === "trasideEntrada"
                ? timeline.trasideEntradaSimulada
                : timeline.trasideSalidaSimulada) ? (
                <View
                  className="rounded-full px-2 py-0.5 ml-1"
                  style={{ backgroundColor: theme.colors.secondaryLight }}
                >
                  <Text
                    className="text-2xs font-bold"
                    style={{ color: theme.colors.secondary }}
                  >
                    SIMULADO
                  </Text>
                </View>
              ) : null}
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
  /** Cual se esta mirando a pantalla completa. `null`, ninguna. */
  const [abierta, setAbierta] = useState<number | null>(null);

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
    <>
      <View className="flex-row flex-wrap gap-2">
        {urls.map((url, index) => (
          <Pressable
            key={`${url}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Ver en grande la imagen ${index + 1} del documento`}
            onPress={() => setAbierta(index)}
            style={{ width: "48%" }}
          >
            <Image
              source={{ uri: url }}
              /*
                `contain` y no `cover`: `cover` recorta, y en una cedula
                fotografiada apaisada se come los bordes, que es donde esta el
                numero. De un documento no sobra ningun borde.
              */
              style={{
                width: "100%",
                height: 120,
                borderRadius: 8,
                backgroundColor: theme.colors.borderLight,
              }}
              resizeMode="contain"
              accessibilityLabel={`Imagen ${index + 1} del documento`}
            />
          </Pressable>
        ))}
      </View>
      <Text className="text-xs text-gray-500 mt-1">
        Tocá una para verla en grande.
      </Text>

      <VisorDeDocumento
        urls={urls}
        indice={abierta}
        onCerrar={() => setAbierta(null)}
        onCambiar={setAbierta}
      />
    </>
  );
}
