import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Input,
  Modal,
  Select,
  Toggle,
} from "@/shared/components";
import {
  useUnidadesDisponibles,
  useNavegacion,
  useCondominioActivo,
} from "@/shared/hooks";
import { PageHeader, DesplazableConTeclado } from "@/shared/layouts";
import {
  StayFields as StayFieldsView,
  RegulationCard as RegulationCardView,
  VisibilidadDeCuotas,
  MesDelCuadroDeHonor,
  ConfiguracionDeCuotas,
  LimitesDeRentaCorta,
  TerminosDelEdificio,
} from "../components/permisos";
import { useAdministradorPermisos } from "../hooks/useAdministradorPermisos";
import { useVerificacionDeDocumento } from "../hooks/useVerificacionDeDocumento";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";
import { AdminSectionCard } from "../components";
import { PermisoConInterruptor } from "../components/PermisoConInterruptor";

type StayKey = "estanciaCorta" | "estanciaLarga";

/** Lo que significa la opción vacía del selector. */
const TODO_EL_EDIFICIO = "";

export function AdministradorPermisosScreen() {
  const navigation = useNavegacion();
  const condominioId = useCondominioActivo() ?? "";
  /*
    Qué se está configurando: la regla del edificio, o la excepción de una
    vivienda. Las dos cosas existían en la tabla y en la base desde el
    principio --`permisos_de_unidad` combina campo a campo-- y la pantalla
    solo sabía la primera (R-34).
  */
  const [unidadId, setUnidadId] = useState<string>(TODO_EL_EDIFICIO);
  const { unidades } = useUnidadesDisponibles();
  const documento = useVerificacionDeDocumento();
  const {
    data: permisos,
    cargado,
    guardando,
    savePermisos,
    volverAlEdificio,
    volviendo,
  } = useAdministradorPermisos(unidadId || undefined);
  /*
    Sin inventar nada: se toma lo que venga. Aqui habia un
    `estanciaMaxima ?? 3` que volvia a meter el tope de tres dias que se
    quito de `PERMISOS_INICIALES` justo por eso --le decia al propietario que
    su edificio limita las estancias a tres noches cuando nadie lo ha dicho--.
    Era el mismo valor inventado, en el segundo sitio.
  */
  /*
    `null` hasta que llegan los parámetros: lo que vale un permiso sin decidir
    (`permitir_si_no_configurado`) sale de la base, y sin él no hay valores
    de fábrica que enseñar.
  */
  const [form, setFormSiHay] = useState<PermisoVivienda | null>(() =>
    permisos
      ? { ...permisos, diferenciaEstancia: permisos.diferenciaEstancia ?? false }
      : null,
  );
  const setForm = (cambio: (actual: PermisoVivienda) => PermisoVivienda) =>
    setFormSiHay((actual) => (actual ? cambio(actual) : actual));
  /*
    El formulario se rellena **cuando llega lo guardado**, y otra vez al
    cambiar de vivienda.

    Se inicializaba una sola vez, al montar, con lo que hubiera en ese
    instante: los valores de fábrica, porque la consulta todavía no había
    vuelto. Así que la pantalla enseñaba todo en «permitido» aunque el
    edificio tuviera otra cosa, y «Guardar» **pisaba lo guardado** con eso. Y
    al elegir una vivienda el formulario no cambiaba: guardar le copiaba lo
    que hubiera en pantalla (13/10/2026).

    Se hace una vez por destino y no en cada refresco: una relectura al
    volver a la pestaña no puede borrar lo que la persona está tocando.
  */
  const [sincronizadoCon, setSincronizadoCon] = useState<string | null>(null);
  const destino = unidadId || "edificio";
  useEffect(() => {
    if (!cargado || !permisos || sincronizadoCon === destino) return;
    setFormSiHay({
      ...permisos,
      diferenciaEstancia: permisos.diferenciaEstancia ?? false,
    });
    setSincronizadoCon(destino);
  }, [cargado, destino, permisos, sincronizadoCon]);
  const listo = cargado && sincronizadoCon === destino;

  const [showSuccess, setShowSuccess] = useState(false);
  const difference = !!form?.diferenciaEstancia;
  const setFlag = (
    key: "entregaDirecta" | "huespedesTemporales",
    value: boolean,
  ) => setForm((current) => ({ ...current, [key]: value }));
  const setStay = <C extends keyof EstanciaConfig>(
    key: StayKey,
    field: C,
    value: EstanciaConfig[C],
  ) =>
    setForm((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));

  /**
   * La estancia maxima de la corta es la minima de la larga: donde termina
   * una empieza la otra. Por eso cambiar la primera arrastra la segunda.
   */
  const setShortStay = <C extends keyof EstanciaConfig>(
    field: C,
    value: EstanciaConfig[C],
  ) =>
    setForm((current) => ({
      ...current,
      estanciaCorta: { ...current.estanciaCorta, [field]: value },
      ...(field === "estanciaMaxima" && typeof value === "number"
        ? { estanciaLarga: { ...current.estanciaLarga, estanciaMinima: value } }
        : {}),
    }));
  const save = () => {
    // El aviso de exito espera a que el guardado termine. Antes aparecia de
    // inmediato y, si fallaba, se veia el exito y el error a la vez.
    if (!form) return;
    savePermisos(form, { onSuccess: () => setShowSuccess(true) });
  };
  const openRegulations = (tipo: string) =>
    navigation.navigate("ReglaDetalle", { tipo });

  // Sin los parámetros todavía no hay formulario que enseñar.
  if (!form) return null;

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Editar permisos viviendas" />
      <DesplazableConTeclado className="flex-1" contentContainerClassName="p-4 gap-5">
        <AdminSectionCard>
          <Select
            label="Qué se está configurando"
            value={unidadId}
            onChange={(valor) =>
              setUnidadId(String(valor ?? TODO_EL_EDIFICIO))
            }
            options={[
              { value: TODO_EL_EDIFICIO, label: "Todo el edificio" },
              ...unidades.map((u) => ({
                value: u.unidadId,
                label: `Vivienda ${u.codigo}`,
              })),
            ]}
          />
          <Text className="mt-2 text-sm leading-5 text-gray-500">
            {unidadId
              ? "Lo que dejes sin tocar sigue la regla del edificio: una excepción se combina campo a campo, no reemplaza el resto."
              : "La regla general. Cada vivienda puede tener su excepción."}
          </Text>
        </AdminSectionCard>
        <PermisoConInterruptor
          seccion="Visitas"
          etiqueta="La portería verifica el documento"
          ayuda={{
            titulo: "Verificación del documento",
            descripcion:
              "Si está activo, la portería tiene que verificar el documento del invitado antes de registrar su entrada: sin eso no puede marcarla. Aplica a quien tiene un documento anotado. Si se desactiva, no lo pide. A los huéspedes de renta corta se les verifica siempre.",
          }}
          valor={documento.verificar}
          onCambiar={documento.setVerificar}
          deshabilitado={documento.guardando}
        />
        <PermisoConInterruptor
          seccion="Correspondencia"
          etiqueta="Permitir entrega directa en vivienda"
          ayuda={{
            titulo: "Entrega directa en vivienda",
            descripcion:
              "Si esta activo, el repartidor puede subir directamente al departamento a entregar. Si esta desactivado, el residente debe bajar a porteria a recibir.",
          }}
          valor={form.entregaDirecta}
          onCambiar={(value) => setFlag("entregaDirecta", value)}
        />
        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">
            Huespedes Temporales
          </Text>
          <AdminSectionCard>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-base font-semibold text-gray-900">
                Habilitar funcionalidad de renta corta
              </Text>
              <Toggle
                value={form.huespedesTemporales}
                onChange={(value) => setFlag("huespedesTemporales", value)}
                accessibilityLabel="Habilitar funcionalidad de renta corta"
              />
            </View>
            {/* Los límites son del edificio entero, no de una vivienda. */}
            {form.huespedesTemporales && !unidadId ? (
              <View className="mt-4 border-t border-gray-100 pt-4">
                <LimitesDeRentaCorta condominioId={condominioId} />
              </View>
            ) : null}
          </AdminSectionCard>
        </View>
        <AdminSectionCard>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-base font-semibold text-gray-900">
              ¿Su edificio diferencia estancia corta de estancia larga?
            </Text>
            <Toggle
              value={difference}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  diferenciaEstancia: value,
                }))
              }
              accessibilityLabel="Diferenciar estancia corta de estancia larga"
            />
          </View>
          <Text className="text-xs text-gray-400 leading-5">
            Este edificio adapta privilegios para las estadias de corta y larga
            estancia.
          </Text>
          {/*
            Donde esta la frontera. Sin este numero, los dos bloques de reglas
            de abajo estaban ahi y nada podia elegir entre ellos: es lo que
            pidio el cliente --«menos de 1 mes mas limitantes; mas, ya son casi
            residentes»-- y lo que faltaba para que `corta_permite_visitas`
            sirviera de algo.

            Solo se pregunta si el edificio diferencia: si no, no hay dos lados
            que separar.
          */}
          {difference && (
            <View className="mt-3 gap-1">
              <Input
                label="Hasta cuántas noches cuenta como estancia corta"
                soloCifras
                placeholder="30"
                value={
                  form.cortaHastaNoches == null
                    ? ""
                    : String(form.cortaHastaNoches)
                }
                onChangeText={(texto) => {
                  const soloDigitos = texto.replace(/[^0-9]/g, "");
                  setForm((current) => ({
                    ...current,
                    cortaHastaNoches: soloDigitos ? Number(soloDigitos) : null,
                  }));
                }}
              />
              <Text className="text-xs text-gray-400 leading-5">
                {form.cortaHastaNoches
                  ? `Hasta ${form.cortaHastaNoches} noches se aplican las reglas de estancia corta; a partir de ${form.cortaHastaNoches + 1}, las de larga.`
                  : "Mientras no lo digas, todas las estancias se tratan como cortas, que es lo más restrictivo."}
              </Text>
            </View>
          )}
        </AdminSectionCard>
        {!difference && (
          <AdminSectionCard title="Configuracion de estancia">
            <StayFieldsView
              values={form.estanciaCorta}
              onChange={(field, value) => setShortStay(field, value)}
            />
          </AdminSectionCard>
        )}
        {difference && (
          <>
            <AdminSectionCard title="Estancia corta">
              <StayFieldsView
                values={form.estanciaCorta}
                onChange={(field, value) => setShortStay(field, value)}
              />
            </AdminSectionCard>
            <AdminSectionCard title="Estancia larga">
              <StayFieldsView
                values={form.estanciaLarga}
                onChange={(field, value) =>
                  setStay("estanciaLarga", field, value)
                }
              />
            </AdminSectionCard>
          </>
        )}
        {/*
          Qué se publica del estado de las cuotas. Antes del 03/10/2026 no
          había elección: el agregado lo veía cualquier miembro y los nombres
          de quienes pagaron también. Lo pidió el cliente parametrizable, y con
          razón: enseñar quién debe es señalar a un vecino por su nombre.
        */}
        <AdminSectionCard title="Cuota de administración">
          <ConfiguracionDeCuotas condominioId={condominioId} />
        </AdminSectionCard>

        <AdminSectionCard title="Qué se publica de las cuotas">
          <VisibilidadDeCuotas condominioId={condominioId} />
        </AdminSectionCard>

        <AdminSectionCard title="Cuadro de Honor">
          <MesDelCuadroDeHonor condominioId={condominioId} />
        </AdminSectionCard>

        <View className="gap-3">
          <Text className="text-base font-bold text-gray-900">Reglamentos</Text>
          <Text className="text-xs text-gray-500 leading-5">
            Administra los reglamentos para cada tipo de residente.
          </Text>
          <View className="flex-row gap-3">
            <RegulationCardView
              image={require("@/assets/icons/reglas/residente-permanente-1.png")}
              label="Residente Permanente"
              onPress={() => openRegulations("residente-permanente")}
            />
            <RegulationCardView
              image={require("@/assets/icons/reglas/residente-temporal-1.png")}
              label="Huesped Temporal"
              onPress={() => openRegulations("huesped-temporal")}
            />
            <RegulationCardView
              image={require("@/assets/icons/reglas/guardia-seguridad-1.png")}
              label="Guardia de Seguridad"
              onPress={() => openRegulations("guardia-seguridad")}
            />
          </View>
        </View>
        {!unidadId ? (
          <AdminSectionCard title="Términos y condiciones del edificio">
            <TerminosDelEdificio condominioId={condominioId} />
          </AdminSectionCard>
        ) : null}
        {/* Sin lo guardado delante no se guarda: se pisaría con otra cosa. */}
        <Button
          fullWidth
          onPress={save}
          // La rueda del botón: mientras llega lo guardado, o mientras se guarda.
          loading={!listo || guardando}
        >
          Guardar
        </Button>
        {unidadId ? (
          <Button
            variant="secondary"
            fullWidth
            loading={volviendo}
            onPress={() =>
              volverAlEdificio(undefined, {
                // Que el formulario se rellene otra vez con lo que queda.
                onSuccess: () => setSincronizadoCon(null),
              })
            }
          >
            Volver a la regla del edificio
          </Button>
        ) : null}
      </DesplazableConTeclado>
      <Modal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Editar Permisos"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center">
            Sus permisos se guardaron con éxito
          </Text>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => setShowSuccess(false)}
          >
            Entendido
          </Button>
        </View>
      </Modal>
    </View>
  );
}
