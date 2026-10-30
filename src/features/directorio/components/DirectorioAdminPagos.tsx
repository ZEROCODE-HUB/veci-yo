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
  // Los importes variables del mes (Para Claude 187): uno por casilla, con «+».
  const [variables, setVariables] = useState<string[]>([]);
  // El pago que se está registrando (Para Claude 188).
  const [pagando, setPagando] = useState<UnidadPago | null>(null);
  const [pagoTexto, setPagoTexto] = useState("");
  const [errorPago, setErrorPago] = useState("");

  const estados = cuotas.estados;
  const totalPagados = estados.filter((e) => e.estado === "Pagado").length;
  const totalParciales = estados.filter((e) => e.estado === "Pago parcial").length;

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
    const estado = unidad.uuid ? cuotas.estadoDe(unidad.uuid) : null;
    setImporte(propio === null ? "" : String(propio));
    setVariables((estado?.variables ?? []).map(String));
    setErrorImporte("");
    setEditando(unidad);
  };

  const guardarImporte = async (monto: number | null, deEsteMes: number[]) => {
    if (!editando?.uuid) return;
    try {
      await cuotas.guardarImporteDelMes(editando.uuid, monto, deEsteMes);
      setEditando(null);
    } catch {
      // El motivo ya salió en el aviso; la ventana se queda para corregir.
    }
  };

  const confirmarImporte = () => {
    const monto = importe.trim() ? montoDesdeTexto(importe) : null;
    if (importe.trim() && (monto === null || Number.isNaN(monto) || monto <= 0)) {
      setErrorImporte("Escribe un importe mayor que cero, solo con números.");
      return;
    }
    const deEsteMes = variables.filter((v) => v.trim()).map((v) => montoDesdeTexto(v));
    if (deEsteMes.some((v) => v === null || Number.isNaN(v) || v <= 0)) {
      setErrorImporte("Cada importe variable tiene que ser un número mayor que cero.");
      return;
    }
    void guardarImporte(monto, deEsteMes as number[]);
  };

  const estadoPagando = pagando?.uuid ? cuotas.estadoDe(pagando.uuid) : null;
  const confirmarPago = async () => {
    if (!pagando?.uuid || !estadoPagando) return;
    const monto = montoDesdeTexto(pagoTexto);
    if (monto === null || Number.isNaN(monto) || monto <= 0) {
      setErrorPago("Escribe un importe mayor que cero, solo con números.");
      return;
    }
    // Nunca por encima de lo que falta; la base lo comprueba igual.
    if (monto > estadoPagando.saldo) {
      setErrorPago(`No puede pasar de lo que falta: ${formatMoney(estadoPagando.saldo, moneda)}.`);
      return;
    }
    try {
      await cuotas.abonar(pagando.uuid, monto);
      setPagando(null);
    } catch {
      // El motivo ya salió en el aviso.
    }
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
          {`Pagados: ${totalPagados} / ${unidades.length} · Pago parcial: ${totalParciales} · No pagados: ${Math.max(unidades.length - totalPagados - totalParciales, 0)}`}
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
          Descarga la plantilla del mes, escribe lo que pagó cada departamento y
          súbela. Cada pago se registra y su estado se calcula solo.
        </Text>
        <Button
          fullWidth
          disabled={!cuotas.cuotaId}
          loading={cuotas.cargandoPlantilla}
          onPress={() => setCargaAbierta(true)}
        >
          Cargar pagos con plantilla
        </Button>
      </View>

      {unidades.map((unidad) => {
        const uuid = unidad.uuid ?? "";
        const propio = uuid ? cuotas.importePropio(uuid) : null;
        const paga = propio ?? general;
        const comite = cuotas.comiteDe(uuid);
        const estado = uuid ? cuotas.estadoDe(uuid) : null;
        const resumen = estado && moneda
          ? `Debe ${formatMoney(estado.total, moneda)}${estado.variables.length ? ` (mensual ${formatMoney(estado.mensual, moneda)} + variables)` : ""} · Pagado ${formatMoney(estado.abonado, moneda)} · Falta ${formatMoney(estado.saldo, moneda)}`
          : paga !== null && moneda
            ? `Paga ${formatMoney(paga, moneda)}`
            : "";

        return (
          <PagoDeUnidadFila
            key={unidad.id}
            codigo={unidad.codigo}
            propietario={propietarioDe(unidad)}
            estado={estado?.estado ?? "No pagado"}
            resumen={resumen}
            importePropio={propio !== null || Boolean(estado?.variables.length)}
            sinMes={!cuotas.cuotaId || !uuid}
            guardando={cuotas.abonando === uuid}
            enComite={comite.enComite}
            propietarioConCuenta={comite.tieneCuenta}
            cambiandoComite={cuotas.cambiandoComite === uuid}
            onRegistrarPago={() => {
              setPagoTexto("");
              setErrorPago("");
              setPagando(unidad);
            }}
            onCambiarImporte={() => abrirImporte(unidad)}
            onComite={(enComite) => uuid && cuotas.cambiarComite(uuid, enComite)}
          />
        );
      })}

      <CargaMasivaDePagos
        visible={cargaAbierta}
        onClose={() => setCargaAbierta(false)}
        plantilla={estados.map((e) => ({
          codigo: e.codigo,
          nombre: e.responsable ?? "",
          mensual: e.mensual,
          variables: e.variables,
          total: e.total,
          yaPagado: e.abonado,
        }))}
        nombreDelMes={cuotas.periodo ? nombreDelMes(cuotas.periodo.periodo) : ""}
        onConfirmar={cuotas.registrarDesdePlantilla}
      />

      {/* Registrar lo que pagó (Para Claude 188, 30/10/2026). */}
      <Modal
        visible={Boolean(pagando)}
        onClose={() => setPagando(null)}
        title={`Pago de ${pagando?.codigo ?? ""}`}
      >
        <View style={{ gap: 14 }}>
          {estadoPagando && moneda ? (
            <Text className="text-sm leading-5 text-gray-700">
              {`Total del mes: ${formatMoney(estadoPagando.total, moneda)}\nPagado hasta ahora: ${formatMoney(estadoPagando.abonado, moneda)}\nFalta por pagar: ${formatMoney(estadoPagando.saldo, moneda)}`}
            </Text>
          ) : null}
          <Input
            label={moneda ? `Importe que paga (${moneda}) *` : "Importe que paga *"}
            value={pagoTexto}
            onChangeText={(texto) => {
              setPagoTexto(texto);
              setErrorPago("");
            }}
            placeholder="Ej.: 250.000"
            type="numeric"
            showEditIcon={false}
            error={errorPago || undefined}
          />
          <Button fullWidth loading={cuotas.abonando !== null} onPress={() => void confirmarPago()}>
            Registrar pago
          </Button>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editando)}
        onClose={() => setEditando(null)}
        title={`Cuota de ${editando?.codigo ?? ""}`}
      >
        <View style={{ gap: 14 }}>
          <Text className="text-xs leading-5 text-gray-500">
            El importe mensual vale de ahora en adelante (vacío: el general). Los
            importes variables son solo de este mes. Lo que debe pagar es la
            suma de todo.
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
          <Text className="text-sm font-semibold text-gray-900">Importes variables</Text>
          {variables.map((valor, i) => (
            <View key={i} className="flex-row items-end gap-2">
              <View className="flex-1">
                <Input
                  label={`Importe variable ${i + 1}`}
                  value={valor}
                  onChangeText={(texto) => {
                    setVariables((antes) => antes.map((v, j) => (j === i ? texto : v)));
                    setErrorImporte("");
                  }}
                  type="numeric"
                  showEditIcon={false}
                />
              </View>
              <Button
                variant="secondary"
                onPress={() => setVariables((antes) => antes.filter((_, j) => j !== i))}
              >
                Quitar
              </Button>
            </View>
          ))}
          <Button variant="secondary" fullWidth onPress={() => setVariables((antes) => [...antes, ""])}>
            + Agregar importe variable
          </Button>
          {(() => {
            const mensual = importe.trim() ? montoDesdeTexto(importe) : general;
            const suma =
              (mensual && !Number.isNaN(mensual) ? mensual : 0) +
              variables.reduce((t, v) => {
                const n = montoDesdeTexto(v);
                return t + (n && !Number.isNaN(n) ? n : 0);
              }, 0);
            return moneda ? (
              <Text className="text-sm font-semibold text-gray-900">
                {`Total a pagar este mes: ${formatMoney(suma, moneda)}`}
              </Text>
            ) : null;
          })()}
          <Button
            fullWidth
            loading={cuotas.guardandoImporteDelMes}
            onPress={confirmarImporte}
          >
            Guardar importe
          </Button>
        </View>
      </Modal>
    </View>
  );
}
