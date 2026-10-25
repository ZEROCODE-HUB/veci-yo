import React from "react";
import { Text } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Card, Cargando } from "@/shared/components/ui";
import type { PlataformaStackParamList } from "@/shared/types/navigation";
import { usePaisesDeLaApp } from "../hooks/usePanelDeLaApp";
import { DatosDelPais } from "../components/DatosDelPais";
import { DocumentoDelPaisCard } from "../components/DocumentoDelPaisCard";

/**
 * Un país: sus datos y los documentos que se piden en él (25/10/2026).
 *
 * Pedido del cliente: «acorde al país de dónde está el edificio debe
 * solicitarse los documentos, y que sea configurable desde el super admin, por
 * país». Lo que se cambia aquí lo usan el registro y las visitas de la app y el
 * preregistro de la web, y lo hace cumplir la base al guardar un invitado.
 */
export function PlataformaPaisScreen() {
  const { params } = useRoute<RouteProp<PlataformaStackParamList, "PlataformaPais">>();
  const { paises, monedas, cargando, esDueno, cambiar, cambiarDocumento } = usePaisesDeLaApp();
  const pais = paises.find((p) => p.codigo === params.codigo);

  if (cargando) return <Cargando texto="el país" />;
  if (!pais) {
    return (
      <Card className="m-4 p-4">
        <Text className="text-sm text-gray-700">Ese país no existe.</Text>
      </Card>
    );
  }

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      <DatosDelPais
        // Al guardar llegan los datos nuevos: el formulario se vuelve a armar con ellos.
        key={JSON.stringify([pais.nombre, pais.prefijo, pais.moneda, pais.zonaHoraria, pais.activo, pais.altaDeEdificio])}
        pais={pais}
        monedas={monedas}
        esDueno={esDueno}
        guardando={cambiar.isPending}
        guardar={(cambios) => cambiar.mutateAsync({ codigo: pais.codigo, cambios })}
      />

      <Card className="p-0">
        <Text className="px-4 pt-4 text-base font-semibold text-gray-900">Documentos que se piden</Text>
        <Text className="px-4 pb-2 pt-1 text-xs text-gray-500">
          Los que se ofrecen al registrarse, al anunciar una visita y en el preregistro de los huéspedes de
          los edificios de este país.
        </Text>
        {pais.documentos.map((d, i) => (
          <DocumentoDelPaisCard
            key={`${d.tipo}:${JSON.stringify(d)}`}
            documento={d}
            esDueno={esDueno}
            guardando={cambiarDocumento.isPending}
            guardar={(cambios) => cambiarDocumento.mutateAsync({ pais: pais.codigo, tipo: d.tipo, cambios })}
            primero={i === 0}
          />
        ))}
      </Card>
    </DesplazableConTeclado>
  );
}
