import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Input, Select } from "@/shared/components/ui";
import { FilaDeCampos } from "@/shared/layouts";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { FilaConInterruptor } from "./FilaConInterruptor";
import { ConfirmarCambio, type CambioAConfirmar } from "./ConfirmarCambio";
import type { CambiosDePais, PaisDelPanel } from "../services/plataforma.repo";

interface Props {
  pais: PaisDelPanel;
  monedas: { codigo: string; nombre: string }[];
  esDueno: boolean;
  guardando: boolean;
  guardar: (cambios: CambiosDePais) => Promise<void>;
}

/**
 * Los datos de un país. Lo que ya existe en él no cambia al guardar: un
 * edificio guarda su moneda y su zona horaria al nacer, así que esto vale para
 * los edificios nuevos. La base comprueba la zona, la moneda y el resto.
 */
export function DatosDelPais({ pais, monedas, esDueno, guardando, guardar }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [nombre, setNombre] = useState(pais.nombre);
  const [prefijo, setPrefijo] = useState(pais.prefijo);
  const [moneda, setMoneda] = useState(pais.moneda);
  const [zona, setZona] = useState(pais.zonaHoraria);
  const [policia, setPolicia] = useState(pais.policia);
  const [fiscal, setFiscal] = useState(pais.etiquetaFiscal);
  const [mayoria, setMayoria] = useState(String(pais.mayoriaDeEdad));
  const [sire, setSire] = useState(pais.reportaSire);
  const [alta, setAlta] = useState(pais.altaDeEdificio);
  const [activo, setActivo] = useState(pais.activo);

  // Solo lo que cambió: lo demás no viaja, y la bitácora dice qué se tocó.
  const cambios: CambiosDePais = {};
  if (nombre.trim() !== pais.nombre) cambios.nombre = nombre.trim();
  if (prefijo.trim() !== pais.prefijo) cambios.prefijo = prefijo.trim();
  if (moneda !== pais.moneda) cambios.moneda = moneda;
  if (zona.trim() !== pais.zonaHoraria) cambios.zona_horaria = zona.trim();
  if (policia.trim() !== pais.policia) cambios.policia = policia.trim();
  if (fiscal.trim() !== pais.etiquetaFiscal) cambios.etiqueta_fiscal = fiscal.trim();
  if (Number(mayoria) !== pais.mayoriaDeEdad) cambios.mayoria_de_edad = Number(mayoria);
  if (sire !== pais.reportaSire) cambios.reporta_sire = sire;
  if (alta !== pais.altaDeEdificio) cambios.alta_de_edificio = alta;
  if (activo !== pais.activo) cambios.activo = activo;
  const hayCambios = Object.keys(cambios).length > 0;
  const [confirmando, setConfirmando] = useState(false);

  // Lo que se enseña al confirmar (28/10/2026): de qué a qué cambia cada dato.
  const si = (b: boolean) => (b ? "Sí" : "No");
  const resumen: CambioAConfirmar[] = [
    ["nombre", "Nombre", pais.nombre, nombre.trim()],
    ["prefijo", "Prefijo telefónico", pais.prefijo, prefijo.trim()],
    ["moneda", "Moneda", pais.moneda, moneda],
    ["zona_horaria", "Zona horaria", pais.zonaHoraria, zona.trim()],
    ["policia", "Emergencias", pais.policia, policia.trim()],
    ["etiqueta_fiscal", "Identificación fiscal", pais.etiquetaFiscal, fiscal.trim()],
    ["mayoria_de_edad", "Mayoría de edad", String(pais.mayoriaDeEdad), mayoria],
    ["reporta_sire", "Reporta al SIRE", si(pais.reportaSire), si(sire)],
    ["alta_de_edificio", "Alta de edificios", si(pais.altaDeEdificio), si(alta)],
    ["activo", "País activo", si(pais.activo), si(activo)],
  ]
    .filter(([clave]) => clave in cambios)
    .map(([, que, antes, despues]) => ({ que, antes, despues }));

  const alGuardar = async () => {
    try {
      await guardar(cambios);
      addToast("Datos del país guardados", "success");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudieron guardar los datos"), "error");
    }
    setConfirmando(false);
  };

  return (
    <Card className="gap-3 p-4">
      <Text className="text-base font-semibold text-gray-900">Datos del país</Text>
      <Input label="Nombre" value={nombre} onChangeText={setNombre} editable={esDueno} />
      <FilaDeCampos gap={12}>
        <Input label="Prefijo telefónico" value={prefijo} onChangeText={setPrefijo} soloCifras editable={esDueno} />
        <Input label="Mayoría de edad (años)" value={mayoria} onChangeText={setMayoria} soloCifras editable={esDueno} />
      </FilaDeCampos>
      <Select
        label="Moneda"
        value={moneda}
        options={monedas.map((m) => ({ value: m.codigo, label: `${m.codigo} · ${m.nombre}` }))}
        onChange={(v) => setMoneda(String(v))}
        placeholder="Sin moneda"
      />
      <Input
        label="Zona horaria"
        value={zona}
        onChangeText={setZona}
        placeholder="America/Bogota"
        editable={esDueno}
      />
      <FilaDeCampos gap={12}>
        <Input label="Emergencias (policía)" value={policia} onChangeText={setPolicia} editable={esDueno} />
        <Input label="Identificación fiscal" value={fiscal} onChangeText={setFiscal} placeholder="NIT" editable={esDueno} />
      </FilaDeCampos>
      <FilaConInterruptor
        texto="Se pueden dar de alta edificios"
        value={alta}
        onChange={setAlta}
        disabled={!esDueno}
      />
      <FilaConInterruptor
        texto="Reporta huéspedes extranjeros a Migración (SIRE)"
        value={sire}
        onChange={setSire}
        disabled={!esDueno}
      />
      <FilaConInterruptor texto="País activo" value={activo} onChange={setActivo} disabled={!esDueno} />
      <Text className="text-xs text-gray-500">
        La moneda y la zona horaria se aplican a los edificios que se den de alta desde ahora. Los que ya
        existen guardan las suyas.
      </Text>
      {esDueno && confirmando ? (
        <ConfirmarCambio
          cambios={resumen}
          riesgoAlto
          guardando={guardando}
          onConfirmar={() => void alGuardar()}
          onVolver={() => setConfirmando(false)}
        />
      ) : esDueno ? (
        <View>
          <Button onPress={() => setConfirmando(true)} disabled={!hayCambios} fullWidth>
            Guardar datos
          </Button>
        </View>
      ) : null}
    </Card>
  );
}
