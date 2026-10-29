import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components/ui";
import { ConfirmarCambio, type CambioAConfirmar } from "./ConfirmarCambio";
import { FilaDeCampos } from "@/shared/layouts";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { FilaConInterruptor } from "./FilaConInterruptor";
import type { CambiosDeDocumento, DocumentoDelPais } from "../services/plataforma.repo";

interface Props {
  documento: DocumentoDelPais;
  esDueno: boolean;
  guardando: boolean;
  guardar: (cambios: CambiosDeDocumento) => Promise<void>;
  primero: boolean;
}

/**
 * Un documento en un país: si se pide, a quién y cómo es su número.
 *
 * Encenderlo o apagarlo es inmediato; el resto se abre con «Ajustar», porque
 * cambiar el largo de una cédula por error rechaza a la gente en el
 * preregistro. La base no deja un país activo sin ningún documento para
 * adultos.
 */
export function DocumentoDelPaisCard({ documento: d, esDueno, guardando, guardar, primero }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [abierto, setAbierto] = useState(false);
  const [etiqueta, setEtiqueta] = useState(d.etiqueta);
  const [adultos, setAdultos] = useState(d.paraAdultos);
  const [menores, setMenores] = useState(d.paraMenores);
  const [cifras, setCifras] = useState(d.soloCifras);
  const [minimo, setMinimo] = useState(String(d.largoMinimo));
  const [maximo, setMaximo] = useState(String(d.largoMaximo));
  const [caras, setCaras] = useState(d.dosCaras);
  const [fecha, setFecha] = useState(d.pideFechaExpedicion);
  // Todo cambio se confirma antes de guardarse (28/10/2026): es lo que se le
  // pide a cada huésped y residente de ese país.
  const [porConfirmar, setPorConfirmar] = useState<{
    cambios: CambiosDeDocumento;
    ok: string;
    resumen: CambioAConfirmar[];
  } | null>(null);

  const intentar = async (cambios: CambiosDeDocumento, ok: string) => {
    try {
      await guardar(cambios);
      addToast(ok, "success");
      return true;
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar el documento"), "error");
      return false;
    }
  };

  const aQuien = [d.paraAdultos ? "adultos" : null, d.paraMenores ? "menores" : null]
    .filter(Boolean)
    .join(" y ");
  const numero = d.soloCifras
    ? `${d.largoMinimo} a ${d.largoMaximo} cifras`
    : `${d.largoMinimo} a ${d.largoMaximo} letras o cifras`;

  return (
    <View className={`gap-2 px-4 py-3 ${primero ? "" : "border-t border-gray-100"}`}>
      <FilaConInterruptor
        texto={d.etiqueta}
        negrita
        value={d.activo}
        onChange={(v) =>
          setPorConfirmar({
            cambios: { activo: v },
            ok: v ? `Se pide «${d.etiqueta}»` : `Ya no se pide «${d.etiqueta}»`,
            resumen: [{ que: `Se pide ${d.etiqueta}`, antes: d.activo ? "Sí" : "No", despues: v ? "Sí" : "No" }],
          })
        }
        disabled={!esDueno || guardando}
        nombre={`Se pide ${d.etiqueta}`}
      />
      <Text className="text-xs text-gray-500">
        {`${d.activo ? `Para ${aQuien || "nadie"}` : "No se pide"} · ${numero}${
          d.dosCaras ? " · dos caras" : " · una cara"
        }${d.pideFechaExpedicion ? " · pide fecha de expedición" : ""}`}
      </Text>

      {porConfirmar ? (
        <ConfirmarCambio
          cambios={porConfirmar.resumen}
          riesgoAlto
          guardando={guardando}
          onConfirmar={async () => {
            const ok = await intentar(porConfirmar.cambios, porConfirmar.ok);
            setPorConfirmar(null);
            if (ok) setAbierto(false);
          }}
          onVolver={() => setPorConfirmar(null)}
        />
      ) : null}

      {esDueno ? (
        <Pressable
          onPress={() => setAbierto((a) => !a)}
          accessibilityRole="button"
          accessibilityLabel={`Ajustar ${d.etiqueta}`}
          aria-expanded={abierto}
          accessibilityState={{ expanded: abierto }}
          hitSlop={8}
          className="flex-row items-center gap-1 self-start active:opacity-70"
        >
          <Text className="text-xs font-semibold text-primary">{abierto ? "Cerrar" : "Ajustar"}</Text>
          <Ionicons name={abierto ? "chevron-up" : "chevron-down"} size={14} color={theme.colors.primary} />
        </Pressable>
      ) : null}

      {abierto ? (
        <View className="gap-3 pt-1">
          <Input label="Cómo se llama en este país" value={etiqueta} onChangeText={setEtiqueta} />
          <FilaConInterruptor texto="Se le pide a un adulto" value={adultos} onChange={setAdultos} />
          <FilaConInterruptor texto="Se le pide a un menor" value={menores} onChange={setMenores} />
          <FilaConInterruptor texto="El número lleva solo cifras" value={cifras} onChange={setCifras} />
          <FilaDeCampos gap={12}>
            <Input label="Largo mínimo" value={minimo} onChangeText={setMinimo} soloCifras />
            <Input label="Largo máximo" value={maximo} onChangeText={setMaximo} soloCifras />
          </FilaDeCampos>
          <FilaConInterruptor texto="Tiene dos caras (se fotografía el reverso)" value={caras} onChange={setCaras} />
          <FilaConInterruptor texto="Pide la fecha de expedición" value={fecha} onChange={setFecha} />
          <Button
            onPress={() => {
              const si = (b: boolean) => (b ? "Sí" : "No");
              const resumen: CambioAConfirmar[] = [];
              if (etiqueta.trim() !== d.etiqueta) resumen.push({ que: "Nombre", antes: d.etiqueta, despues: etiqueta.trim() });
              if (adultos !== d.paraAdultos) resumen.push({ que: "A un adulto", antes: si(d.paraAdultos), despues: si(adultos) });
              if (menores !== d.paraMenores) resumen.push({ que: "A un menor", antes: si(d.paraMenores), despues: si(menores) });
              if (cifras !== d.soloCifras) resumen.push({ que: "Solo cifras", antes: si(d.soloCifras), despues: si(cifras) });
              if (minimo !== String(d.largoMinimo)) resumen.push({ que: "Largo mínimo", antes: String(d.largoMinimo), despues: minimo });
              if (maximo !== String(d.largoMaximo)) resumen.push({ que: "Largo máximo", antes: String(d.largoMaximo), despues: maximo });
              if (caras !== d.dosCaras) resumen.push({ que: "Dos caras", antes: si(d.dosCaras), despues: si(caras) });
              if (fecha !== d.pideFechaExpedicion) {
                resumen.push({ que: "Fecha de expedición", antes: si(d.pideFechaExpedicion), despues: si(fecha) });
              }
              if (resumen.length === 0) {
                setAbierto(false);
                return;
              }
              setPorConfirmar({
                cambios: {
                  etiqueta: etiqueta.trim(),
                  para_adultos: adultos,
                  para_menores: menores,
                  solo_cifras: cifras,
                  largo_minimo: Number(minimo),
                  largo_maximo: Number(maximo),
                  dos_caras: caras,
                  pide_fecha_expedicion: fecha,
                },
                ok: "Documento guardado",
                resumen,
              });
            }}
            loading={guardando}
            fullWidth
          >
            Guardar documento
          </Button>
        </View>
      ) : null}
    </View>
  );
}
