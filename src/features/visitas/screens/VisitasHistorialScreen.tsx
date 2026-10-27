import React, { useLayoutEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useAuthStore, useUbicacionStore, useAdminStore, useUIStore } from "@/stores";
import {
  useNavegacion,
  useParametrosDeLaBase,
  useUnidadActiva,
} from "@/shared/hooks";
import { InfoButton, SuscripcionPagoModal } from "@/shared/components";
import { useVerificacionDeDocumento } from "@/features/administrador/hooks/useVerificacionDeDocumento";
import { VisitaDeleteModal } from "@/features/visitas/components";
import type { VisitaItem } from "@/shared/types";
import { useVisitasHistorial } from "@/features/visitas/hooks";
import { useVisitas } from "@/features/visitas/hooks";
import { useVisitasPermisos } from "@/features/visitas/hooks/useVisitasPermisos";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useHuespedesTemporales } from "@/features/propietario/hooks/useHuespedesTemporales";
import { HELP } from "@/shared/content/helpContent";
import { formatDateInput } from "@/shared/utils";
import { CalendarioVisitas as CalendarioVisitasComponent } from "../components/historial/CalendarioVisitas";
import { TituloDeGrupo } from "../components/historial/TituloDeGrupo";
import {
  agruparParaPorteria,
  type FilaDePorteria,
} from "../helpers/gruposDePorteria";
import { VisitasPersonasView } from "../components/historial/VisitasPersonasView";
import { AsignarEstacionamientoModal } from "../components/historial/AsignarEstacionamientoModal";
import { useEstacionamientosVisita } from "../hooks/useEstacionamientosVisita";
import { useConsumoVerificaciones } from "../hooks/useConsumoVerificaciones";
import { DetalleDeEstancia } from "../components/historial/DetalleDeEstancia";
import { FichaDeVisita } from "../components/historial/FichaDeVisita";
import { MenuDeVisita } from "../components/historial/MenuDeVisita";
import { SuscribirseARentaCorta } from "../components/historial/SuscribirseARentaCorta";
import { TarjetaDelHistorial } from "../components/historial/TarjetaDelHistorial";
import { CabeceraDelHistorial } from "../components/historial/CabeceraDelHistorial";
import { HistorialVacio } from "../components/historial/HistorialVacio";
import { SinAccesoAVisitas } from "../components/historial/SinAccesoAVisitas";
import { useAbrirDesdeElInicio } from "../hooks/useAbrirDesdeElInicio";
import { useHuespedPuedeRegistrar } from "../hooks/useHuespedPuedeRegistrar";

export function VisitasHistorialScreen() {
  const navigation = useNavegacion();
  const parametros = useParametrosDeLaBase();
  const consumoVerificaciones = useConsumoVerificaciones();
  const visitas = useVisitas();
  const {
    items,
    cargando: cargandoVisitas,
    eliminarVisita,
    eliminandoVisita,
    comprarPaquete,
    comprandoPaquete,
  } = visitas;
  // Lo que el edificio decidió sobre el documento de las visitas corrientes.
  const { verificar: exigeDocumento } = useVerificacionDeDocumento();

  const rolActivo = useAuthStore((s) => s.rolActivo);
  const addToast = useUIStore((s) => s.addToast);
  const modoAuth = useAuthStore((s) => s.modo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  /** La vivienda sobre la que se compra el paquete. */
  const unidadDeLaVivienda = useUnidadActiva();
  // El anfitrion decide si su huesped registra visitas (15/10/2026).
  const huespedPuedeRegistrar = useHuespedPuedeRegistrar(
    rolActivo === "huesped-temporal",
    unidadDeLaVivienda?.unidadId,
  );
  // La suscripcion sale de la base, no de un store que se perdia al recargar:
  // es la misma fuente que mira la pantalla de configuracion.
  const renta = useHuespedesTemporales();
  const suscripcionActiva = renta.tieneSuscripcion;
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  // Que cupo ocupa cada visita, desde `asignacion_estacionamiento`.
  const { porVisita: cuposPorVisita } = useEstacionamientosVisita();

  const historial = useVisitasHistorial(items);
  const { search, setSearch, vistaSub, filteredItems } = historial;
  const [menuItem, setMenuItem] = useState<VisitaItem | null>(null);
  const [detailItem, setDetailItem] = useState<VisitaItem | null>(null);
  const [detailPersonIdx, setDetailPersonIdx] = useState<number | null>(null);
  const [deleteItem, setDeleteItem] = useState<VisitaItem | null>(null);
  const [visitaListaDetalle, setVisitaListaDetalle] =
    useState<VisitaItem | null>(null);
  const [reservaDetalle, setReservaDetalle] = useState<VisitaItem | null>(null);
  const [showSuscripcionModal, setShowSuscripcionModal] = useState(false);

  useAbrirDesdeElInicio({
    items,
    cargando: cargandoVisitas,
    setSearch,
    abrir: setReservaDetalle,
  });
  const [parkingItem, setParkingItem] = useState<VisitaItem | null>(null);
  const currentDetailItem = detailItem
    ? items.find((item) => item.id === detailItem.id) || detailItem
    : null;
  const currentReservaDetalle = reservaDetalle
    ? items.find((item) => item.id === reservaDetalle.id) || reservaDetalle
    : null;

  /*
    El modal de estacionamiento vivia **solo** al final de esta pantalla, en la
    rama de la lista, y aqui habia un `const parkingModal = null`. Desde el
    detalle del guardia --que sale por un `return` anterior-- pulsar "Asignar
    estacionamiento" cambiaba el estado y no aparecia nada; el modal se veia al
    volver atras, sobre la lista, como si hubiera llegado tarde. Ahora es un
    elemento de verdad y lo renderizan todas las ramas.
  */
  const modalEstacionamiento = (
    <AsignarEstacionamientoModal
      visita={parkingItem}
      onClose={() => setParkingItem(null)}
    />
  );

  const permisos = useVisitasPermisos(
    rolActivo,
    ubicaciones.length,
    suscripcionActiva,
    huespedPuedeRegistrar,
  );
  const {
    esAdmin,
    esGuardia,
    esPropietario,
    esInquilinoLider,
    puedeEliminar,
    accesoBloqueado,
    huespedDisponible,
  } = permisos;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <InfoButton
          titulo={HELP.visitas.info.titulo}
          descripcion={HELP.visitas.info.descripcion}
          bullets={HELP.visitas.info.bullets}
          ejemplo={HELP.visitas.info.ejemplo}
        />
      ),
    });
  }, [navigation, esPropietario, modoAuth]);

  if (accesoBloqueado) return <SinAccesoAVisitas />;

  if (visitaListaDetalle) {
    return (
      <>
        <VisitasPersonasView
          item={visitaListaDetalle}
          onBack={() => setVisitaListaDetalle(null)}
          onSelectPerson={(personIndex) => {
            const item = visitaListaDetalle;
            setVisitaListaDetalle(null);
            setDetailPersonIdx(personIndex);
            setDetailItem(item);
          }}
        />
        {modalEstacionamiento}
      </>
    );
  }

  const lugaresDisponibles = Math.max(
    0,
    estacionamientos.total - estacionamientos.ocupados,
  );

  if (currentReservaDetalle) {
    return (
      <>
        <DetalleDeEstancia
          item={currentReservaDetalle}
          visitas={visitas}
          esGuardia={esGuardia}
          esAnfitrion={esPropietario || esInquilinoLider}
          exigeDocumento={exigeDocumento}
          lugaresDisponibles={lugaresDisponibles}
          onBack={() => setReservaDetalle(null)}
          onAsignarEstacionamiento={() => setParkingItem(currentReservaDetalle)}
        />
        {modalEstacionamiento}
      </>
    );
  }

  /*
    La portería lee su lista partida en Hoy, Dentro y Mañana (11/10/2026); los
    demás, seguida como siempre. «Hoy» es el del teléfono: el de la portería
    está en el edificio.
  */
  const filas: FilaDePorteria[] =
    vistaSub !== "lista"
      ? []
      : esGuardia
        ? parametros.listo
          ? agruparParaPorteria(
              filteredItems,
              formatDateInput(new Date()),
              parametros.numero("porteria_dias_a_la_vista"),
            )
          : // Sin el parámetro no se sabe cuántos días mirar: la lista espera.
            []
        : filteredItems.map((item) => ({ clase: "visita" as const, item }));

  const pintarVisita = (item: VisitaItem) => (
    <TarjetaDelHistorial
      item={item}
      esGuardia={esGuardia}
      esAdmin={esAdmin}
      cupos={(item.uuid ? cuposPorVisita[item.uuid] : undefined)?.join(", ")}
      onEstacionamiento={() => setParkingItem(item)}
      onMenu={() => setMenuItem(item)}
      onAbrirEstancia={() => setReservaDetalle(item)}
      onAbrirPersonas={() => setVisitaListaDetalle(item)}
      onAbrirFicha={(persona) => {
        setDetailPersonIdx(persona);
        setDetailItem(item);
      }}
    />
  );

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={filas}
        keyExtractor={(fila) =>
          fila.clase === "titulo"
            ? `titulo-${fila.grupo}`
            : String(fila.item.id)
        }
        contentContainerClassName="px-4 pb-5"
        contentContainerStyle={{ paddingTop: 12, gap: 10 }}
        ListHeaderComponent={
          <CabeceraDelHistorial
            permisos={permisos}
            historial={historial}
            onElegirTipo={(tipo) => {
              if (tipo === "huesped-temporal" && !huespedDisponible) {
                setShowSuscripcionModal(true);
                return;
              }
              navigation.navigate("VisitasNuevo", { tipoPreseleccionado: tipo });
            }}
            verificaciones={{
              verificaciones: consumoVerificaciones,
              suscripcionActiva,
              comprando: comprandoPaquete,
              onComprarPaquete: (cantidad) =>
                unidadDeLaVivienda?.unidadId &&
                comprarPaquete(unidadDeLaVivienda.unidadId, cantidad),
            }}
          />
        }
        ListFooterComponent={
          vistaSub === "lista" ? (
            <View className="items-center mt-2">
              <Text className="text-xs text-gray-400">
                Mostrando {filteredItems.length} de {items.length} visitas
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          vistaSub === "calendario" ? (
            <CalendarioVisitasComponent
              items={filteredItems}
              onSelect={(item) => setDetailItem(item)}
            />
          ) : (
            <HistorialVacio buscando={Boolean(search)} />
          )
        }
        renderItem={({ item: fila }) =>
          fila.clase === "titulo" ? (
            <TituloDeGrupo titulo={fila.titulo} cuantas={fila.cuantas} />
          ) : (
            pintarVisita(fila.item)
          )
        }
      />

      <FichaDeVisita
        item={currentDetailItem}
        personIndex={detailPersonIdx}
        visitas={visitas}
        esGuardia={esGuardia}
        esAdmin={esAdmin}
        exigeDocumento={exigeDocumento}
        lugaresDisponibles={lugaresDisponibles}
        cuposAsignados={
          (currentDetailItem?.uuid
            ? cuposPorVisita[currentDetailItem.uuid]
            : undefined) ?? []
        }
        onClose={() => {
          setDetailItem(null);
          setDetailPersonIdx(null);
        }}
        onAsignarEstacionamiento={(item) => {
          setDetailItem(null);
          setDetailPersonIdx(null);
          setParkingItem(item);
        }}
      />

      <MenuDeVisita
        item={menuItem}
        puedeEliminar={puedeEliminar}
        esAdmin={esAdmin}
        onClose={() => setMenuItem(null)}
        onEditar={(m) => setDetailItem(m)}
        onEliminar={(m) => setDeleteItem(m)}
        onDenunciar={(m) =>
          navigateToRoute(navigation, "ReclamoNuevo", {
            categoriaPreseleccionada: "Denuncia entre departamentos",
            tituloPreseleccionado: `Denuncia: ${m.nombre || ""}`,
            descripcionPreseleccionada: `Reporte desde visitas contra: ${m.nombre || ""} (CI: ${m.ci || ""})`,
          })
        }
      />

      {/* Delete confirmation */}
      <VisitaDeleteModal
        visible={!!deleteItem}
        item={deleteItem}
        eliminando={eliminandoVisita}
        onConfirm={() => {
          if (!deleteItem) return;
          const esReserva = deleteItem.tipo === "huesped-temporal";
          eliminarVisita(deleteItem.uuid ?? "")
            .then(() =>
              addToast(
                esReserva ? "Reserva eliminada correctamente" : "Visita eliminada correctamente",
                "success",
              ),
            )
            // El motivo ya lo dice el hook al fallar.
            .catch(() => undefined)
            .finally(() => setDeleteItem(null));
        }}
        onCancel={() => setDeleteItem(null)}
      />

      {modalEstacionamiento}

      <SuscribirseARentaCorta
        visible={showSuscripcionModal}
        onClose={() => setShowSuscripcionModal(false)}
        onSuscribirse={() => {
          setShowSuscripcionModal(false);
          renta.setShowPayment(true);
        }}
      />

      <SuscripcionPagoModal
        visible={renta.showPayment}
        onClose={() => renta.setShowPayment(false)}
        precio={renta.precio}
        pagoSimulado={renta.pagoSimulado}
        procesando={renta.paymentLoading}
        onIrAlPago={renta.irAlPago}
        onConfirmarSimulado={() =>
          renta.confirmarPago(null, () => navigation.navigate("HuespedesTemporales"))
        }
      />
    </View>
  );
}
