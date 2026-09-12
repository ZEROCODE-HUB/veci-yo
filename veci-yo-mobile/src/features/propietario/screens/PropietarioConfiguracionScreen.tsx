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
import type {
  PropietarioStackParamList,
  SharedStackParamList,
} from "@/shared/types";

type Nav = NativeStackNavigationProp<
  PropietarioStackParamList & SharedStackParamList,
  "PropietarioConfiguracion"
>;

const ROL_COLORES: Record<string, { bg: string; color: string }> = {
  Propietario: { bg: "#F3E8FF", color: "#7C3AED" },
  "Inquilino Lider": { bg: "#FEF9C3", color: "#854D0E" },
  Residente: { bg: "#E0F2FE", color: "#0369A1" },
  Corresidente: { bg: "#E0F2FE", color: "#0369A1" },
  Coadministrador: { bg: "#FCE7F3", color: "#BE185D" },
  Familiar: { bg: "#F0FDF4", color: "#166534" },
};

const GRUPOS_JERARQUIA = [
  {
    titulo: "Residente Inquilino Lider",
    roles: ["Inquilino Lider"],
    indent: false,
  },
  { titulo: "Residente", roles: ["Residente", "Corresidente"], indent: true },
  { titulo: "Coadministrador", roles: ["Coadministrador"], indent: false },
];

const VEHICULOS_TIPOS = [
  "Automóvil",
  "Camioneta",
  "Motocicleta",
  "Bicicleta",
  "Otro",
];

export function PropietarioConfiguracionScreen() {
  const navigation = useNavigation<Nav>();
  const { rolActivo, usuario } = useAuthStore();
  const { ubicaciones } = useUbicacionStore();
  const { addToast } = useUIStore();
  const {
    residentes,
    propietarioAnfitrionPrimario,
    propietarioAdministradorPrimario,
    residentesDeclarados,
    agregarResidente,
    eliminarResidente,
    setAnfitrionPrimario,
    setAdministradorPrimario,
    togglePropietarioResidente,
  } = usePropietarioConfiguracion();

  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const unidades = useAdminStore((state) => state.unidades);
  const unidadActual = unidades.find((u) => u.id === ubicacionActiva?.id);
  const maxEstacionamientos = unidadActual?.estacionamientos ?? 0;
  const esResidente = residentesDeclarados[usuario?.correo || ""] ?? true;

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
    tipo: "Automóvil",
  });
  const [vehiculos, setVehiculos] = useState<
    Array<{ id: number; placa: string; tipo: string }>
  >([]);

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

  const handleAgregarFamiliar = () => {
    if (!familiar.nombre.trim()) return;
    agregarResidente({
      nombre: familiar.nombre,
      rol: familiar.rol || "Residente",
      ci: familiar.identificacion,
      correo: familiar.correo,
      telefono: familiar.telefono,
      fecha: new Date().toLocaleDateString("es-AR"),
      codigoArea: "",
      tipo: "",
      contactoNombre: "",
      contactoCodigo: "",
      contactoTelefono: "",
      fechaInicio: "",
      duracion: "",
      montoAlquiler: "",
      monitoreoPago: false,
      servicios: {},
    });
    addToast(
      `${familiar.nombre} ha sido agregado como ${familiar.rol.toLowerCase()}.`,
      "success",
    );
    setShowFamiliar(false);
    setFamiliar({
      nombre: "",
      correo: "",
      identificacion: "",
      rol: "Residente",
      mayor18: false,
      telefono: "",
    });
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
    setVehiculos((prev) => [
      ...prev,
      {
        id: Date.now(),
        placa: formVehiculo.placa.toUpperCase().trim(),
        tipo: formVehiculo.tipo,
      },
    ]);
    setFormVehiculo({ placa: "", tipo: "Automóvil" });
    setShowAgregarVehiculo(false);
    addToast("Vehículo registrado correctamente", "success");
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
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            className="flex-1 text-sm"
            style={{ color: "#374151", lineHeight: 20 }}
          >
            Empresa o persona que te ayuda con la gestión de tu propiedad, ej:
            realizando pagos. Podrá administrar tu propiedad en esta aplicación
            con tus mismas funcionalidades.
          </Text>
          <Text style={{ fontSize: 22 }}>▶️</Text>
        </View>

        {/* Propietario card */}
        {rolActivo === "propietario" && usuario && (
          <>
            <Text className="text-sm font-bold text-gray-900 mt-1">
              Propietario
            </Text>
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#fff",
                shadowColor: "#000",
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
                        style={{ backgroundColor: "#FFF8E1", color: "#F5B800" }}
                      >
                        {" "}
                        Anfitrión primario
                      </Text>
                    )}
                    {propietarioAdministradorPrimario && (
                      <Text
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#FCE7F3", color: "#BE185D" }}
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
                    <Text className="text-xs" style={{ color: "#6B7280" }}>
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
                style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
              >
                <Checkbox
                  checked={propietarioAnfitrionPrimario}
                  onChange={() => setAnfitrionPrimario("propietario")}
                  label="Anfitrión primario"
                />
                <Checkbox
                  checked={propietarioAdministradorPrimario}
                  onChange={() => setAdministradorPrimario("propietario")}
                  label="Administrador primario"
                />
                <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                  Por defecto el propietario es anfitrión y administrador
                  primario. Puedes reasignarlo.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Residentes actuales */}
        <Text className="text-base font-bold text-gray-900 mt-2">
          Residentes actuales ({residentes.length})
        </Text>
        <Text className="text-xs" style={{ color: "#6B7280", lineHeight: 18 }}>
          El Residente Inquilino Lider o el Propietario son quienes pueden
          agregar o editar los residentes de la propiedad.
        </Text>

        {GRUPOS_JERARQUIA.map((grupo) => {
          const items = residentes.filter((r) => grupo.roles.includes(r.rol));
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
                      borderLeftColor: "#F3F4F6",
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
                    backgroundColor: "#fff",
                    shadowColor: "#000",
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
                              backgroundColor: "#FFF8E1",
                              color: "#F5B800",
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
                              backgroundColor: "#FCE7F3",
                              color: "#BE185D",
                            }}
                          >
                            {" "}
                            Admin primario
                          </Text>
                        )}
                      </Text>
                      <View className="flex-row justify-between">
                        <Text className="text-sm" style={{ color: "#6B7280" }}>
                          CI: {r.ci}
                        </Text>
                        <Text className="text-sm" style={{ color: "#6B7280" }}>
                          {r.fecha}
                        </Text>
                      </View>
                      <View className="flex-row gap-1.5 flex-wrap mt-1">
                        <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                          {(r as any).datosVisibles === false
                            ? "🔒 Datos ocultos"
                            : "👁️ Datos visibles"}
                        </Text>
                        <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                          {(r as any).contactableChat ? "💬 Chat" : "💬✕"}
                        </Text>
                        <Text className="text-xs" style={{ color: "#9CA3AF" }}>
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
                            if (!(r as any).esAnfitrionPrimario)
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
                            if (!(r as any).esAdministradorPrimario)
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
                        color="#6B7280"
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
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            className="text-xs text-center mb-3"
            style={{ color: "#9CA3AF" }}
          >
            {vehiculos.length} de {maxEstacionamientos} estacionamiento(s) asignado(s)
          </Text>
          {vehiculos.length > 0 && (
            <View className="flex-col gap-2 mb-3">
              {vehiculos.map((v) => (
                <View
                  key={v.id}
                  className="flex-row justify-between items-center p-2.5 rounded-xl"
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      {v.placa}
                    </Text>
                    <Text className="text-xs" style={{ color: "#6B7280" }}>
                      {v.tipo}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setVehiculos((prev) => prev.filter((x) => x.id !== v.id));
                      addToast("Vehículo eliminado", "success");
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: "#EF4444" }}
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
          onPress={() => navigation.navigate("HuespedesTemporales")}
        >
          <Text>Configuración de funcionalidad:{"\n"}Huéspedes Temporales</Text>
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
                  "Si tienes inquilinos y no vives en esta propiedad, recomendamos configurarte como NO residente.",
                ]
              : [
                  "Al configurarte como NO residente, dejaras de acceder al contenido de las funcionalidades: visitas, correspondencia y zonas comunes.",
                  "Solo quienes sean residentes tendrán acceso al contenido de visitas, correspondencia y zonas comunes.",
                  "Quienes configures como residentes sabrán si te has configurado o no como residente.",
                ]
            ).map((p, i) => (
              <Text
                key={i}
                className="text-sm"
                style={{
                  color: i === 0 ? "#111827" : "#6B7280",
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
            onPress={() => {
              togglePropietarioResidente(
                usuario?.correo || "",
                pendienteResidenteValue,
              );
              setShowResidentePopup(false);
            }}
          >
            Confirmar
          </Button>
        </View>
      </Modal>

      {/* Agregar Familiar */}
      <Modal
        visible={showFamiliar}
        onClose={() => setShowFamiliar(false)}
        title="Agregar Residente / Corresidente"
      >
        <View className="flex-col gap-3">
          <Text
            className="text-sm font-semibold text-center text-gray-900"
            style={{ lineHeight: 20 }}
          >
            Completar los datos solicitados para agregar al residente
          </Text>
          <View
            className="rounded-2xl p-4 gap-2.5"
            style={{ backgroundColor: "#F2F2F7" }}
          >
            <Text className="text-sm font-bold text-center text-gray-900 underline mb-0.5">
              Nuevo Residente / Corresidente
            </Text>
            <Input
              label="Nombre y Apellido"
              value={familiar.nombre}
              onChangeText={setFamiliarField("nombre")}
              placeholder="Nombre completo"
            />
            <Input
              label="Correo electronico"
              value={familiar.correo}
              onChangeText={setFamiliarField("correo")}
              placeholder="correo@mail.com"
              type="email"
            />
            <Input
              label="Identificación"
              value={familiar.identificacion}
              onChangeText={setFamiliarField("identificacion")}
              placeholder="Número de identificación"
            />
            <Select
              label="Rol"
              value={familiar.rol}
              options={["Residente", "Corresidente"]}
              onChange={(v) => setFamiliarField("rol")(String(v))}
              placeholder="Seleccionar rol"
            />
            <View className="flex-row items-center gap-2.5">
              <Text className="text-sm text-gray-900">Mayor de 18 años</Text>
              <Toggle
                value={familiar.mayor18}
                onChange={(v) => setFamiliarField("mayor18")(v)}
              />
            </View>
            <Input
              label="Teléfono"
              value={familiar.telefono}
              onChangeText={setFamiliarField("telefono")}
              placeholder="+5965165136546"
            />
          </View>
          <Button variant="primary" onPress={handleAgregarFamiliar}>
            Agregar
          </Button>
          <Pressable className="items-center">
            <Text className="text-sm text-gray-900 underline">Importante:</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Crear Votación */}
      <Modal
        visible={showVotacion}
        onClose={() => setShowVotacion(false)}
        title="Crear Votación"
      >
        <View className="flex-col gap-2.5">
          <View>
            <Text className="text-sm font-bold text-center text-gray-900 underline mb-1.5">
              Título*
            </Text>
            <Input
              value={votacion.titulo}
              onChangeText={setVotacionField("titulo")}
              placeholder="Título de la votación"
              multiline
            />
          </View>
          <View>
            <Text className="text-sm font-bold text-center text-gray-900 underline mb-1.5">
              Descripción*
            </Text>
            <Input
              value={votacion.descripcion}
              onChangeText={setVotacionField("descripcion")}
              placeholder="Descripción"
              multiline
            />
          </View>
          <Select
            value={votacion.categoria}
            options={[
              "Mantenimiento",
              "Seguridad",
              "Administración",
              "Comunidad",
              "Servicios",
            ]}
            onChange={(v) => setVotacionField("categoria")(String(v))}
            placeholder="Categoría"
          />
          <Select
            value={votacion.destinatario}
            options={[
              "Todos los residentes",
              "Residentes activos",
              "Administración",
              "Propietarios",
            ]}
            onChange={(v) => setVotacionField("destinatario")(String(v))}
            placeholder="Destinatario"
          />
          <View className="flex-row items-center gap-2.5">
            <Toggle
              value={votacion.esVotacion}
              onChange={(v) => setVotacionField("esVotacion")(v)}
            />
            <Text className="text-sm text-gray-900">Votación</Text>
          </View>
          <Button variant="primary" onPress={handlePublicar}>
            Publicar
          </Button>
        </View>
      </Modal>

      {/* Agregar vehículo */}
      <Modal
        visible={showAgregarVehiculo}
        onClose={() => setShowAgregarVehiculo(false)}
        title="Agregar vehículo"
      >
        <View className="flex-col gap-4">
          <Input
            label="Placa del vehículo"
            value={formVehiculo.placa}
            onChangeText={(v) => setFormVehiculo((p) => ({ ...p, placa: v }))}
            placeholder="Ej: ABC-1234"
          />
          <Select
            label="Tipo de vehículo"
            value={formVehiculo.tipo}
            options={VEHICULOS_TIPOS}
            onChange={(v) =>
              setFormVehiculo((p) => ({ ...p, tipo: String(v) }))
            }
          />
          <View
            className="rounded-xl p-3"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <Text
              className="text-xs"
              style={{ color: "#2563EB", lineHeight: 18 }}
            >
              Puedes registrar hasta {maxEstacionamientos} vehículo(s). Ya tienes{" "}
              {vehiculos.length} registrado(s).
            </Text>
          </View>
          <Button variant="primary" onPress={handleAgregarVehiculo}>
            Registrar vehículo
          </Button>
          <Button variant="ghost" onPress={() => setShowAgregarVehiculo(false)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
