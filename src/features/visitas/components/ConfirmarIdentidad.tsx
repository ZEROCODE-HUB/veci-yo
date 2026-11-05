import { theme } from "@/config";
import React, { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, Cargando } from "@/shared/components";
import { ErrorBoundary } from "@/shared/components/ui/ErrorBoundary";
import { anotarEnLaBase, anotarError, anotarYEsperar } from "@/shared/services/erroresDeLaApp";
import { mensajeDeError } from "@/shared/utils";
import { compararDocumento, diagnosticoDeLaComparacion } from "../helpers/compararDocumento";
import { coincideLaMrz, compararCodigo, mrzDelTexto } from "../helpers/leerCodigoDelDocumento";
import { leerTextoDelDocumento } from "../services/leerTextoDelDocumento";
import { olvidarFoto } from "../services/porteriaArchivo";
import { CamaraDelDocumento } from "./CamaraDelDocumento";
import { DocumentoNoCoincide } from "./DocumentoNoCoincide";
import { MarcaDeAgua } from "./MarcaDeAgua";

/** Por qué camino coincidió un escaneo; la base lo guarda tal cual. */
export type FormaDeEscaneo = "codigo" | "mrz" | "numero" | "nombre";

interface Props {
  nombre: string;
  /** Las fotos del documento que subió en su preregistro, ya firmadas. */
  fotosGuardadas: string[];
  cargando: boolean;
  /** Quién mira y cuándo: va encima de las fotos del preregistro. */
  marcaDeAgua: string;
  /** Lo registrado en el preregistro, con lo que se compara lo leído. */
  ficha: { numero?: string | null; nombre?: string | null; apellidos?: string | null };
  /** Lo leído coincide: se valida en la base. Devuelve si quedó validado. */
  onCoincide: (forma: FormaDeEscaneo) => Promise<boolean>;
  /**
   * No coincide y el guardia lo aprueba igual, con advertencia y su motivo:
   * queda quién lo aprobó y por qué (26/10 y 05/11/2026). Sin esto no se ofrece.
   */
  onAprobarAMano?: (motivo: string) => Promise<boolean>;
}

type Paso = "persona" | "escaneo" | "listo" | "no_es";

/** Debajo de esto, la foto apenas tenía texto: estaba lejos, oscura o movida. */
const POCO_TEXTO = 40;

/** Cuántas lecturas se suman: el frente y el reverso. */
const LADOS = 2;

const QUE_COINCIDIO: Record<FormaDeEscaneo, string> = {
  codigo: "el código de barras del documento trae el número registrado",
  mrz: "la zona de lectura del documento trae el número registrado",
  numero: "el número del documento coincide con el registrado",
  nombre: "el nombre del documento coincide con el registrado",
};

/**
 * Los dos primeros pasos del registro de entrada de un huésped.
 *
 * 1. **¿Es la misma persona?** Sale la foto del documento que subió en su
 *    preregistro, con una marca de agua que dice qué guardia la está mirando y
 *    cuándo (el cliente, 23/10/2026). Si no es, no entra y ya.
 * 2. **Escanear el documento físico**, por tres caminos, del más fiable al
 *    menos (05/11/2026):
 *      · el código de barras del reverso, leído en vivo sin pulsar nada;
 *      · la zona MRZ («<<<») del texto de la foto;
 *      · el texto de la foto: el número, o un nombre y un apellido (hueco 2:
 *        «no lo hagas muy estricto»).
 *    La foto no se guarda ni se sube: el texto se lee dentro del teléfono, y
 *    la foto se borra en cuanto se leyó.
 *
 * Si no coincide sale un error con dos salidas: volver a escanear (se suman
 * las dos últimas lecturas, por si el número está al otro lado) o aprobar a
 * mano, con una advertencia, quedando quién y por qué (el cliente, 26/10/2026).
 *
 * Cada paso deja un rastro en `error_de_la_app`, sin datos de la persona, y si
 * la cámara revienta se ofrece seguir en vez de dejar la pantalla en blanco.
 */
export function ConfirmarIdentidad({
  nombre,
  fotosGuardadas,
  cargando,
  marcaDeAgua,
  ficha,
  onCoincide,
  onAprobarAMano,
}: Props) {
  const [paso, setPaso] = useState<Paso>("persona");
  /** Lo leído de cada foto, la más reciente al final. */
  const [lecturas, setLecturas] = useState<string[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [resultado, setResultado] = useState<FormaDeEscaneo | "sin_coincidencia" | null>(null);
  const [aviso, setAviso] = useState("");
  /** Por qué no coincidió, cuando no es simplemente «no está». */
  const [motivoDelFallo, setMotivoDelFallo] = useState("");
  const [aprobadoAMano, setAprobadoAMano] = useState(false);
  /** Cada código se mira una vez: la cámara lo entrega muchas veces por segundo. */
  const codigosVistos = useRef(new Set<string>());
  const validando = useRef(false);

  /** Lo leído coincide: la base lo anota. Una sola vez aunque lleguen dos. */
  const validar = async (forma: FormaDeEscaneo) => {
    if (validando.current) return;
    validando.current = true;
    try {
      setResultado(forma);
      if (await onCoincide(forma)) {
        setPaso("listo");
        return;
      }
      setMotivoDelFallo("Coincide, pero la base no lo dio por validado. Vuelve a escanear o apruébalo a mano.");
      setResultado("sin_coincidencia");
    } catch (e) {
      anotarError("escaneo: anotar la verificación", e);
      setMotivoDelFallo(mensajeDeError(e, "Coincide, pero no se pudo anotar. Vuelve a intentarlo."));
      setResultado("sin_coincidencia");
    } finally {
      validando.current = false;
    }
  };

  const leerCodigo = (tipo: string, data: string) => {
    if (validando.current || paso !== "escaneo" || codigosVistos.current.has(data)) return;
    codigosVistos.current.add(data);
    const comparado = compararCodigo(tipo, data, ficha);
    // Sin el contenido: es un documento de identidad.
    anotarEnLaBase("rastro", `escaneo: código ${comparado}`, `${tipo}, ${data.length} caracteres`);
    if (comparado === "coincide") {
      void validar("codigo");
    } else if (comparado === "otro_numero") {
      setAviso(
        `El código del reverso trae otro número: no es el documento que registró ${nombre}. Compruébalo antes de dejarle entrar.`,
      );
    }
  };

  const leerFoto = async (uri: string) => {
    setAviso("");
    setLeyendo(true);
    try {
      // Esperado, y de paso deja que la pantalla se repinte antes de leer.
      await anotarYEsperar("escaneo: leyendo", uri.slice(-80));
      const lectura = await Promise.race([
        leerTextoDelDocumento(uri),
        new Promise<string>((_, rechazar) =>
          setTimeout(
            () => rechazar(new Error("La lectura tardó demasiado. Vuelve a escanear o apruébalo a mano.")),
            20_000,
          ),
        ),
      ]);
      const largo = lectura.trim().length;
      anotarEnLaBase("rastro", "escaneo: leído", `${largo} caracteres`);
      const ultimas = [...lecturas, lectura].slice(-LADOS);
      setLecturas((antes) => [...antes, lectura]);
      const texto = ultimas.join("\n");

      const mrz = mrzDelTexto(texto);
      if (mrz && coincideLaMrz(mrz, ficha)) {
        await validar("mrz");
        return;
      }
      const coincide = compararDocumento(texto, ficha);
      if (coincide) {
        await validar(coincide);
        return;
      }
      // Cuántas cifras y palabras casaron, sin datos de la persona (225).
      anotarEnLaBase(
        "rastro",
        "escaneo: no coincide",
        `${diagnosticoDeLaComparacion(texto, ficha)}${mrz ? "; con MRZ" : ""}`,
      );
      setMotivoDelFallo(
        largo === 0
          ? "No se leyó ningún texto en la foto. Pon el documento dentro del marco, de cerca y con buena luz."
          : largo < POCO_TEXTO
          ? "Se leyó muy poco texto: el documento estaba lejos, oscuro o movido. Acércalo hasta que llene el marco, enciende la linterna si hace falta y evita los reflejos."
          : "",
      );
      setResultado("sin_coincidencia");
    } catch (e) {
      anotarError("escaneo: leer el documento", e);
      // Con sus salidas --volver a escanear, aprobar a mano--, no solo un aviso.
      setMotivoDelFallo(mensajeDeError(e, "No se pudo leer el documento."));
      setResultado("sin_coincidencia");
    } finally {
      // La foto de un documento ajeno no se queda en el teléfono de la portería.
      olvidarFoto(uri);
      setLeyendo(false);
    }
  };

  if (paso === "no_es") {
    return (
      <View className="gap-3 rounded-xl p-3" style={{ backgroundColor: theme.colors.badgeRedBg }}>
        <Text className="text-sm font-bold" style={{ color: theme.colors.badgeRedText }}>
          No es la misma persona: no la dejes entrar.
        </Text>
        <Button variant="secondary" fullWidth onPress={() => setPaso("persona")}>
          Volver a comprobar
        </Button>
      </View>
    );
  }

  if (paso === "listo") {
    return (
      <Text className="text-xs font-semibold text-green-700">
        {aprobadoAMano || resultado === null || resultado === "sin_coincidencia"
          ? "✓ Aprobado a mano. Quedó anotado que lo aprobaste tú, y por qué."
          : `✓ Misma persona, y ${QUE_COINCIDIO[resultado]}. Validado.`}
      </Text>
    );
  }

  const veces = lecturas.length;

  return (
    <View className="gap-3">
      {paso === "persona" ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-gray-500">1. ¿ES LA MISMA PERSONA?</Text>
          <Text className="text-sm text-gray-700">
            Este es el documento que subió <Text className="font-bold">{nombre}</Text> en su
            preregistro. Compáralo con quien tienes delante.
          </Text>
          {cargando ? (
            <Cargando texto="el documento" variante="enLinea" />
          ) : (
            <FilaDeFotos
              urls={fotosGuardadas}
              vacio="No subió fotos de su documento."
              marcaDeAgua={marcaDeAgua}
            />
          )}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button fullWidth onPress={() => setPaso("escaneo")}>
                Sí, es la misma
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="danger" fullWidth onPress={() => setPaso("no_es")}>
                No es
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-gray-500">2. ESCANEA SU DOCUMENTO</Text>
          <Text className="text-sm text-gray-700">
            Empieza por el reverso: si tiene código de barras, se lee solo. Si no, pon el documento
            dentro del marco y pulsa Escanear. La foto no se guarda ni se sube.
          </Text>
          {/*
            Sin miniatura de lo escaneado: no se guarda, y dibujar la foto
            entera pesaba en el celular (QA 23/10/2026).
          */}
          <Text className="text-xs text-gray-500">
            {veces === 0
              ? "Todavía no has escaneado."
              : veces === 1
                ? "Escaneaste un lado."
                : veces === LADOS
                  ? "Escaneaste los dos lados."
                  : `Escaneaste ${veces} veces: se comparan las dos últimas.`}
          </Text>
          {resultado === "sin_coincidencia" && !leyendo ? (
            <DocumentoNoCoincide
              nombre={nombre}
              motivo={motivoDelFallo || `En lo escaneado no está el número ni el nombre que registró ${nombre}.`}
              onVolverAEscanear={() => {
                setMotivoDelFallo("");
                setResultado(null);
              }}
              onAprobarAMano={
                onAprobarAMano
                  ? async (motivo) => {
                      try {
                        if (await onAprobarAMano(motivo)) {
                          setAprobadoAMano(true);
                          setPaso("listo");
                        }
                      } catch (e) {
                        setAviso(mensajeDeError(e, "No se pudo aprobar a mano."));
                      }
                    }
                  : undefined
              }
            />
          ) : (
            <ErrorBoundary
              donde="escaneo del documento"
              alFallar={(reintentar) => (
                <View className="gap-2">
                  <Text className="text-xs text-red-600 text-center">
                    La cámara falló. Ya quedó anotado para revisarlo.
                  </Text>
                  <Button variant="secondary" fullWidth onPress={reintentar}>
                    Volver a intentarlo
                  </Button>
                </View>
              )}
            >
              <CamaraDelDocumento
                etiqueta={
                  veces === 0
                    ? "📷 Escanear el documento"
                    : veces === 1
                      ? "📷 Escanear el otro lado"
                      : "📷 Escanear otra vez"
                }
                ocupado={leyendo}
                onFoto={leerFoto}
                onError={setAviso}
                onCodigo={leerCodigo}
              />
            </ErrorBoundary>
          )}
          {leyendo ? (
            <Text className="text-xs text-gray-500 text-center">Leyendo el documento…</Text>
          ) : null}
        </View>
      )}
      {aviso ? <Text className="text-xs text-red-600 text-center">{aviso}</Text> : null}
    </View>
  );
}

function FilaDeFotos({
  urls,
  vacio,
  marcaDeAgua,
}: {
  urls: string[];
  vacio: string;
  marcaDeAgua?: string;
}) {
  if (urls.length === 0) {
    return <Text className="text-xs text-gray-400">{vacio}</Text>;
  }
  return (
    <View className="flex-row gap-2">
      {urls.map((url) => (
        <View
          key={url}
          style={{ flex: 1, height: 110, borderRadius: 8, overflow: "hidden", backgroundColor: theme.colors.borderLight }}
        >
          <Image
            source={{ uri: url }}
            accessibilityLabel="Foto del documento"
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
          {marcaDeAgua ? <MarcaDeAgua texto={marcaDeAgua} /> : null}
        </View>
      ))}
    </View>
  );
}
