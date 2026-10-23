import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, CampoFecha, Card, Cargando, Input } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  activarCodigoDeDescuento,
  crearCodigoDeDescuento,
  listarCodigosDeDescuento,
} from "../services/plataforma.repo";

const CLAVE = ["plataforma", "descuentos"];

/**
 * Los códigos de descuento de la suscripción de renta corta (QA 23/10/2026).
 *
 * Los crea quien opera Veciyo, con un porcentaje, el último día en que valen
 * y cuántas suscripciones los pueden usar. El anfitrión lo escribe al
 * suscribirse y la base lo aplica al importe. No se borran: se desactivan,
 * porque los periodos que los usaron los referencian.
 */
export function PlataformaDescuentosScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const cliente = useQueryClient();
  const { data: codigos = [], isLoading } = useQuery({
    queryKey: CLAVE,
    queryFn: listarCodigosDeDescuento,
  });

  const [codigo, setCodigo] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [venceEn, setVenceEn] = useState("");
  const [usos, setUsos] = useState("");

  const crear = useMutation({
    mutationFn: () =>
      crearCodigoDeDescuento({
        codigo,
        porcentaje: Number(porcentaje),
        venceEn,
        usosMaximos: usos ? Number(usos) : null,
      }),
    onSuccess: () => {
      addToast("Código creado", "success");
      setCodigo("");
      setPorcentaje("");
      setVenceEn("");
      setUsos("");
      void cliente.invalidateQueries({ queryKey: CLAVE });
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo crear el código"), "error"),
  });

  const activar = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      activarCodigoDeDescuento(id, activo),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CLAVE }),
    onError: (e) => addToast(mensajeDeError(e, "No se pudo cambiar el código"), "error"),
  });

  const pct = Number(porcentaje);
  const valido = codigo.trim().length >= 3 && pct >= 1 && pct <= 100;

  return (
    <ScrollView className="flex-1 bg-bg-app" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">Nuevo código de descuento</Text>
          <Text className="text-xs text-gray-600">
            Lo escribe el anfitrión al suscribirse a Huéspedes Temporales.
          </Text>
          <Input
            label="Código *"
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase().replace(/\s/g, ""))}
            placeholder="Ej.: BIENVENIDA20"
            showEditIcon={false}
          />
          <Input
            label="Porcentaje de descuento *"
            value={porcentaje}
            onChangeText={setPorcentaje}
            placeholder="Ej.: 20"
            soloCifras
            showEditIcon={false}
          />
          <CampoFecha
            label="Último día en que vale (opcional)"
            value={venceEn}
            onChange={setVenceEn}
            minima={new Date()}
          />
          <Input
            label="Cuántas suscripciones lo pueden usar (opcional)"
            value={usos}
            onChangeText={setUsos}
            placeholder="Sin tope"
            soloCifras
            showEditIcon={false}
          />
          <Button disabled={!valido} loading={crear.isPending} onPress={() => crear.mutate()}>
            Crear código
          </Button>
        </View>
      </Card>

      {isLoading ? (
        <Cargando texto="los códigos" variante="enLinea" />
      ) : codigos.length === 0 ? (
        <Text className="text-sm text-gray-500 text-center">Todavía no hay códigos.</Text>
      ) : (
        codigos.map((c) => (
          <Card key={c.id}>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-bold text-gray-900">{c.codigo}</Text>
                <Text className="text-xs text-gray-600">
                  {c.porcentaje} % · {c.venceEn ? `hasta el ${c.venceEn}` : "no vence"} ·{" "}
                  {c.usosMaximos ? `hasta ${c.usosMaximos} usos` : "sin tope de usos"}
                </Text>
              </View>
              <Badge status={c.activo ? "Aceptado" : "Pendiente"}>
                {c.activo ? "Activo" : "Inactivo"}
              </Badge>
            </View>
            <View className="flex-row mt-2">
              <Button
                size="sm"
                variant="secondary"
                loading={activar.isPending}
                onPress={() => activar.mutate({ id: c.id, activo: !c.activo })}
              >
                {c.activo ? "Desactivar" : "Activar"}
              </Button>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
