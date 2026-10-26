import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, Cargando } from "@/shared/components";
import { ErrorBoundary } from "@/shared/components/ui/ErrorBoundary";
import { anotarEnLaBase, anotarError } from "@/shared/services/erroresDeLaApp";
import { mensajeDeError } from "@/shared/utils";
import { compararDocumento, type Coincidencia } from "../helpers/compararDocumento";
import { leerTextoDelDocumento } from "../services/leerTextoDelDocumento";
import { CamaraDelDocumento } from "./CamaraDelDocumento";
import { DocumentoNoCoincide } from "./DocumentoNoCoincide";
import { MarcaDeAgua } from "./MarcaDeAgua";

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
  onCoincide: () => Promise<boolean>;
  /** No se pudo leer o no coincide: el guardia sigue con el número a mano. */
  onAMano: () => void;
  /**
   * No coincide y el guardia lo aprueba igual, con advertencia: queda quién
   * lo aprobó (26/10/2026). Sin esto no se ofrece.
   */
  onAprobarAMano?: () => Promise<boolean>;
}

type Paso = "persona" | "escaneo" | "listo" | "no_es";

/**
 * Los dos primeros pasos del registro de entrada de un huésped.
 *
 * 1. **¿Es la misma persona?** Sale la foto del documento que subió en su
 *    preregistro, con una marca de agua que dice qué guardia la está mirando y
 *    cuándo (el cliente, 23/10/2026). Si no es, no entra y ya.
 * 2. **Escanear el documento físico.** El celular lee su texto y lo compara con
 *    lo registrado: si coincide el número, o el nombre y los apellidos, queda
 *    validado (hueco 2: «no lo hagas muy estricto»). La foto no se guarda ni
 *    se sube: el texto se lee dentro del teléfono.
 *
 * Si no coincide sale un error con dos salidas: volver a escanear (lo leído se
 * acumula, por si el número está al otro lado) o aprobar a mano, con una
 * advertencia y quedando quién lo aprobó (el cliente, 26/10/2026). Escribir el
 * número a mano, que compara la base, sigue a mano siempre.
 *
 * Cada paso del escaneo deja un rastro en `error_de_la_app`, y si la cámara
 * revienta se ofrece seguir en vez de dejar la pantalla en blanco: el 26/10 el
 * tester la vio en blanco al pulsar «Escanear» y no había forma de saber por qué.
 */
export function ConfirmarIdentidad({
  nombre,
  fotosGuardadas,
  cargando,
  marcaDeAgua,
  ficha,
  onCoincide,
  onAMano,
  onAprobarAMano,
}: Props) {
  const [paso, setPaso] = useState<Paso>("persona");
  const [escaneadas, setEscaneadas] = useState<string[]>([]);
  const [leido, setLeido] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [resultado, setResultado] = useState<Coincidencia | "sin_coincidencia" | null>(null);
  const [aviso, setAviso] = useState("");
  /** Si no se leyó nada, el motivo del error es otro. */
  const [nadaLeido, setNadaLeido] = useState(false);
  const [aprobadoAMano, setAprobadoAMano] = useState(false);

  const leerFoto = async (uri: string) => {
    setAviso("");
    anotarEnLaBase("rastro", "escaneo: foto tomada", uri.slice(-80));
    setEscaneadas((antes) => [...antes, uri].slice(-2));

    setLeyendo(true);
    try {
      anotarEnLaBase("rastro", "escaneo: leyendo", uri.slice(-80));
      // Que la pantalla alcance a repintarse antes del trabajo pesado.
      await new Promise((listo) => setTimeout(listo, 300));
      const lectura = await Promise.race([
        leerTextoDelDocumento(uri),
        new Promise<string>((_, rechazar) =>
          setTimeout(
            () => rechazar(new Error("La lectura tardó demasiado. Escribe el número a mano.")),
            20_000,
          ),
        ),
      ]);
      anotarEnLaBase("rastro", "escaneo: leído", `${lectura.trim().length} caracteres`);
      setNadaLeido(lectura.trim().length === 0);
      const texto = `${leido}\n${lectura}`;
      setLeido(texto);
      const coincide = compararDocumento(texto, ficha);
      if (!coincide) {
        setResultado("sin_coincidencia");
        return;
      }
      setResultado(coincide);
      if (await onCoincide()) setPaso("listo");
      else setAviso("La base no lo dio por validado. Escribe el número a mano.");
    } catch (e) {
      anotarError("escaneo: leer el documento", e);
      setAviso(mensajeDeError(e, "No se pudo leer el documento."));
    } finally {
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
        {aprobadoAMano
          ? "✓ Aprobado a mano. Quedó anotado que lo aprobaste tú."
          : resultado === "nombre"
          ? "✓ Misma persona, y el nombre del documento coincide con el registrado. Validado."
          : "✓ Misma persona, y el número del documento coincide con el registrado. Validado."}
      </Text>
    );
  }

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
            El celular lee el texto y lo compara con lo registrado. La foto no se guarda ni se
            sube.
          </Text>
          {/*
            Sin miniatura de lo escaneado: no se guarda, y dibujar la foto
            entera pesaba en el celular (QA 23/10/2026).
          */}
          <Text className="text-xs text-gray-500">
            {escaneadas.length === 0
              ? "Todavía no has escaneado."
              : escaneadas.length === 1
                ? "Escaneaste un lado."
                : "Escaneaste los dos lados."}
          </Text>
          {resultado === "sin_coincidencia" && !leyendo ? (
            <DocumentoNoCoincide
              nombre={nombre}
              motivo={
                nadaLeido
                  ? "No se leyó ningún texto en la foto. Apunta al documento, de cerca y con buena luz."
                  : `En lo escaneado no está el número ni el nombre que registró ${nombre}.`
              }
              onVolverAEscanear={() => setResultado(null)}
              onAprobarAMano={
                onAprobarAMano
                  ? async () => {
                      try {
                        if (await onAprobarAMano()) {
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
                etiqueta={escaneadas.length === 0 ? "📷 Escanear el documento" : "📷 Escanear el otro lado"}
                ocupado={leyendo}
                onFoto={leerFoto}
                onError={setAviso}
              />
            </ErrorBoundary>
          )}
          {leyendo ? (
            <Text className="text-xs text-gray-500 text-center">Leyendo el documento…</Text>
          ) : null}
          <Button variant="secondary" fullWidth onPress={onAMano}>
            Escribir el número a mano
          </Button>
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
