import { theme } from "@/config";
import React, { useState, useLayoutEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, useUIStore } from "@/stores";
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
  Toggle,
  Modal,
  BottomSheet,
  BottomSheetOption,
  Checkbox,
} from "@/shared/components";
import type { ResidenteDeUnidad } from "../services/residentes.repo";
import { useUnidadActiva } from "@/shared/hooks";
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
  { titulo: "Coadministrador", roles: ["Coadministrador"], indent: false },
  { titulo: "Propietario", roles: ["Propietario"], indent: false },
  // Al final y con su propio título: no son residentes (16/10/2026).
  { titulo: "Huésped Temporal", roles: ["Huesped Temporal"], indent: true },
];

// `VEHICULOS_TIPOS` era un cuarto vocabulario propio -- "Automóvil",
// "Motocicleta", "Bicicleta", "Otro" -- que no coincidía con el enum de la
// base ni con el del alta de visitas. Sale de `tipo_vehiculo`.

export function PropietarioConfiguracionScreen() {
  const navigation = useNavigation<Nav>();
  const { rolActivo, usuario } = useAuthStore();
  /*
    Quien puede dar de alta gente en la vivienda.

    La base lo dice en `puede_invitar_a_unidad`: el propietario y el inquilino
    lider de la unidad, y nadie mas. Pero la aplicacion le da la vista del
    inquilino lider tambien a `residente`, `corresidente` y `coadministrador`
    --decision D-01, todavia abierta-- asi que a un residente se le ofrecia el
    formulario de invitar, lo rellenaba, y recibia «No tenés permiso para
    invitar a esta unidad».

    Al menos avisa, que es mas de lo que hacen otras pantallas de este
    proyecto. Pero ofrecer un camino que termina siempre en un aviso de que no
    se puede es hacerle perder el tiempo a alguien.

    Esto no decide D-01 --que va de que *ve* un residente--: solo deja de
    ofrecerle lo que la base ya le niega.
  */
  const unidadActiva = useUnidadActiva();
  const puedeGestionarLaVivienda =
    unidadActiva?.rol === "propietario" ||
    unidadActiva?.rol === "inquilino_lider";
  /*
    La renta corta la configura además el coadministrador de la vivienda: es
    lo que dice `puede_configurar_alojamiento` en la base. Un residente no
    (hueco 21, 15/10/2026: le salían las tarjetas y fallaban al tocarlas).
  */
  const puedeConfigurarElAlojamiento =
    puedeGestionarLaVivienda || unidadActiva?.rol === "coadministrador";
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
    apruebaHuespedPorHuesped,
    cambiarPermisoDeVisitas,
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
    cocheras,
  } = useVehiculosResidente(unidadActiva?.unidadId ?? "");

  /*
    Las cocheras **de verdad** de la vivienda. Se buscaba la vivienda
    comparando dos identificadores que nunca coinciden --el de la lista propia
    es 1, 2, 3… y el del edificio sale del uuid-- así que salía siempre «0 de
    0» y no había forma de registrar un vehículo (13/10/2026).
  */
  const maxEstacionamientos = cocheras;

  /*
    Salía de `residentesDeclarados[correo]`, un mapa en memoria indexado por
    correo —que la regla 3 prohíbe como clave de identidad—. Ahora es
    `membresia_unidad.es_residente`, que es lo que `audiencia_alcanza` ya
    miraba para decidir qué anuncios le llegan a cada quien.
  */

  /*
    `ResidenteDeUnidad` y no `Residente`: el que llega es el de la consulta, y su
    `id` es **el de la membresia** --una cadena-- porque es lo que necesitan
    quitar a alguien o cambiarle la visibilidad. `Residente` es el tipo viejo del
    prototipo, con un `id` numerico inventado en el cliente, y con `any` en medio
    los dos pasaban por igual.
  */
  const [menuResidente, setMenuResidente] =
    useState<ResidenteDeUnidad | null>(null);
  const [deleteResidente, setDeleteResidente] =
    useState<ResidenteDeUnidad | null>(null);
  const [showResidentePopup, setShowResidentePopup] = useState(false);
  const [pendienteResidenteValue, setPendienteResidenteValue] = useState(true);



  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Invitar a alguien a la vivienda"
          onPress={() => navigation.navigate("InvitarAUnidad")}
          className="items-center justify-center mr-1 bg-primary"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
          }}
        >
          {/* Un ícono y no la letra «+», que quedaba baja (21/10/2026). */}
          <Ionicons name="add" size={22} color={theme.colors.textInverse} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleEliminar = () => {
    /*
      El nombre iba con `?.` y el id sin nada, asi que sin nadie elegido el aviso
      decia «undefined ha sido eliminado como residente» y la linea siguiente
      reventaba. Con `any` en el estado no lo veia el typecheck.
    */
    if (!deleteResidente) return;
    // El «se dio de baja» lo dice el hook, cuando ya ocurrió. Aquí salía un
    // «ha sido eliminado» al pulsar, antes de escribir nada.
    eliminarResidente(deleteResidente.id);
    setDeleteResidente(null);
  };

  const handleAgregarVehiculo = () => {
    if (!formVehiculo.placa.trim()) {
      addToast("Ingresa la placa del vehículo", "error");
      return;
    }
    if (vehiculos.length >= maxEstacionamientos) {
      addToast(
        `Esta vivienda tiene ${maxEstacionamientos} cochera(s): no caben más vehículos.`,
        "error",
      );
      return;
    }
    if (!/^[A-Za-z0-9 -]{4,10}$/.test(formVehiculo.placa.trim())) {
      addToast("Revisa la placa: solo letras y números, entre 4 y 8.", "error");
      return;
    }
    agregarVehiculo({ placa: formVehiculo.placa, tipo: formVehiculo.tipo });
    setFormVehiculo({ placa: "", tipo: TIPOS_VEHICULO_RESIDENTE[0] });
    setShowAgregarVehiculo(false);
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
          {/*
            Sin el título, en pantalla esto es un párrafo suelto justo debajo del
            «+» de la cabecera, y parece explicar lo que hace ese botón --que en
            realidad agrega a cualquiera, no solo a un coadministrador--. En el
            código el bloque ya se llamaba «Coadministrador info card»; faltaba
            que lo dijera la pantalla.
          */}
          <View className="flex-1 gap-1">
            <Text className="text-sm font-bold text-gray-900">
              Coadministrador
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.colors.textStrong, lineHeight: 20 }}
            >
              Empresa o persona que te ayuda con la gestión de tu propiedad, ej:
              realizando pagos. Podrá administrar tu propiedad en esta
              aplicación con tus mismas funcionalidades.
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>▶️</Text>
        </View>

        {/*
          Aquí había una tarjeta «Tienes una propiedad asignada» con su botón
          «Aceptar invitación». Leía las invitaciones de un store en memoria
          --buscando por **correo**--, que nadie llena desde que las
          invitaciones viven en la base, así que no salía nunca. Y si hubiera
          salido, llevaba a una pantalla que decía «Propiedad aceptada y
          configurada con éxito» sin guardar nada. Una invitación se acepta
          desde su enlace (13/10/2026).
        */}
        {/* Propietario card */}
        {(rolActivo === "propietario" ||
          rolActivo === "propietario-no-residente") &&
          usuario && (
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

        {/*
          Residentes actuales. Los huéspedes temporales ya no cuentan aquí: van
          en su propio bloque, debajo (comparación con la maqueta, 16/10/2026,
          donde «Residentes actuales» son solo los que viven).
        */}
        <Text className="text-base font-bold text-gray-900 mt-2">
          Residentes actuales ({deHoy.filter((r) => r.rol !== "Huesped Temporal").length})
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
          const esHuesped = grupo.roles.includes("Huesped Temporal");
          return (
            <View
              key={grupo.titulo}
              className="flex-col gap-2.5"
              style={
                grupo.indent && !esHuesped
                  ? {
                      paddingLeft: 14,
                      borderLeftWidth: 2,
                      borderLeftColor: theme.colors.borderLight,
                    }
                  : {}
              }
            >
              {esHuesped ? (
                <Text className="text-base font-bold text-gray-900 mt-2">
                  Huéspedes temporales ({items.length})
                </Text>
              ) : (
                <Text className="text-sm font-bold text-gray-900">
                  {grupo.titulo}
                </Text>
              )}
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
                        {r.esAnfitrionPrimario && (
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
                        {r.esAdministradorPrimario && (
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
                          {r.datosVisibles === false
                            ? "🔒 Datos ocultos"
                            : "👁️ Datos visibles"}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {r.contactableChat ? "💬 Chat" : "💬✕"}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {r.contactableWhatsapp
                            ? "📱 WhatsApp"
                            : "📱✕"}
                        </Text>
                      </View>
                      {(r.rol === "Residente" ||
                        r.rol === "Corresidente" ||
                        r.rol === "Inquilino Lider" ||
                        r.rol === "Propietario") && (
                        <Checkbox
                          checked={!!r.esAnfitrionPrimario}
                          onChange={() => {
                            if (r.esAnfitrionPrimario)
                              return yaEsPrimario("anfitrion");
                            setAnfitrionPrimario(r.id);
                          }}
                          label="Anfitrión primario"
                        />
                      )}
                      {/*
                        «Aprobar huésped por huésped»: el anfitrión habilita a
                        cada huésped para registrar visitas (15/10/2026).
                      */}
                      {r.rol === "Huesped Temporal" &&
                      apruebaHuespedPorHuesped &&
                      puedeGestionarLaVivienda ? (
                        <Checkbox
                          checked={r.puedeRegistrarVisitas}
                          onChange={() =>
                            cambiarPermisoDeVisitas(r.id, !r.puedeRegistrarVisitas)
                          }
                          label="Puede registrar visitas"
                        />
                      ) : null}
                      {(r.rol === "Coadministrador" ||
                        r.rol === "Propietario") && (
                        <Checkbox
                          checked={!!r.esAdministradorPrimario}
                          onChange={() => {
                            if (r.esAdministradorPrimario)
                              return yaEsPrimario("administrador");
                            setAdministradorPrimario(r.id);
                          }}
                          label="Administrador primario"
                        />
                      )}
                    </View>
                    <Pressable
                      accessibilityLabel={`Opciones de ${r.nombre}`}
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
          {/*
            Sin cocheras no hay botón, y hay que decir por qué. Salía «0 de 0
            estacionamiento(s) asignado(s)» y nada más: indistinguible de una
            pantalla rota (13/10/2026).
          */}
          {maxEstacionamientos === 0 && (
            <Text className="text-xs text-gray-500">
              Esta vivienda no tiene cocheras asignadas. Se asignan desde la
              administración del edificio.
            </Text>
          )}
        </View>

        {puedeGestionarLaVivienda && (
          <>
            <View className="h-4" />

            <Button
              variant="primary"
              onPress={() => navigation.navigate("InvitarAUnidad")}
            >
              <Text>Invitar a alguien a la vivienda</Text>
            </Button>
          </>
        )}

        <View className="h-2" />

        {puedeConfigurarElAlojamiento && (
          <Button
            variant="primary"
            onPress={() => navigation.navigate("HuespedesTemporales")}
          >
            <Text>Configuración de funcionalidad:{"\n"}Huéspedes Temporales</Text>
          </Button>
        )}

        <View className="h-2" />

        {/*
          La pantalla de historial estaba registrada en la navegación y
          **ninguna otra navegaba a ella**: era inalcanzable desde la interfaz.
          El KT lista "ver historial de contrato" entre lo que hace el
          Propietario, y este es el sitio donde ya están las otras dos cosas
          que hace con su vivienda.
        */}
        {puedeGestionarLaVivienda && (
          <Button
            variant="secondary"
            onPress={() => navigation.navigate("HistorialContrato")}
          >
            <Text>Contratos de arrendamiento</Text>
          </Button>
        )}
        {/*
          Los servicios contratados --luz, agua, internet--. Misma historia que
          el historial de contrato: la pantalla existía, estaba terminada y
          **no se podía alcanzar** --su única ruta vivía en un stack que no
          montaba nadie--. El KT lista «agregar servicio» entre lo que hace el
          propietario, y este es el sitio donde ya están las otras cosas que
          hace con su vivienda.
        */}
        {puedeGestionarLaVivienda && (
          <Button
            variant="secondary"
            onPress={() => navigation.navigate("AgregarServicio")}
          >
            <Text>Servicios contratados</Text>
          </Button>
        )}
      </ScrollView>

      {/* Menú ⋮ residente */}
      <BottomSheet
        visible={!!menuResidente}
        onClose={() => setMenuResidente(null)}
      >
        {/*
          Solo quien gestiona la vivienda. A un residente cualquiera se le
          ofrecían las dos, y «Eliminar» le respondía «eliminado» sin eliminar
          a nadie: la base no le deja.
        */}
        {puedeGestionarLaVivienda && (
          <BottomSheetOption
            label="Editar"
            onPress={() => {
              const r = menuResidente;
              setMenuResidente(null);
              navigation.navigate("CrearRol", { editar: r ?? undefined });
            }}
          />
        )}
        {puedeGestionarLaVivienda && (
          <BottomSheetOption
            label="Dar de baja"
            variant="danger"
            onPress={() => {
              setDeleteResidente(menuResidente);
              setMenuResidente(null);
            }}
          />
        )}
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
