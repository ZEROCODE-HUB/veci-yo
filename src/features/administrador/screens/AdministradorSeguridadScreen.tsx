import { useUIStore } from "@/stores/ui-store";
import { theme } from "@/config";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import type { Guardia, Turno, TurnoOverride } from "@/shared/types";
import { EnlaceDeInvitacion, SegunLaCarga } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import {
  GuardiaForm,
  GuardiasList,
  SeguridadActionOverlays,
  GuardiaConfirmation,
  SeguridadFilters,
  GuardiaTurnosModal,
} from "../components/seguridad";
import { useAdministradorSeguridad } from "../hooks";
import {
  emptyGuardiaForm,
  guardiaToForm,
  type GuardiaFormValues,
  type SecurityView,
} from "../types";
import { turnoSolapaFranja } from "../helpers/seguridad.helpers";
import { useFranjasDeTurno } from "../hooks/useFranjasDeTurno";

export function AdministradorSeguridadScreen() {
  const {
    guardias,
    porterias,
    invitaciones,
    estado,
    updateGuardia,
    deleteGuardia,
    borrandoGuardia,
    saveTurnos,
    saveOverride,
    deleteOverride,
    invitarGuardia,
    invitando,
    revocarInvitacion,
    revocando,
  } = useAdministradorSeguridad();
  // «Aceptar y guardar» espera a la base antes de volver a la lista (13/11/2026).
  const [confirmando, setConfirmando] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const [view, setView] = useState<SecurityView>("list");
  const [editing, setEditing] = useState<Guardia | null>(null);
  const [draftForm, setDraftForm] = useState<GuardiaFormValues>(() =>
    emptyGuardiaForm(porterias[0]?.nombre || ""),
  );
  const [filterSchedule, setFilterSchedule] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const { franjaDeEtiqueta, nombreDelTurno } = useFranjasDeTurno();
  const [filterDay, setFilterDay] = useState("");
  const [menuGuardia, setMenuGuardia] = useState<Guardia | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guardia | null>(null);
  const [turnsTarget, setTurnsTarget] = useState<Guardia | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [invitado, setInvitado] = useState("");

  const filteredGuardias = useMemo(
    () =>
      guardias.filter((guardia) => {
        const franja = franjaDeEtiqueta(filterSchedule);
        const matchesSchedule =
          !filterSchedule ||
          !franja ||
          guardia.turnos.some((turno) => turnoSolapaFranja(turno, franja));
        const matchesShift =
          !filterShift ||
          guardia.turnos.some(
            (turno) => nombreDelTurno(turno.horaInicio) === filterShift,
          );
        const matchesDay =
          !filterDay || guardia.turnos.some((turno) => turno.dia === filterDay);
        return matchesSchedule && matchesShift && matchesDay;
      }),
    [guardias, filterSchedule, filterShift, filterDay, franjaDeEtiqueta, nombreDelTurno],
  );

  /*
    El horario, a la base.
    `saveTurnos` estaba importado del hook y **nadie lo llamaba**: ni el modal
    de rotacion ni la confirmacion del formulario, que son los dos sitios donde
    se edita. Se guardaban los permisos, la porteria y el documento; el horario
    se quedaba en el estado de la pantalla y desaparecia al cerrar.
  */
  const guardarHorario = (uuid: string, turnos: Turno[]) =>
    saveTurnos(
      uuid,
      turnos
        .filter((turno) => turno.dia && turno.horaInicio)
        .map((turno) => ({
          dia: turno.dia,
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
        })),
    );

  const openCreate = () => {
    setEditing(null);
    setDraftForm(emptyGuardiaForm(porterias[0]?.nombre || ""));
    setView("form");
  };

  const openEdit = (guardia: Guardia) => {
    setEditing(guardia);
    setDraftForm(guardiaToForm(guardia));
    setMenuGuardia(null);
    setView("form");
  };

  const submitForm = (form: GuardiaFormValues) => {
    setDraftForm(form);
    if (editing) {
      setView("confirmation");
      return;
    }
    /*
      Un guardia necesita cuenta para iniciar sesion, asi que el alta es una
      invitacion, no un insert. Hasta el 13/10/2026 esto enseñaba un aviso
      --«invitalo desde Coadministradores»-- y tiraba el formulario: alli solo
      se invita a coadministradores, asi que **no habia forma de dar de alta
      un guardia**.

      Se espera el resultado antes de salir del formulario: si falla, lo
      escrito sigue ahi.
    */
    invitarGuardia({
      nombre: form.nombre,
      correo: form.correo,
      documento: form.cedula,
      porteriaId: porterias.find((p) => p.nombre === form.garita)?.uuid,
      permisoChat: form.permisoChat ?? true,
      permisoLlamadas: form.permisoLlamadas ?? true,
      permisoReservas: form.permisoReservas ?? false,
    })
      .then((resultado) => {
        setView("list");
        if (resultado.correoEnviado) {
          addToast("Invitación enviada por correo", "success");
          return;
        }
        setInvitado(form.nombre);
        setEnlace(resultado.enlace);
      })
      // El motivo ya salió en pantalla (`onError` del hook).
      .catch(() => undefined);
  };

  const confirmEdit = async () => {
    // Solo se actualiza lo que es del ROL en el condominio. El nombre y el
    // documento de la persona viven en su perfil y no se editan desde aqui.
    if (editing?.uuid) {
      setConfirmando(true);
      const datosOk = await updateGuardia(editing.uuid, {
        porteriaId:
          porterias.find((p) => p.nombre === draftForm.garita)?.uuid ?? null,
        documento: draftForm.cedula,
        // La confirmacion los enseñaba --«Chat: Permitido»-- y no se guardaban.
        permisoChat: draftForm.permisoChat ?? true,
        permisoLlamadas: draftForm.permisoLlamadas ?? true,
        permisoReservas: draftForm.permisoReservas ?? false,
      });
      const horarioOk = await guardarHorario(editing.uuid, draftForm.turnos);
      setConfirmando(false);
      // Si algo falló, se queda en la confirmación: el aviso ya dijo por qué.
      if (!datosOk || !horarioOk) return;
    }
    setView("list");
  };

  /** `true` si se guardó: el modal solo pinta el cambio cuando la base lo tiene. */
  const handleUpdateGuardia = async (guardia: Guardia) => {
    if (guardia.uuid) {
      const datosOk = await updateGuardia(guardia.uuid, {
        permisoChat: guardia.permisoChat,
        permisoLlamadas: guardia.permisoLlamadas,
        permisoReservas: guardia.permisoReservas,
        rotacionActiva: guardia.rotacionActiva,
        tipoRotacion: guardia.tipoRotacion,
      });
      const horarioOk = await guardarHorario(guardia.uuid, guardia.turnos);
      if (!datosOk || !horarioOk) return false;
    }
    setTurnsTarget(guardia);
    return true;
  };

  const handleOverride = async (guardia: Guardia, ajuste: TurnoOverride) => {
    if (!guardia.uuid) return false;
    const ok = await saveOverride(
      guardia.uuid,
      ajuste.fecha,
      ajuste.horaInicio,
      ajuste.horaFin,
    );
    if (!ok) return false;
    // Se pinta ya; la lista de verdad llega al refrescar.
    setTurnsTarget({
      ...guardia,
      overrides: [
        ...(guardia.overrides ?? []).filter((o) => o.fecha !== ajuste.fecha),
        ajuste,
      ],
    });
    return true;
  };

  const handleQuitarOverride = async (uuid: string) => {
    if (!(await deleteOverride(uuid))) return false;
    setTurnsTarget((actual) =>
      actual
        ? {
            ...actual,
            overrides: (actual.overrides ?? []).filter((o) => o.uuid !== uuid),
          }
        : actual,
    );
    return true;
  };

  if (view === "form") {
    return (
      <GuardiaForm
        editing={editing}
        initial={draftForm}
        porterias={porterias}
        guardando={invitando}
        onBack={() => setView("list")}
        onSubmit={submitForm}
      />
    );
  }

  if (view === "confirmation" && editing) {
    return (
      <GuardiaConfirmation
        form={draftForm}
        onBack={() => setView("form")}
        onConfirm={() => void confirmEdit()}
        guardando={confirmando}
      />
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader
        title="Seguridad del condominio"
        action={
          <Pressable
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Añadir guardia"
            className="items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: theme.colors.warning,
            }}
          >
            <Ionicons name="add" size={27} color={theme.colors.textInverse} />
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <SeguridadFilters
          filterSchedule={filterSchedule}
          filterShift={filterShift}
          filterDay={filterDay}
          onScheduleChange={setFilterSchedule}
          onShiftChange={setFilterShift}
          onDayChange={setFilterDay}
          onClear={() => {
            setFilterSchedule("");
            setFilterShift("");
            setFilterDay("");
          }}
        />
        <SegunLaCarga estado={estado} texto="los guardias" forma="tarjetas" enLinea>
          <GuardiasList
            guardias={filteredGuardias}
            invitaciones={invitaciones}
            onMenu={setMenuGuardia}
            onRevocar={revocarInvitacion}
            revocando={revocando}
          />
        </SegunLaCarga>
      </ScrollView>

      <SeguridadActionOverlays
        menuGuardia={menuGuardia}
        deleteTarget={deleteTarget}
        onCloseMenu={() => setMenuGuardia(null)}
        onEdit={openEdit}
        onManageShifts={(guardia) => {
          setTurnsTarget(guardia);
          setMenuGuardia(null);
        }}
        onRequestDelete={(guardia) => {
          setDeleteTarget(guardia);
          setMenuGuardia(null);
        }}
        onCloseDelete={() => setDeleteTarget(null)}
        borrando={borrandoGuardia}
        onConfirmDelete={() => {
          if (!deleteTarget) return;
          void deleteGuardia(deleteTarget.uuid ?? "").then(
            (ok) => ok && setDeleteTarget(null),
          );
        }}
      />
      <GuardiaTurnosModal
        guardia={turnsTarget}
        onClose={() => setTurnsTarget(null)}
        onUpdate={handleUpdateGuardia}
        onOverride={handleOverride}
        onQuitarOverride={handleQuitarOverride}
      />
      <EnlaceDeInvitacion
        enlace={enlace}
        nombre={invitado}
        onCerrar={() => setEnlace(null)}
      />
    </View>
  );
}
