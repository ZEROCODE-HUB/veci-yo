import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, CampoTelefono, Cargando, Input } from "@/shared/components";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { paisPorDefecto } from "@/shared/constants";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  guardarConstructora,
  obtenerConstructora,
  type InformacionDeConstructora as Datos,
} from "../../services/constructora.repo";

const VACIO: Datos = {
  nombre: "",
  anioEntrega: "",
  garantiaHasta: "",
  responsablePostventa: "",
  correoPostventa: "",
  telefono: "",
  codigoPais: "",
};
const ES_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * «Información de Constructora», debajo de la del condominio (Para Claude 193,
 * 30/10/2026). Todo opcional, con su propio «Guardar información». Con el
 * correo de postventa puesto, las PQRS ofrecen «Constructora» y se le manda
 * cada una (194 y 195).
 */
export function InformacionDeConstructora() {
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const clave = ["constructora", condominioId];
  const guardada = useQuery({
    queryKey: clave,
    queryFn: () => obtenerConstructora(condominioId),
    enabled: Boolean(condominioId),
  });
  const [datos, setDatos] = useState<Datos>(VACIO);
  useEffect(() => {
    if (guardada.data) setDatos({ ...guardada.data, codigoPais: guardada.data.codigoPais || paisPorDefecto() });
  }, [guardada.data]);

  const set = (cambios: Partial<Datos>) => setDatos((antes) => ({ ...antes, ...cambios }));

  const errorAnio =
    datos.anioEntrega && !/^\d{4}$/.test(datos.anioEntrega.trim()) ? "El año lleva cuatro cifras" : undefined;
  const errorGarantia =
    datos.garantiaHasta && !/^\d{4}-(0[1-9]|1[0-2])$/.test(datos.garantiaHasta.trim())
      ? "Escribe año y mes así: 2028-06"
      : undefined;
  const errorCorreo =
    datos.correoPostventa && !ES_CORREO.test(datos.correoPostventa.trim()) ? "El correo no parece válido" : undefined;
  const hayError = Boolean(errorAnio || errorGarantia || errorCorreo);

  const guardar = useMutation({
    mutationFn: () => guardarConstructora(condominioId, datos),
    onSuccess: () => {
      addToast("Información de la constructora guardada", "success");
      void client.invalidateQueries({ queryKey: clave });
      void client.invalidateQueries({ queryKey: ["postventa"] });
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo guardar"), "error"),
  });

  if (guardada.isLoading) return <Cargando variante="enLinea" texto="la constructora" />;

  return (
    <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: theme.colors.bgCard }}>
      <Text className="text-base font-bold text-gray-900">Información de Constructora</Text>
      <Text className="text-xs text-gray-500">Todo es opcional.</Text>
      <Input
        label="Nombre de la constructora"
        value={datos.nombre}
        onChangeText={(nombre) => set({ nombre })}
      />
      <Input
        label="Año de entrega"
        value={datos.anioEntrega}
        onChangeText={(anioEntrega) => set({ anioEntrega: anioEntrega.replace(/\D/g, "").slice(0, 4) })}
        placeholder="2024"
        type="numeric"
        error={errorAnio}
      />
      <Input
        label="Fin de la garantía (año y mes)"
        value={datos.garantiaHasta}
        onChangeText={(garantiaHasta) => set({ garantiaHasta })}
        placeholder="2028-06"
        error={errorGarantia}
      />
      <Input
        label="Responsable de postventa"
        value={datos.responsablePostventa}
        onChangeText={(responsablePostventa) => set({ responsablePostventa })}
      />
      <Input
        label="Correo de reclamaciones de postventa"
        type="email"
        value={datos.correoPostventa}
        onChangeText={(correoPostventa) => set({ correoPostventa })}
        placeholder="postventa@constructora.com"
        error={errorCorreo}
      />
      <CampoTelefono
        label="Teléfono de respaldo"
        codigoPais={datos.codigoPais}
        onCodigoPaisChange={(codigoPais) => set({ codigoPais })}
        telefono={datos.telefono}
        onTelefonoChange={(telefono) => set({ telefono })}
      />
      <Button onPress={() => guardar.mutate()} disabled={hayError || guardar.isPending} loading={guardar.isPending}>
        Guardar información
      </Button>
    </View>
  );
}
