import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Input } from "@/shared/components";
import { numeroEntreIguales } from "../../helpers/numeroEntreIguales";
import type { AltaDeVisita } from "./tipos";

/** Una ficha por acompañante, y el aviso legal si alguno es menor. */
export function AcompanantesDeLaVisita({ alta: v }: { alta: AltaDeVisita }) {
  const { acompanantes, setAcompanantes } = v;
  const esTemporal = v.tipoSeleccionado === "temporal";
  const cambiar = (idx: number, campo: "nombre" | "ci", valor: string) => {
    const updated = [...acompanantes];
    updated[idx] = { ...updated[idx], [campo]: valor };
    setAcompanantes(updated);
  };

  return (
    <>
      {acompanantes.length > 0 && (
        <View className="gap-3">
          {acompanantes.map((acc, idx) => (
            <View
              key={idx}
              className="rounded-2xl p-4 gap-3"
              style={{ backgroundColor: theme.colors.bgMuted, boxShadow: theme.shadows.card }}
            >
              {/*
                El titulo dice **que** es cada ficha, porque eso ya lo decidio el
                contador de arriba. Antes todas se llamaban «Acompañante N» y
                cada una preguntaba otra vez, con un interruptor, algo que
                acababa de responderse.
              */}
              <Text className="text-sm font-semibold text-gray-900">
                {acc.esMenor
                  ? `👶 Menor ${numeroEntreIguales(acompanantes, idx)}`
                  : `Adulto ${numeroEntreIguales(acompanantes, idx) + 1}`}
              </Text>
              <Input
                value={acc.nombre}
                onChangeText={(x) => cambiar(idx, "nombre", x)}
                placeholder="Nombre y Apellido"
              />
              <View>
                <Text className="text-xs text-gray-500 mb-1">
                  Identificación {esTemporal ? "*" : "(opcional)"}
                </Text>
                <Input
                  value={acc.ci}
                  onChangeText={(x) => cambiar(idx, "ci", x)}
                  placeholder={esTemporal ? "Obligatorio" : "Opcional"}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {acompanantes.some((a) => a.esMenor) && (
        <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.warningLight }}>
          <Text className="text-xs leading-5" style={{ color: theme.colors.iconAmberDark }}>
            Advertencia legal: Si el invitado es menor de edad, debe ingresar con
            su padre/madre/tutor legal con la documentación respectiva. Este
            condominio está comprometido en proteger la integridad de los menores
            de edad y prevenir la explotación comercial sexual de las niñas, niños
            y adolescentes.
          </Text>
        </View>
      )}
    </>
  );
}
