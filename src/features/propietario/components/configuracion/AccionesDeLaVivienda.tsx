import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Button } from "@/shared/components";

/** Lo que se configura desde el botón de funcionalidades de la vivienda. */
const FUNCIONALIDADES = ["Huéspedes Temporales"];

interface Props {
  puedeInvitar: boolean;
  puedeConfigurarElAlojamiento: boolean;
  puedeGestionarLaVivienda: boolean;
  onInvitar: () => void;
  onFuncionalidades: () => void;
  onContratos: () => void;
  onServicios: () => void;
}

/** Los botones del final de la configuración de la vivienda. */
export function AccionesDeLaVivienda({
  puedeInvitar,
  puedeConfigurarElAlojamiento,
  puedeGestionarLaVivienda,
  onInvitar,
  onFuncionalidades,
  onContratos,
  onServicios,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  return (
    <>
      {puedeInvitar && (
        <>
          <View className="h-4" />
          <Button variant="primary" onPress={onInvitar}>
            <Text>Invitar a alguien a la vivienda</Text>
          </Button>
        </>
      )}

      <View className="h-2" />

      {puedeConfigurarElAlojamiento && (
        <Button variant="primary" onPress={onFuncionalidades}>
          {/*
            En una sola fila: llevaba un salto de línea puesto a mano (Para
            Claude, 21/10/2026). Si se suman funcionalidades, van en la misma
            lista, separadas por coma. Y que de verdad quepa: en el ancho de un
            celular se partía en dos (T-244, 23/10/2026). Letra algo menor y, en
            el teléfono, se ajusta sola si no cabe.
          */}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 13 }}>
            {/*
              En 320 de ancho o con la letra grande, ni achicándose cabía y salía
              cortado (auditoría de responsividad, 25/10/2026). Ahí va la forma
              corta, para seguir en una línea como pidió el cliente.
            */}
            {`${width < 360 || fontScale > 1.15 ? "Funcionalidad" : "Configuración de funcionalidad"}: ${FUNCIONALIDADES.join(", ")}`}
          </Text>
        </Button>
      )}

      <View className="h-2" />

      {/*
        El historial de contratos y los servicios contratados --luz, agua,
        internet-- tenían su pantalla terminada y **no se podían alcanzar**. El
        KT los lista entre lo que hace el propietario, y este es el sitio donde
        ya están las otras cosas que hace con su vivienda.
      */}
      {puedeGestionarLaVivienda && (
        <Button variant="secondary" onPress={onContratos}>
          <Text>Contratos de arrendamiento</Text>
        </Button>
      )}
      {puedeGestionarLaVivienda && (
        <Button variant="secondary" onPress={onServicios}>
          <Text>Servicios contratados</Text>
        </Button>
      )}
    </>
  );
}
