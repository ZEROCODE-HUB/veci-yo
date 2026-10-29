import React, { useState } from "react";
import { theme } from "@/config";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Input, Select } from "@/shared/components";
import { FilaDeCampos } from "@/shared/layouts";

interface Props {
  esProfesional: boolean;
  esGuardia: boolean;
  tipoSeleccionado: string | null;
  nombre: string;
  setNombre: (v: string) => void;
  tipoId: string;
  setTipoId: (v: string) => void;
  /** Los del país del edificio: la clave de la base y su etiqueta. */
  tiposDocumento: { value: string; label: string }[];
  identificacion: string;
  setIdentificacion: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  telefono: string;
  setTelefono: (v: string) => void;
  profesion: string;
  /** Los oficios del tipo de profesional elegido, de la lista de la base. */
  oficios: string[];
  /** Si el oficio elegido es «Otros» y hay que escribirlo. */
  pideOtraProfesion: boolean;
  setProfesion: (v: string) => void;
  profesionOtro: string;
  setProfesionOtro: (v: string) => void;
}

/**
 * Datos de quien visita.
 *
 * Venian precargados con los de una persona inventada ("Mariano Lazarto", con
 * cedula, correo y telefono), de modo que quien registraba una visita partia de
 * esos valores.
 *
 * ## Que es obligatorio y que no, y por que se ve asi
 *
 * En una **estancia de huesped** no hace falta nada: los datos los rellena el
 * huesped desde su enlace de preregistro --decision del cliente del
 * 02/10/2026-- y muchas reservas entran por el calendario de Airbnb, que no
 * manda ni el nombre. Aun asi la pantalla los pedia todos en fila, con el
 * nombre arriba del todo y sin decir en ningun sitio que se podian dejar
 * vacios; y el esquema rechazaba el formulario sin nombre, asi que de hecho no
 * se podian.
 *
 * Por eso el documento y el contacto viven ahora detras de un «+»: estan
 * cuando se tienen a mano, y no ocupan la pantalla ni parecen requisitos
 * cuando no. Se abren solos si ya traen algo escrito --volver atras y
 * encontrarse los campos cerrados con datos dentro es peor que el ruido que
 * ahorran-- y cuando el documento **si** es obligatorio, que es el profesional
 * temporal, no se pliegan en absoluto.
 *
 * La portería tampoco los pliega (16/10/2026, como en la maqueta): tiene a la
 * persona delante con el documento en la mano, así que el tipo y el número van
 * a la vista. Y a ella no se le dice «recuerda indicar a tu invitado…», que
 * es un consejo para el residente que anuncia una visita.
 */
export function DatosPersona({
  esProfesional,
  esGuardia,
  tipoSeleccionado,
  nombre,
  setNombre,
  tipoId,
  setTipoId,
  tiposDocumento,
  identificacion,
  setIdentificacion,
  email,
  setEmail,
  telefono,
  setTelefono,
  profesion,
  oficios,
  pideOtraProfesion,
  setProfesion,
  profesionOtro,
  setProfesionOtro,
}: Props) {
  const esEstancia = tipoSeleccionado === "huesped-temporal";
  /** El telefono es obligatorio cuando la portería registra un profesional. */
  const telefonoObligatorio = tipoSeleccionado === "temporal" && esGuardia;
  /*
    El documento es obligatorio en toda visita que no sea un huésped
    (29/10/2026), así que ya no se pliega: siempre a la vista.
  */
  const documentoObligatorio = !esEstancia;
  const sePuedePlegar = false;

  const yaHayAlgoEscrito = Boolean(
    tipoId || identificacion || email || telefono,
  );
  const [abierto, setAbierto] = useState(yaHayAlgoEscrito);
  const mostrarExtras = !sePuedePlegar || abierto || yaHayAlgoEscrito;

  return (
    <>
      {/* Person info */}
      <View
        className="rounded-2xl p-4 gap-3"
        style={{
          backgroundColor: theme.colors.bgMuted,
          boxShadow: theme.shadows.card,
        }}
      >
        <View>
          <Text className="text-sm font-semibold text-gray-900">
            {esEstancia ? "Datos del huésped" : "Nombre y Apellido"}
            {/* Obligatorio: asterisco rojo (Para Claude 148 y 150, 29/10/2026). */}
            {!esEstancia ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
            {esEstancia ? (
              <Text className="text-sm font-normal text-gray-400">
                {" "}
                · opcional
              </Text>
            ) : null}
          </Text>
          {esEstancia ? (
            <Text className="text-xs text-gray-500 mt-1 leading-5">
              Los completa el huésped desde el enlace que le vas a enviar. Si ya
              los tienes a mano, puedes adelantarlos.
            </Text>
          ) : null}
        </View>
        <Input
          value={nombre}
          onChangeText={setNombre}
          placeholder={
            esEstancia ? "Lo completa el huésped" : "Nombre completo"
          }
        />

        {sePuedePlegar && !mostrarExtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir documento y contacto"
            accessibilityState={{ expanded: false }}
            aria-expanded={false}
            onPress={() => setAbierto(true)}
            className="flex-row items-center gap-2 py-2"
          >
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.colors.secondaryLight }}
            >
              <Ionicons name="add" size={16} color={theme.colors.secondary} />
            </View>
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.secondary }}
            >
              Añadir documento y contacto
            </Text>
          </Pressable>
        ) : null}

        {mostrarExtras ? (
          <>
            {/*
              Una sola etiqueta arriba y los dos campos a la misma altura: con
              una etiqueta cada uno, la más larga saltaba de línea y el par
              quedaba descuadrado (Para Claude 148, 29/10/2026).
            */}
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-gray-700">
                {documentoObligatorio ? "Documento" : "Documento (opcional)"}
                {documentoObligatorio ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
              </Text>
              <FilaDeCampos gap={12}>
                <Select
                  value={tipoId}
                  placeholder="Tipo"
                  options={tiposDocumento}
                  onChange={(v) => setTipoId(String(v))}
                />
                <Input
                  value={identificacion}
                  onChangeText={setIdentificacion}
                  placeholder="N° de documento"
                  // Un documento puede llevar letras (pasaporte, cédula de extranjería).
                />
              </FilaDeCampos>
            </View>

            {!esGuardia && (
              <Input
                label="Correo electrónico (opcional)"
                value={email}
                onChangeText={setEmail}
                placeholder="email@ejemplo.com"
                type="email"
              />
            )}

            {(!esGuardia || tipoSeleccionado === "temporal") && (
              <Input
                label={`Teléfono${telefonoObligatorio ? " *" : " (opcional)"}`}
                value={telefono}
                onChangeText={setTelefono}
                placeholder={telefonoObligatorio ? "Obligatorio" : "Opcional"}
                soloCifras
              />
            )}
          </>
        ) : null}

        {/*
          El aviso de presentar el documento en porteria no va en una estancia:
          al huesped se le pide el documento en su preregistro, con foto, y
          quien lee esta pantalla es el anfitrion, que no va a estar en la
          puerta para decirselo.
        */}
        {!esEstancia && !esGuardia && (
          <View
            className="rounded-xl p-3"
            style={{ backgroundColor: theme.colors.secondaryLight }}
          >
            <Text className="text-xs text-gray-500 leading-5">
              Recuerda indicar a tu invitado que debe presentar su documento
              (cédula, pasaporte o DNI) en portería al ingresar al edificio.
            </Text>
          </View>
        )}

        {esProfesional && (
          <View className="gap-2">
            <Select
              label="Profesión *"
              value={profesion || null}
              options={oficios}
              onChange={(v) => setProfesion(String(v))}
              placeholder="Elige la profesión"
            />
            {pideOtraProfesion && (
              <Input
                value={profesionOtro}
                onChangeText={setProfesionOtro}
                placeholder="Especifique la profesión"
              />
            )}
          </View>
        )}
      </View>
    </>
  );
}
