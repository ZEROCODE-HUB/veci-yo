import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text } from "react-native";
import { Button, Input, Modal } from "@/shared/components/ui";
import { Select } from "@/shared/components";
import {
  formatDateInput,
  formatDateIso,
  formatMoney,
  formatMonthYear,
  parseFechaIso,
} from "@/shared/utils";
import { montoDesdeTexto } from "@/shared/utils/monto";
import { useCuotas } from "../hooks/useCuotas";
import { CargaMasivaDePagos } from "./CargaMasivaDePagos";
import { PagoDeUnidadFila } from "./PagoDeUnidadFila";

interface UnidadPago {
  id: number;
  /** El identificador real; `id` es el numerico de presentacion. */
  uuid?: string;
  codigo: string;
}

interface DirectorioAdminPagosProps {
  /**
   * El nombre del propietario de cada vivienda, tal como lo trae la base.
   *
   * Antes se leia `unidad.propietarioAsignado`, que solo se rellena en memoria
   * al asignar un propietario en esa misma sesion: la lista de cuotas decia
   * «Sin propietario» en todas las viviendas, y es justo la pantalla donde
   * hace falta saber a quien se le cobra.
   */
  propietarioDe: (unidad: UnidadPago) => string;
  unidades: UnidadPago[];
}

/** `2026-10-01` → «octubre 2026». */
const nombreDelMes = (periodo: string) => {
  const fecha = parseFechaIso(periodo);
  return fecha ? formatMonthYear(fecha) : periodo;
};

export function DirectorioAdminPagos({
  unidades,
  propietarioDe,
}: DirectorioAdminPagosProps) {
  /*
    `pagosMantenimiento` salia de un store de Zustand y se perdia al
    recargar. Ahora viene de `pago_cuota`, y hace falta decir **de que
    mes**: marcar pagado sin periodo no significa nada, y el Cuadro de
    Honor cuenta por periodo.
  */
  const cuotas = useCuotas();
  const [cargaAbierta, setCargaAbierta] = useState(false);
  const [editando, setEditando] = useState<UnidadPago | null>(null);
  const [importe, setImporte] = useState("");
  const [errorImporte, setErrorImporte] = useState("");

  const totalPagados = unidades.filter(
    (unidad) => unidad.uuid && cuotas.estaPagada(unidad.uuid),
  ).length;

  const moneda = cuotas.periodo?.moneda ?? cuotas.configuracion?.moneda ?? "";
  // El general es el del mes elegido; sin mes, el que está configurado.
  const general = cuotas.periodo?.monto ?? cuotas.configuracion?.monto ?? null;

  /*
    El mes que corre, con el reloj del dispositivo: es solo para ofrecer el
    botón. El mes que se crea lo decide la base, con el reloj del edificio.
  */
  const mesActual = `${formatDateInput(new Date()).slice(0, 7)}-01`;
  const faltaElMesActual =
    cuotas.periodosLeidos &&
    !cuotas.periodos.some((p) => p.periodo === mesActual);
  const sinImporte = cuotas.configuracion?.monto == null;

  const abrirImporte = (unidad: UnidadPago) => {
    const propio = unidad.uuid ? cuotas.importePropio(unidad.uuid) : null;
    setImporte(propio === null ? "" : String(propio));
    setErrorImporte("");
    setEditando(unidad);
  };

  const guardarImporte = async (monto: number | null) => {
    if (!editando?.uuid) return;
    try {
      await cuotas.guardarImporte(editando.uuid, monto);
      setEditando(null);
    } catch {
      // El motivo ya salió en el aviso; la ventana se queda para corregir.
    }
  };

  const confirmarImporte = () => {
    const monto = montoDesdeTexto(importe);
    if (monto === null || Number.isNaN(monto) || monto <= 0) {
      setErrorImporte("Escribe un importe mayor que cero, solo con números.");
      return;
    }
    void guardarImporte(monto);
  };

  return (
    <View style={{ gap: 12 }}>
      {/*
        El periodo no existia en la pantalla: se marcaba "pagado" a secas.
        Un pago es de un mes, y el Cuadro de Honor cuenta por mes.
      */}
      <View
        className="rounded-[20px] bg-white p-3"
        style={{ gap: 10, boxShadow: theme.shadows.card }}
      >
        {cuotas.periodos.length ? (
          <Select
            label="Mes que se está registrando"
            value={cuotas.cuotaId}
            options={cuotas.periodos.map((p) => ({
              value: p.id,
              label: nombreDelMes(p.periodo),
            }))}
            placeholder="Elige el periodo"
            onChange={(value) => cuotas.setCuotaId(String(value))}
          />
        ) : cuotas.periodosLeidos ? (
          <Text className="text-sm leading-5 text-gray-700">
            Todavía no hay ningún mes de cuota. Crea el primero para empezar a
            registrar pagos.
          </Text>
        ) : null}

        {cuotas.periodo ? (
          <Text className="text-xs leading-5 text-gray-500">
            Cuota del mes: {formatMoney(cuotas.periodo.monto, cuotas.periodo.moneda)}
            {cuotas.periodo.venceEn
              ? ` · vence el ${formatDateIso(cuotas.periodo.venceEn)}`
              : ""}
          </Text>
        ) : null}

        {/*
          No había forma de crear un mes desde la aplicación: la lista solo
          enseñaba los que alguien hubiera escrito en la base (13/10/2026).
        */}
        {faltaElMesActual ? (
          sinImporte ? (
            <Text className="text-xs leading-5 text-amber-800">
              Para crear el mes, primero di cuánto se cobra: Inicio › Permisos ›
              Cuota de administración.
            </Text>
          ) : (
            <Button
              variant="secondary"
              fullWidth
              loading={cuotas.creandoMes}
              onPress={cuotas.crearMes}
            >
              {`Crear el mes de ${nombreDelMes(mesActual)}`}
            </Button>
          )
        ) : null}
      </View>

      <View className="rounded-xl bg-gray-100 p-3">
        <Text className="text-sm text-gray-700">
          Pagados: {totalPagados} / {unidades.length} · No pagados:{" "}
          {unidades.length - totalPagados}
        </Text>
      </View>

      <View
        className="rounded-[20px] bg-white p-3"
        style={{ boxShadow: theme.shadows.card }}
      >
        <Text className="mb-2 text-sm font-semibold text-gray-900">
          Carga masiva de pagos
        </Text>
        <Text className="mb-3 text-xs leading-5 text-gray-500">
          Sube un Excel o CSV con la lista de departamentos que pagaron. El
          sistema marcará automáticamente cada departamento como pagado.
        </Text>
        <Button
          fullWidth
          disabled={!cuotas.cuotaId}
          loading={cuotas.cargandoArchivo}
          onPress={() => setCargaAbierta(true)}
        >
          Cargar y marcar pagados
        </Button>
      </View>

      {unidades.map((unidad) => {
        const uuid = unidad.uuid ?? "";
        const propio = uuid ? cuotas.importePropio(uuid) : null;
        const paga = propio ?? general;
        const comite = cuotas.comiteDe(uuid);

        return (
          <PagoDeUnidadFila
            key={unidad.id}
            codigo={unidad.codigo}
            propietario={propietarioDe(unidad)}
            importe={paga !== null && moneda ? formatMoney(paga, moneda) : ""}
            importePropio={propio !== null}
            pagada={Boolean(uuid && cuotas.estaPagada(uuid))}
            sinMes={!cuotas.cuotaId || !uuid}
            guardando={cuotas.marcando === uuid}
            enComite={comite.enComite}
            propietarioConCuenta={comite.tieneCuenta}
            cambiandoComite={cuotas.cambiandoComite === uuid}
            onPagada={(pagada) => uuid && cuotas.marcar(uuid, pagada)}
            onCambiarImporte={() => abrirImporte(unidad)}
            onComite={(enComite) => uuid && cuotas.cambiarComite(uuid, enComite)}
          />
        );
      })}

      <CargaMasivaDePagos
        visible={cargaAbierta}
        onClose={() => setCargaAbierta(false)}
        codigosConocidos={unidades.map((unidad) => unidad.codigo)}
        onConfirmar={cuotas.marcarMasivo}
      />

      <Modal
        visible={Boolean(editando)}
        onClose={() => setEditando(null)}
        title={`Cuota de ${editando?.codigo ?? ""}`}
      >
        <View style={{ gap: 14 }}>
          <Text className="text-xs leading-5 text-gray-500">
            Si esta vivienda paga distinto del resto, escribe aquí su importe
            mensual. Vale para los pagos que se marquen a partir de ahora.
          </Text>
          <Input
            label={moneda ? `Importe mensual (${moneda})` : "Importe mensual"}
            value={importe}
            onChangeText={(texto) => {
              setImporte(texto);
              setErrorImporte("");
            }}
            placeholder="Ej.: 500.000"
            type="numeric"
            showEditIcon={false}
            error={errorImporte || undefined}
          />
          <Button
            fullWidth
            loading={cuotas.guardandoImporte}
            onPress={confirmarImporte}
          >
            Guardar importe
          </Button>
          {editando?.uuid && cuotas.importePropio(editando.uuid) !== null ? (
            <Button
              variant="secondary"
              fullWidth
              disabled={cuotas.guardandoImporte}
              onPress={() => void guardarImporte(null)}
            >
              Volver al importe general
            </Button>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
