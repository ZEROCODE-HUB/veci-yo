import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Card, Input, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import { usePlataforma } from "../hooks/usePlataforma";
import { paisesParaAltaDeEdificio } from "../services/plataforma.repo";
import { paisPorDefecto } from "@/shared/constants";

/**
 * Dar de alta un edificio.
 *
 * Si se da un correo, esa persona queda de administración en el acto y se le
 * avisa por correo (29/10/2026; antes era una invitación que había que
 * aceptar). Si no tenía cuenta, se le crea y el correo trae el enlace para
 * poner su contraseña: la plataforma no elige claves de otros.
 */

export function PlataformaEdificioNuevoScreen() {
  const navegacion = useNavegacionPlataforma();
  const addToast = useUIStore((s) => s.addToast);
  const { crear, edificios } = usePlataforma();
  /*
    Los países donde se puede dar de alta un edificio, con su moneda: de la
    tabla `pais` (`alta_de_edificio`). Solo los que tienen moneda, porque un
    edificio nace con la suya y el dinero es lo que menos se puede suponer.
  */
  const { data: paises = [] } = useQuery({
    queryKey: ["plataforma", "paises-de-alta"],
    queryFn: paisesParaAltaDeEdificio,
  });

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState(paisPorDefecto);
  const [correoAdmin, setCorreoAdmin] = useState("");
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [listo, setListo] = useState<Awaited<
    ReturnType<typeof crear.mutateAsync>
  > | null>(null);

  const guardar = async () => {
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) nuevos.nombre = "¿Cómo se llama el edificio?";
    /*
      Dos edificios con el mismo nombre en la misma ciudad casi siempre son el
      mismo, dado de alta otra vez porque el primero se quedó sin
      administración y no había otra forma de asignarla. Ya la hay, en el
      resumen.
    */
    const igual = (a?: string | null, b?: string | null) =>
      (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
    if (
      nombre.trim() &&
      edificios.some((e) => igual(e.nombre, nombre) && igual(e.ciudad, ciudad))
    ) {
      nuevos.nombre =
        "Ya hay un edificio con ese nombre en esa ciudad. Si le falta administración, asígnala desde el resumen.";
    }
    if (!direccion.trim()) nuevos.direccion = "Hace falta la dirección";
    /*
      Si se da un correo, se pide el nombre: el correo que recibe esa persona
      empieza con él. Sin nombre llegaría «Hola,».
    */
    if (correoAdmin.trim() && !nombreAdmin.trim()) {
      nuevos.nombreAdmin = "¿Cómo se llama quien lo administra?";
    }
    if (
      correoAdmin.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correoAdmin.trim())
    ) {
      nuevos.correoAdmin = "Ese correo no parece válido";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    try {
      const resultado = await crear.mutateAsync({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        pais,
        ciudad: ciudad.trim() || undefined,
        moneda: paises.find((p) => p.codigo === pais)?.moneda || undefined,
        correoAdmin: correoAdmin.trim() || undefined,
        nombreAdmin: nombreAdmin.trim() || undefined,
      });

      setListo(resultado);
    } catch (error) {
      addToast(
        mensajeDeError(error, "No se pudo dar de alta el edificio"),
        "error",
      );
    }
  };

  if (listo) {
    return (
      <DesplazableConTeclado
        className="flex-1 bg-gray-50"
        contentContainerClassName="p-4 gap-4"
      >
        <Card className="p-4">
          <Text className="text-base font-semibold text-gray-900">
            {nombre} ya existe
          </Text>
          {listo.administracion ? (
            <>
              <Text className="mt-2 text-sm text-gray-900">
                {`${nombreAdmin.trim()} ya administra el edificio.`}
              </Text>
              {listo.administracion.correo.enviado ? (
                <Text className="mt-2 text-sm text-gray-600">
                  {listo.administracion.cuentaNueva
                    ? `Le enviamos un correo a ${correoAdmin.trim()} con el enlace para poner su contraseña.`
                    : `Le avisamos por correo a ${correoAdmin.trim()}. Entra con su cuenta de siempre.`}
                </Text>
              ) : (
                <Text className="mt-2 text-sm text-danger">
                  {listo.administracion.cuentaNueva
                    ? `No salió el correo: ${listo.administracion.correo.motivo}. Dile que entre con «¿Olvidaste tu contraseña?» y ${correoAdmin.trim()}.`
                    : `No salió el correo: ${listo.administracion.correo.motivo}. Avísale tú: ya puede entrar con su cuenta.`}
                </Text>
              )}
            </>
          ) : listo.fallo ? (
            <Text className="mt-2 text-sm text-danger">
              {`No se pudo asignar la administración: ${listo.fallo}. Vuelve a intentarlo desde el resumen.`}
            </Text>
          ) : (
            <Text className="mt-2 text-sm text-gray-600">
              Todavía no tiene administración. Cuando sepas a quién dársela,
              hazlo desde el resumen: junto al edificio sale «Asignar su
              administración».
            </Text>
          )}
          <Button
            variant="secondary"
            onPress={() => navegacion.goBack()}
            fullWidth
            style={{ marginTop: 8 }}
          >
            Volver al panel
          </Button>
        </Card>
      </DesplazableConTeclado>
    );
  }

  return (
    <DesplazableConTeclado
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <Card className="gap-4 p-4">
        <Text className="text-base font-semibold text-gray-900">
          El edificio
        </Text>
        <Input
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Las Barranqueras 246"
          error={errores.nombre}
        />
        <Input
          label="Dirección"
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Carrera 5 #26-10"
          error={errores.direccion}
        />
        <Input
          label="Ciudad (opcional)"
          value={ciudad}
          onChangeText={setCiudad}
          placeholder="Bogotá"
        />
        <Select
          label="País"
          value={pais}
          options={paises.map((p) => ({ label: p.nombre, value: p.codigo }))}
          onChange={(valor) => setPais(String(valor))}
        />
      </Card>

      <Card className="gap-4 p-4">
        <Text className="text-base font-semibold text-gray-900">
          Su administración
        </Text>
        <Text className="text-xs leading-5 text-gray-500">
          Queda de administración en el acto y le avisamos por correo; si no
          tiene cuenta, se la creamos. A partir de ahí el edificio es suyo: las torres, las viviendas y la gente los da de alta
          ella, no la plataforma.
        </Text>
        <Input
          label="Correo (opcional)"
          value={correoAdmin}
          onChangeText={setCorreoAdmin}
          type="email"
          placeholder="administracion@eledificio.com"
          error={errores.correoAdmin}
        />
        <Input
          label="A nombre de"
          value={nombreAdmin}
          onChangeText={setNombreAdmin}
          placeholder="Nombre de quien va a administrar"
          error={errores.nombreAdmin}
        />
      </Card>

      <Button onPress={guardar} fullWidth loading={crear.isPending}>
        Dar de alta el edificio
      </Button>
    </DesplazableConTeclado>
  );
}
