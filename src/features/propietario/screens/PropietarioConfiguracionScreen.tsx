import { theme } from "@/config";
import React, { useState, useLayoutEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminStore,
  useAuthStore,
  useUbicacionStore,
  useUIStore,
} from "@/stores";
import { usePropietarioConfiguracion } from "../hooks/usePropietarioConfiguracion";
import { residentesActuales } from "../services/residentesActuales";
import { ModalesConfiguracion } from "../components/configuracion/ModalesConfiguracion";
import {
  TIPOS_VEHICULO_RESIDENTE,
  useVehiculosResidente,
  type VehiculoResidente,
} from "../hooks/useVehiculosResidente";
import {
  Button,
  Input,
  Select,
  Toggle,
  Modal,
  BottomSheet,
  BottomSheetOption,
  Checkbox,
} from "@/shared/components";
import { formatDate } from "@/shared/utils";
import type {
  PropietarioStackParamList,
  SharedStackParamList,
} from "@/shared/types";

type Nav = NativeStackNavigationProp<
  PropietarioStackParamList & SharedStackParamList,
  "PropietarioConfiguracion"
>;

const ROL_COLORES: Record<string, { bg: string; color: string }> = {
  Propietario: {
    bg: theme.colors.badgeVioletBg,
    color: theme.colors.badgeVioletText,
  },
  "Inquilino Lider": {
    bg: theme.colors.warningSoft,
    color: theme.colors.badgeAmberText,
  },
  Residente: { bg: theme.colors.badgeSkyBg, color: theme.colors.badgeSkyText },
  Corresidente: {
    bg: theme.colors.badgeSkyBg,
    color: theme.colors.badgeSkyText,
  },
  Coadministrador: {
    bg: theme.colors.accentPink,
    color: theme.colors.accentPinkText,
  },
  Familiar: {
    bg: theme.colors.successSoft,
    color: theme.colors.badgeGreenText,
  },
};

/*
  Los grupos tienen que cubrir el enum `rol_unidad` entero. Faltaba
  `huesped_temporal`: se contaba en «Residentes actuales (4)» y no caia en
  ningun grupo, asi que el titulo anunciaba cuatro personas y debajo no habia
  ni una tarjeta. Un rol sin grupo desaparece sin avisar.
*/
const GRUPOS_JERARQUIA = [
  {
    titulo: "Residente Inquilino Lider",
    roles: ["Inquilino Lider"],
    indent: false,
  },
  { titulo: "Residente", roles: ["Residente", "Corresidente"], indent: true },
  { titulo: "Huésped Temporal", roles: ["Huesped Temporal"], indent: true },
  { titulo: "Coadministrador", roles: ["Coadministrador"], indent: false },
  { titulo: "Propietario", roles: ["Propietario"], indent: false },
];

// `VEHICULOS_TIPOS` era un cuarto vocabulario propio -- "Automóvil",
// "Motocicleta", "Bicicleta", "Otro" -- que no coincidía con el enum de la
// base ni con el del alta de visitas. Sale de `tipo_vehiculo`.

export function PropietarioConfiguracionScreen() {
  const navigation = useNavigation<Nav>();
  const { rolActivo, usuario } = useAuthStore();
  const { ubicaciones, agregarUbicacion } = useUbicacionStore();
  const { addToast } = useUIStore();
  const {
    residentes,
    propietarioAnfitrionPrimario,
    propietarioAdministradorPrimario,
    yo,
    esResidente,
    eliminarResidente,
    setAnfitrionPrimario,
    setAdministradorPrimario,
    togglePropietarioResidente,
  } = usePropietarioConfiguracion();

  /*
    «Actuales» mira la fecha. De los cuatro huespedes que la 102 tiene dados de
    alta, uno termino su estancia en agosto y otra llega en octubre: contarlos
    hacia que el titulo dijera cuatro por gente que hoy no vive ahi.
  */
  const deHoy = residentesActuales(residentes);

  /*
    Las dos casillas de primario **no se pueden desmarcar**, y eso esta bien:
    la vivienda tiene que tener un anfitrion primario --el libro del huesped
    dice «contacta al anfitrion primario del departamento»-- y el indice unico
    de la base no admite dos. No se quita: se le pasa a otra persona.

    Lo que estaba mal era el silencio. Al pulsar una casilla ya marcada el
    manejador volvia a designar a la misma persona: ni cambiaba nada, ni
    avisaba de nada. Indistinguible de un boton roto, que en este proyecto es
    justo lo que hay que descartar ocho veces antes de creerselo.
  */
  const yaEsPrimario = (cual: "anfitrion" | "administrador") =>
    addToast(
      cual === "anfitrion"
        ? "La vivienda necesita un anfitrión primario. Para cambiarlo, marca a otra persona de la lista."
        : "La vivienda necesita un administrador primario. Para cambiarlo, marca a otra persona de la lista.",
      "info",
    );

  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const { unidades, tipologias, propietariosInvited, aceptarInvitacion } =
    useAdminStore();
  const unidadActual = unidades.find((u) => u.id === ubicacionActiva?.id);
  const invitacionPropietario = propietariosInvited.find(
    (invitacion) =>
      invitacion.email === usuario?.correo && invitacion.estado === "pendiente",
  );
  const unidadAsignada = unidades.find(
    (unidad) => unidad.id === invitacionPropietario?.unidadId,
  );
  const tipologiaAsignada = tipologias.find(
    (tipologia) => tipologia.id === unidadAsignada?.tipologiaId,
  );
  const maxEstacionamientos = unidadActual?.estacionamientos ?? 0;
  /*
    Salía de `residentesDeclarados[correo]`, un mapa en memoria indexado por
    correo —que la regla 3 prohíbe como clave de identidad—. Ahora es
    `membresia_unidad.es_residente`, que es lo que `audiencia_alcanza` ya
    miraba para decidir qué anuncios le llegan a cada quien.
  */

  const [menuResidente, setMenuResidente] = useState<any>(null);
  const [deleteResidente, setDeleteResidente] = useState<any>(null);
  const [showResidentePopup, setShowResidentePopup] = useState(false);
  const [pendienteResidenteValue, setPendienteResidenteValue] = useState(true);

  // Familiar modal
  const [showFamiliar, setShowFamiliar] = useState(false);
  const [familiar, setFamiliar] = useState({
    nombre: "",
    correo: "",
    identificacion: "",
    mayor18: false,
    telefono: "",
    rol: "Residente",
  });
  const setFamiliarField = (key: string) => (v: string | boolean) =>
    setFamiliar((p) => ({ ...p, [key]: v }));

  // Votacion modal
  const [showVotacion, setShowVotacion] = useState(false);
  const [votacion, setVotacion] = useState({
    titulo: "",
    descripcion: "",
    categoria: "",
    destinatario: "",
    esVotacion: false,
  });
  const setVotacionField = (key: string) => (v: string | boolean) =>
    setVotacion((p) => ({ ...p, [key]: v }));

  // Vehiculo modal
  const [showAgregarVehiculo, setShowAgregarVehiculo] = useState(false);
  const [formVehiculo, setFormVehiculo] = useState({
    placa: "",
    tipo: TIPOS_VEHICULO_RESIDENTE[0],
  });
  // Los vehiculos vivian en este `useState`: se perdian al salir de la
  // pantalla y no llegaban a la porteria.
  const {
    vehiculos,
    agregar: agregarVehiculo,
    quitar: quitarVehiculo,
    guardando: guardandoVehiculo,
  } = useVehiculosResidente((unidadActual as any)?.uuid ?? "");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("CrearRol", {})}
          className="items-center justify-center mr-1 bg-primary"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
          }}
        >
          <Text className="text-white text-lg font-bold">+</Text>
        </Pressable>
      ),
    });
  }, []);

  const handleEliminar = () => {
    addToast(
      `${deleteResidente?.nombre} ha sido eliminado como residente.`,
      "success",
    );
    eliminarResidente(deleteResidente.id);
    setDeleteResidente(null);
  };

  /*
    Escribía en `propietario-store`: la persona aparecía en la lista hasta
    recargar y no llegaba a ninguna tabla. Dar de alta a alguien en una
    vivienda es una invitación —o, si es menor, `registrar_menor()`—, y eso ya
    existe y está bien hecho en la pantalla de Invitar. No se duplica aquí.
  */
  const handleAgregarFamiliar = () => {
    setShowFamiliar(false);
    navigation.navigate("InvitarAUnidad" as never);
  };

  const handleAgregarVehiculo = () => {
    if (!formVehiculo.placa.trim()) {
      addToast("Ingresa la placa del vehículo", "error");
      return;
    }
    if (vehiculos.length >= maxEstacionamientos) {
      addToast(
        `Máximo ${maxEstacionamientos} vehículo(s) para este departamento`,
        "error",
      );
      return;
    }
    agregarVehiculo({ placa: formVehiculo.placa, tipo: formVehiculo.tipo });
    setFormVehiculo({ placa: "", tipo: TIPOS_VEHICULO_RESIDENTE[0] });
    setShowAgregarVehiculo(false);
  };

  const handlePublicar = () => {
    setShowVotacion(false);
    setVotacion({
      titulo: "",
      descripcion: "",
      categoria: "",
      destinatario: "",
      esVotacion: false,
    });
    addToast("Votación publicada", "success");
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
        {/* Coadministrador info card */}
        <View
          className="rounded-2xl p-4 flex-row items-start gap-3"
          style={{
            backgroundColor: theme.colors.bgCard,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            className="flex-1 text-sm"
            style={{ color: theme.colors.textStrong, lineHeight: 20 }}
          >
            Empresa o persona que te ayuda con la gestión de tu propiedad, ej:
            realizando pagos. Podrá administrar tu propiedad en esta aplicación
            con tus mismas funcionalidades.
          </Text>
          <Text style={{ fontSize: 22 }}>▶️</Text>
        </View>

        {/* Propiedad asignada pendiente de aceptación */}
        {rolActivo === "propietario" &&
          usuario &&
          invitacionPropietario &&
          unidadAsignada && (
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: theme.colors.bgCard,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text
                className="text-sm font-semibold mb-2"
                style={{ color: theme.colors.text }}
              >
                Tienes una propiedad asignada: {unidadAsignada.codigo}{" "}
                {tipologiaAsignada ? `(${tipologiaAsignada.nombre})` : ""}
              </Text>
              <View
                className="rounded-xl p-3 flex-row items-center justify-between mb-3"
                style={{ backgroundColor: theme.colors.bgMuted }}
              >
                <View className="flex-1 gap-1">
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Tu rol en esta propiedad
                  </Text>
                  <Text
                    className="self-start text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: ROL_COLORES.Propietario.bg,
                      color: ROL_COLORES.Propietario.color,
                    }}
                  >
                    Propietario
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    ¿Eres también Residente?
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      No
                    </Text>
                    <Toggle
                      value={esResidente}
                      onChange={() => {
                        setPendienteResidenteValue(!esResidente);
                        setShowResidentePopup(true);
                      }}
                    />
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Sí
                    </Text>
                  </View>
                </View>
              </View>
              <Button
                variant="primary"
                onPress={() => {
                  togglePropietarioResidente(pendienteResidenteValue);
                  aceptarInvitacion(invitacionPropietario.id);
                  const nuevaUbicacionId = agregarUbicacion({
                    direccion: `Torre ${unidadAsignada.torreNumero} - ${unidadAsignada.codigo}`,
                    alias: unidadAsignada.codigo,
                  });
                  navigation.navigate("Aceptar", {
                    ubicacionId: nuevaUbicacionId,
                    unidadId: unidadAsignada.id,
                  });
                }}
              >
                Aceptar invitación
              </Button>
            </View>
          )}

        {/* Propietario card */}
        {rolActivo === "propietario" && usuario && (
          <>
            <Text className="text-sm font-bold text-gray-900 mt-1">
              Propietario
            </Text>
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: theme.colors.bgCard,
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1" style={{ minWidth: 0 }}>
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    {usuario.nombre} {usuario.apellido || ""}
                    {propietarioAnfitrionPrimario && (
                      <Text
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: theme.colors.primaryLight,
                          color: theme.colors.primary,
                        }}
                      >
                        {" "}
                        Anfitrión primario
                      </Text>
                    )}
                    {propietarioAdministradorPrimario && (
                      <Text
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: theme.colors.accentPink,
                          color: theme.colors.accentPinkText,
                        }}
                      >
                        {" "}
                        Admin primario
                      </Text>
                    )}
                  </Text>
                  <View className="flex-row gap-1.5 flex-wrap mb-2">
                    <Text
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: ROL_COLORES["Propietario"].bg,
                        color: ROL_COLORES["Propietario"].color,
                      }}
                    >
                      Propietario
                    </Text>
                    <Text
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          ROL_COLORES[
                            esResidente ? "Residente" : "Corresidente"
                          ].bg,
                        color:
                          ROL_COLORES[
                            esResidente ? "Residente" : "Corresidente"
                          ].color,
                      }}
                    >
                      {esResidente ? "Residente" : "No residente"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Residente:
                    </Text>
                    <Toggle
                      value={esResidente}
                      onChange={() => {
                        setPendienteResidenteValue(!esResidente);
                        setShowResidentePopup(true);
                      }}
                    />
                  </View>
                </View>
              </View>
              <View
                className="flex-col gap-1.5 mt-3 pt-3"
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.borderLight,
                }}
              >
                <Checkbox
                  checked={propietarioAnfitrionPrimario}
                  onChange={() =>
                    propietarioAnfitrionPrimario
                      ? yaEsPrimario("anfitrion")
                      : yo && setAnfitrionPrimario(yo.id)
                  }
                  label="Anfitrión primario"
                />
                <Checkbox
                  checked={propietarioAdministradorPrimario}
                  onChange={() =>
                    propietarioAdministradorPrimario
                      ? yaEsPrimario("administrador")
                      : yo && setAdministradorPrimario(yo.id)
                  }
                  label="Administrador primario"
                />
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textMuted }}
                >
                  Por defecto el propietario es anfitrión y administrador
                  primario. Puedes reasignarlo.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Residentes actuales */}
        <Text className="text-base font-bold text-gray-900 mt-2">
          Residentes actuales ({deHoy.length})
        </Text>
        <Text
          className="text-xs"
          style={{ color: theme.colors.textSecondary, lineHeight: 18 }}
        >
          El Residente Inquilino Lider o el Propietario son quienes pueden
          agregar o editar los residentes de la propiedad.
        </Text>

        {GRUPOS_JERARQUIA.map((grupo) => {
          const items = deHoy.filter((r) => grupo.roles.includes(r.rol));
          if (items.length === 0) return null;
          return (
            <View
              key={grupo.titulo}
              className="flex-col gap-2.5"
              style={
                grupo.indent
                  ? {
                      paddingLeft: 14,
                      borderLeftWidth: 2,
                      borderLeftColor: theme.colors.borderLight,
                    }
                  : {}
              }
            >
              <Text className="text-sm font-bold text-gray-900">
                {grupo.titulo}
              </Text>
              {items.map((r) => (
                <View
                  key={r.id}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: theme.colors.bgCard,
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {r.nombre}
                        {(r as any).esAnfitrionPrimario && (
                          <Text
                            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.colors.primaryLight,
                              color: theme.colors.primary,
                            }}
                          >
                            {" "}
                            Anfitrión primario
                          </Text>
                        )}
                        {(r as any).esAdministradorPrimario && (
                          <Text
                            className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.colors.accentPink,
                              color: theme.colors.accentPinkText,
                            }}
                          >
                            {" "}
                            Admin primario
                          </Text>
                        )}
                      </Text>
                      <View className="flex-row justify-between">
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          CI: {r.ci}
                        </Text>
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {r.fecha}
                        </Text>
                      </View>
                      <View className="flex-row gap-1.5 flex-wrap mt-1">
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {(r as any).datosVisibles === false
                            ? "🔒 Datos ocultos"
                            : "👁️ Datos visibles"}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {(r as any).contactableChat ? "💬 Chat" : "💬✕"}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {(r as any).contactableWhatsapp
                            ? "📱 WhatsApp"
                            : "📱✕"}
                        </Text>
                      </View>
                      {(r.rol === "Residente" ||
                        r.rol === "Corresidente" ||
                        r.rol === "Inquilino Lider" ||
                        r.rol === "Propietario") && (
                        <Checkbox
                          checked={!!(r as any).esAnfitrionPrimario}
                          onChange={() => {
                            if ((r as any).esAnfitrionPrimario)
                              return yaEsPrimario("anfitrion");
                            setAnfitrionPrimario(r.id);
                          }}
                          label="Anfitrión primario"
                        />
                      )}
                      {(r.rol === "Coadministrador" ||
                        r.rol === "Propietario") && (
                        <Checkbox
                          checked={!!(r as any).esAdministradorPrimario}
                          onChange={() => {
                            if ((r as any).esAdministradorPrimario)
                              return yaEsPrimario("administrador");
                            setAdministradorPrimario(r.id);
                          }}
                          label="Administrador primario"
                        />
                      )}
                    </View>
                    <Pressable
                      onPress={() => setMenuResidente(r)}
                      className="p-1"
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Mis Vehículos */}
        <Text className="text-sm font-bold text-gray-900 mt-2">
          Mis Vehículos
        </Text>
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: theme.colors.bgCard,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            className="text-xs text-center mb-3"
            style={{ color: theme.colors.textMuted }}
          >
            {vehiculos.length} de {maxEstacionamientos} estacionamiento(s)
            asignado(s)
          </Text>
          {vehiculos.length > 0 && (
            <View className="flex-col gap-2 mb-3">
              {vehiculos.map((v: VehiculoResidente) => (
                <View
                  key={v.uuid}
                  className="flex-row justify-between items-center p-2.5 rounded-xl"
                  style={{ backgroundColor: theme.colors.bgMuted }}
                >
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      {v.placa}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {v.tipo}
                    </Text>
                  </View>
                  <Pressable onPress={() => quitarVehiculo(v.uuid)}>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: theme.colors.danger }}
                    >
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {vehiculos.length < maxEstacionamientos && (
            <Button
              variant="primary"
              onPress={() => setShowAgregarVehiculo(true)}
            >
              + Agregar vehículo
            </Button>
          )}
        </View>

        <View className="h-4" />

        <Button
          variant="primary"
          onPress={() => navigation.navigate("InvitarAUnidad")}
        >
          <Text>Invitar a alguien a la vivienda</Text>
        </Button>

        <View className="h-2" />

        <Button
          variant="primary"
          onPress={() => navigation.navigate("HuespedesTemporales")}
        >
          <Text>Configuración de funcionalidad:{"\n"}Huéspedes Temporales</Text>
        </Button>

        <View className="h-2" />

        {/*
          La pantalla de historial estaba registrada en la navegación y
          **ninguna otra navegaba a ella**: era inalcanzable desde la interfaz.
          El KT lista "ver historial de contrato" entre lo que hace el
          Propietario, y este es el sitio donde ya están las otras dos cosas
          que hace con su vivienda.
        */}
        <Button
          variant="secondary"
          onPress={() => navigation.navigate("HistorialContrato")}
        >
          <Text>Contratos de arrendamiento</Text>
        </Button>
      </ScrollView>

      {/* Menú ⋮ residente */}
      <BottomSheet
        visible={!!menuResidente}
        onClose={() => setMenuResidente(null)}
      >
        <BottomSheetOption
          label="Editar"
          onPress={() => {
            const r = menuResidente;
            setMenuResidente(null);
            navigation.navigate("CrearRol", { editar: r });
          }}
        />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => {
            setDeleteResidente(menuResidente);
            setMenuResidente(null);
          }}
        />
        <BottomSheetOption
          label="Denunciar / Reportar"
          variant="primary"
          onPress={() => {
            const residente = menuResidente;
            setMenuResidente(null);
            navigation.navigate("ReclamoNuevo", {
              categoriaPreseleccionada: "Denuncia entre departamentos",
              tituloPreseleccionado: `Denuncia: ${residente?.nombre || ""}`,
              descripcionPreseleccionada: `Reporte desde Configuración contra: ${residente?.nombre || ""} (CI: ${residente?.ci || ""})`,
            });
          }}
        />
      </BottomSheet>

      {/* Eliminar residente */}
      <Modal
        visible={!!deleteResidente}
        onClose={() => setDeleteResidente(null)}
        title="Eliminar residente"
      >
        <View className="flex-col gap-4">
          <Text className="text-base text-center text-gray-900">
            ¿Seguro que deseas eliminar a{" "}
            <Text className="font-bold">{deleteResidente?.nombre}</Text>?
          </Text>
          <Button variant="danger" onPress={handleEliminar}>
            Eliminar
          </Button>
          <Button variant="ghost" onPress={() => setDeleteResidente(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>

      {/* Declaración de residencia */}
      <Modal
        visible={showResidentePopup}
        onClose={() => setShowResidentePopup(false)}
        title={
          pendienteResidenteValue
            ? "Declaración de residencia"
            : "Declaración de no residencia"
        }
      >
        <View className="flex-col gap-4 items-center text-center py-2">
          <Text style={{ fontSize: 48 }}>
            {pendienteResidenteValue ? "🏠" : "🚫"}
          </Text>
          <View className="flex-col gap-3.5 w-full">
            {(pendienteResidenteValue
              ? [
                  "Al configurarte como residente, tendrás acceso al contenido detallado de las funcionalidades: Visitas, Correspondencia y Zonas comunes.",
                  "Los demás co-residentes de la propiedad podrán saber que estas visualizando esta información.",
                  "Si tienes inquilinos y no vives en esta propiedad, recomendamos configurarte como NO residente, para mantener la privacidad de los residentes, sin embargo tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.",
                ]
              : [
                  "Al configurarte como NO residente, dejaras de acceder al contenido de las funcionalidades: visitas, correspondencia y zonas comunes, sin embargo, tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.",
                  "Solo quienes sean residentes tendrán acceso al contenido de visitas, correspondencia y zonas comunes.",
                  "Quienes configures como residentes sabrán si te has configurado o no como residente.",
                ]
            ).map((p, i) => (
              <Text
                key={i}
                className="text-sm"
                style={{
                  color:
                    i === 0 ? theme.colors.text : theme.colors.textSecondary,
                  fontWeight: i === 0 ? "600" : "400",
                  lineHeight: 22,
                  textAlign: "center",
                }}
              >
                {p}
              </Text>
            ))}
          </View>
          <Button
            variant="primary"
            fullWidth
            onPress={() => {
              togglePropietarioResidente(pendienteResidenteValue);
              setShowResidentePopup(false);
            }}
          >
            Confirmar
          </Button>
        </View>
      </Modal>

      <ModalesConfiguracion
        showFamiliar={showFamiliar}
        setShowFamiliar={setShowFamiliar}
        familiar={familiar}
        setFamiliarField={setFamiliarField}
        handleAgregarFamiliar={handleAgregarFamiliar}
        showVotacion={showVotacion}
        setShowVotacion={setShowVotacion}
        votacion={votacion}
        setVotacionField={setVotacionField}
        handlePublicar={handlePublicar}
        showAgregarVehiculo={showAgregarVehiculo}
        setShowAgregarVehiculo={setShowAgregarVehiculo}
        formVehiculo={formVehiculo}
        setFormVehiculo={setFormVehiculo}
        handleAgregarVehiculo={handleAgregarVehiculo}
        cantidadVehiculos={vehiculos.length}
        maxEstacionamientos={maxEstacionamientos}
        guardandoVehiculo={guardandoVehiculo}
      />
    </View>
  );
}
